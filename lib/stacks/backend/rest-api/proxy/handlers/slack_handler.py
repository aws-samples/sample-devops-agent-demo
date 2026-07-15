"""
Slack integration handler — invites users to a Slack channel.
Uses the Slack Bot Token from AWS Secrets Manager to:
1. Look up a Slack user by email (from Midway/Cognito JWT)
2. Invite them to the #devops-agent channel
"""
import json
import logging
import os
import urllib.request
import urllib.error
import urllib.parse
import boto3

logger = logging.getLogger()

SLACK_CHANNEL_ID = 'C0AMVH85MB3'
SLACK_WORKSPACE_NAME = 'Amazon Sandbox'
SLACK_WORKSPACE_ADMIN_URL = 'https://amzn-sandbox.enterprise.slack.com/signin/find-workspaces'
SLACK_CHANNEL_NAME = '#devops-agent'
SECRET_NAME = 'devops-agent/slack-bot-token'
AWS_REGION = os.environ.get('AWS_REGION', 'us-east-1')

_cached_token = None


def _get_slack_token() -> str:
    global _cached_token
    if _cached_token:
        return _cached_token
    client = boto3.client('secretsmanager', region_name=AWS_REGION)
    resp = client.get_secret_value(SecretId=SECRET_NAME)
    _cached_token = resp['SecretString']
    return _cached_token


def _slack_api_get(method: str, params: dict) -> dict:
    """Call Slack API with GET-style query parameters (form-encoded)."""
    token = _get_slack_token()
    encoded = urllib.parse.urlencode(params)
    req = urllib.request.Request(
        f'https://slack.com/api/{method}?{encoded}',
        headers={
            'Authorization': f'Bearer {token}',
        },
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))


def _slack_api_post(method: str, payload: dict) -> dict:
    """Call Slack API with JSON POST body."""
    token = _get_slack_token()
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        f'https://slack.com/api/{method}',
        data=data,
        headers={
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json',
        },
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))


def _extract_email(event: dict) -> str:
    """Extract email from Cognito/Midway JWT claims."""
    claims = (
        event.get('requestContext', {})
        .get('authorizer', {})
        .get('claims', {})
    )
    email = claims.get('email', '')
    if not email:
        raise ValueError('Could not extract email from auth token')
    return email


def _check_slack_status(email: str) -> dict:
    """Check workspace membership and channel membership for a user (no side effects)."""
    # Step 1: Look up Slack user by email
    lookup = _slack_api_get('users.lookupByEmail', {'email': email})
    if not lookup.get('ok'):
        error = lookup.get('error', 'unknown')
        if error == 'users_not_found':
            return {'status': 'not_in_workspace', 'inWorkspace': False, 'inChannel': False}
        return {'status': 'error', 'inWorkspace': False, 'inChannel': False, 'error': error}

    slack_user_id = lookup['user']['id']

    # Step 2: Check if user is in the channel
    try:
        members_resp = _slack_api_get('conversations.members', {'channel': SLACK_CHANNEL_ID, 'limit': '1000'})
        if members_resp.get('ok'):
            in_channel = slack_user_id in members_resp.get('members', [])
            return {'status': 'in_channel' if in_channel else 'in_workspace', 'inWorkspace': True, 'inChannel': in_channel}
        return {'status': 'in_workspace', 'inWorkspace': True, 'inChannel': False}
    except Exception:
        return {'status': 'in_workspace', 'inWorkspace': True, 'inChannel': False}


def handle_slack_route(route_info, event: dict) -> dict:
    """Route slack requests — supports GET /slack/check-status and POST /slack/join-channel."""
    if route_info.http_method == 'GET':
        try:
            email = _extract_email(event)
            result = _check_slack_status(email)
            return {'statusCode': 200, 'body': result}
        except ValueError as e:
            return {'statusCode': 401, 'body': {'error': str(e)}}
        except Exception as e:
            logger.error(f'Slack status check error: {e}', exc_info=True)
            return {'statusCode': 500, 'body': {'error': f'Internal error: {str(e)}'}}

    if route_info.http_method != 'POST':
        return {'statusCode': 405, 'body': {'error': 'Method not allowed'}}

    try:
        email = _extract_email(event)
        logger.info(f'Slack join-channel request for email: {email}')

        # Step 1: Look up Slack user by email
        lookup = _slack_api_get('users.lookupByEmail', {'email': email})
        if not lookup.get('ok'):
            error = lookup.get('error', 'unknown')
            if error == 'users_not_found':
                return {
                    'statusCode': 404,
                    'body': {
                        'error': f'No Slack user found for {email}. Please join the {SLACK_WORKSPACE_NAME} workspace first at {SLACK_WORKSPACE_ADMIN_URL}, then try again.',
                        'needsWorkspace': True,
                    }
                }
            return {'statusCode': 400, 'body': {'error': f'Slack lookup failed: {error}'}}

        slack_user_id = lookup['user']['id']
        display_name = lookup['user'].get('real_name', email)

        # Step 2: Ensure bot is in the channel, then invite user
        # First, try to join the bot to the channel
        _slack_api_post('conversations.join', {'channel': SLACK_CHANNEL_ID})

        invite = _slack_api_post('conversations.invite', {
            'channel': SLACK_CHANNEL_ID,
            'users': slack_user_id,
        })

        if not invite.get('ok'):
            error = invite.get('error', 'unknown')
            if error == 'already_in_channel':
                return {
                    'statusCode': 200,
                    'body': {
                        'message': f'{display_name} is already in the channel',
                        'alreadyMember': True,
                    }
                }
            if error == 'org_user_not_in_team':
                return {
                    'statusCode': 400,
                    'body': {
                        'error': f'You need to join the {SLACK_WORKSPACE_NAME} Slack workspace first. Visit {SLACK_WORKSPACE_ADMIN_URL}, then try again.',
                        'needsWorkspace': True,
                    }
                }
            return {'statusCode': 400, 'body': {'error': f'Slack invite failed: {error}'}}

        return {
            'statusCode': 200,
            'body': {
                'message': f'{display_name} has been added to #devops-agent',
                'alreadyMember': False,
            }
        }

    except ValueError as e:
        return {'statusCode': 401, 'body': {'error': str(e)}}
    except Exception as e:
        logger.error(f'Slack handler error: {e}', exc_info=True)
        return {'statusCode': 500, 'body': {'error': f'Internal error: {str(e)}'}}
