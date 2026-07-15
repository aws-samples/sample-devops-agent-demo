"""
Admin handler for failure simulator operations.

Provides endpoints for enabling/disabling failure scenarios,
retrieving system status, failure events, and metrics.
"""

import json
import logging
import os
import hashlib
import hmac
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from uuid import uuid4
from urllib.parse import urlparse
from urllib.request import Request, urlopen
import boto3
from botocore.exceptions import ClientError
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest
from botocore.credentials import Credentials

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# AWS clients
dynamodb = boto3.resource('dynamodb')
sns_client = boto3.client('sns')
sqs_client = boto3.client('sqs')
s3_client = boto3.client('s3')
lambda_client = boto3.client('lambda')
cloudwatch_logs_client = boto3.client('logs')
cloudwatch_client = boto3.client('cloudwatch')
session = boto3.Session()

# Environment variables
CONFIG_TABLE_NAME = os.environ.get('CONFIG_TABLE_NAME', '')
NOTIFICATION_TOPIC_ARN = os.environ.get('NOTIFICATION_TOPIC_ARN', '')
NOTIFICATION_QUEUE_URL = os.environ.get('NOTIFICATION_QUEUE_URL', '')
NOTIFICATION_DLQ_URL = os.environ.get('NOTIFICATION_DLQ_URL', '')
TARGET_LAMBDA_ARN = os.environ.get('TARGET_LAMBDA_ARN', '')
QUEUE_CONSUMER_FUNCTION_NAME = os.environ.get('QUEUE_CONSUMER_FUNCTION_NAME', '')
DATA_BUCKET_NAME = os.environ.get('CRM_IMAGES_BUCKET', '')
FAILURE_ERRORS_LOG_GROUP = os.environ.get('APPLICATION_ERRORS_LOG_GROUP', '/crm-demo/application-errors')
APPSYNC_API_URL = os.environ.get('APPSYNC_API_URL', '')
AWS_REGION = os.environ.get('AWS_REGION', 'us-east-1')
DEVOPS_AGENT_WEBHOOK_URL = os.environ.get('DEVOPS_AGENT_WEBHOOK_URL', '')
DEVOPS_AGENT_WEBHOOK_SECRET_ARN = os.environ.get('DEVOPS_AGENT_WEBHOOK_SECRET_ARN', '')

# Cache for webhook secret fetched from Secrets Manager
_webhook_secret_cache: Optional[str] = None


def _get_webhook_secret() -> str:
    """Fetch the DevOps Agent webhook secret from Secrets Manager (cached)."""
    global _webhook_secret_cache
    if _webhook_secret_cache is not None:
        return _webhook_secret_cache
    if not DEVOPS_AGENT_WEBHOOK_SECRET_ARN:
        return ''
    try:
        sm = boto3.client('secretsmanager')
        response = sm.get_secret_value(SecretId=DEVOPS_AGENT_WEBHOOK_SECRET_ARN)
        _webhook_secret_cache = response.get('SecretString', '')
        return _webhook_secret_cache
    except Exception as e:
        logger.warning(f"Failed to fetch webhook secret from Secrets Manager: {e}")
        return ''


# ============================================================================
# CloudWatch Logs Functions
# ============================================================================

def log_failure_error(
    scenario_type: str,
    error_type: str,
    message: str,
    details: Optional[Dict[str, Any]] = None
) -> None:
    """
    Log a failure event to CloudWatch Logs and publish to AppSync for real-time streaming.
    
    Args:
        scenario_type: Type of failure scenario (e.g., 'lambdaThrottling')
        error_type: Type of error (e.g., 'TooManyRequestsException')
        message: Human-readable error message
        details: Additional context details
    """
    if not FAILURE_ERRORS_LOG_GROUP:
        logger.warning("FAILURE_ERRORS_LOG_GROUP not configured")
        return
    
    try:
        # Create log stream name based on scenario and date
        log_stream_name = f"{scenario_type}-{datetime.utcnow().strftime('%Y-%m-%d')}"
        
        # Create log stream if it doesn't exist
        try:
            cloudwatch_logs_client.create_log_stream(
                logGroupName=FAILURE_ERRORS_LOG_GROUP,
                logStreamName=log_stream_name
            )
        except ClientError as e:
            if e.response['Error']['Code'] != 'ResourceAlreadyExistsException':
                logger.warning(f"Could not create log stream: {e}")
        
        # Build log event
        timestamp = int(datetime.utcnow().timestamp() * 1000)
        log_event = {
            'timestamp': timestamp,
            'scenarioType': scenario_type,
            'errorType': error_type,
            'message': message,
            'details': details or {}
        }
        
        # Write to CloudWatch Logs
        cloudwatch_logs_client.put_log_events(
            logGroupName=FAILURE_ERRORS_LOG_GROUP,
            logStreamName=log_stream_name,
            logEvents=[{
                'timestamp': timestamp,
                'message': json.dumps(log_event)
            }]
        )
        
        logger.info(f"Logged failure event: {scenario_type} - {error_type}")
        
        # Publish to AppSync for real-time streaming
        publish_to_appsync(scenario_type, error_type, message, details)
        
    except Exception as e:
        logger.warning(f"Failed to log failure error: {e}")


def publish_to_appsync(
    scenario_type: str,
    error_type: str,
    error_message: str,
    details: Optional[Dict[str, Any]] = None
) -> None:
    """
    Publish a failure event to AppSync for real-time streaming via GraphQL subscription.
    Uses IAM authentication with SigV4 signing.
    """
    if not APPSYNC_API_URL:
        logger.debug("APPSYNC_API_URL not configured, skipping AppSync publish")
        return
    
    try:
        mutation = '''
            mutation PublishFailureEvent(
                $scenarioType: String!
                $errorType: String!
                $errorMessage: String!
                $service: String
                $correlationId: String
                $rawMessage: String
            ) {
                publishFailureEvent(
                    scenarioType: $scenarioType
                    errorType: $errorType
                    errorMessage: $errorMessage
                    service: $service
                    correlationId: $correlationId
                    rawMessage: $rawMessage
                ) {
                    id
                    timestamp
                    scenarioType
                }
            }
        '''
        
        variables = {
            'scenarioType': scenario_type,
            'errorType': error_type,
            'errorMessage': error_message,
            'service': details.get('service', 'crm-demo') if details else 'crm-demo',
            'correlationId': str(uuid4()),
            'rawMessage': json.dumps(details) if details else None
        }
        
        body = json.dumps({
            'query': mutation,
            'variables': variables
        })
        
        # Parse URL and create request
        url = urlparse(APPSYNC_API_URL)
        
        # Create AWS request for signing
        request = AWSRequest(
            method='POST',
            url=APPSYNC_API_URL,
            data=body,
            headers={
                'Content-Type': 'application/json',
                'host': url.netloc
            }
        )
        
        # Sign with SigV4
        credentials = session.get_credentials()
        SigV4Auth(credentials, 'appsync', AWS_REGION).add_auth(request)
        
        # Make the request
        http_request = Request(
            APPSYNC_API_URL,
            data=body.encode('utf-8'),
            headers=dict(request.headers),
            method='POST'
        )
        
        with urlopen(http_request, timeout=5) as response:
            response_data = response.read().decode('utf-8')
            logger.debug(f"AppSync response: {response_data}")
        
        logger.info(f"Published failure event to AppSync: {scenario_type}")
        
    except Exception as e:
        logger.warning(f"Failed to publish to AppSync: {e}")


def get_failure_events(
    start_time: Optional[int] = None,
    end_time: Optional[int] = None,
    limit: int = 50
) -> Dict[str, Any]:
    """
    Retrieve failure events from CloudWatch Logs.
    
    Args:
        start_time: Unix timestamp in milliseconds (default: 24 hours ago)
        end_time: Unix timestamp in milliseconds (default: now)
        limit: Maximum number of events to return
        
    Returns:
        Dictionary with events list and metadata
    """
    if not FAILURE_ERRORS_LOG_GROUP:
        return {
            'success': False,
            'events': [],
            'count': 0,
            'error': 'FAILURE_ERRORS_LOG_GROUP not configured'
        }
    
    try:
        now = int(datetime.utcnow().timestamp() * 1000)
        filter_start_time = start_time or (now - 24 * 60 * 60 * 1000)  # Default: 24 hours ago
        filter_end_time = end_time or now
        
        response = cloudwatch_logs_client.filter_log_events(
            logGroupName=FAILURE_ERRORS_LOG_GROUP,
            startTime=filter_start_time,
            endTime=filter_end_time,
            limit=200  # Fetch more events, then sort and trim on our side
        )
        
        events = []
        for idx, event in enumerate(response.get('events', [])):
            try:
                parsed = json.loads(event.get('message', '{}'))
                events.append({
                    'id': f"{event.get('logStreamName', 'unknown')}-{event.get('timestamp', 0)}-{idx}",
                    'timestamp': event.get('timestamp') or parsed.get('timestamp'),
                    'ingestionTime': event.get('ingestionTime'),
                    'logStreamName': event.get('logStreamName'),
                    'scenarioType': parsed.get('scenarioType', 'unknown'),
                    'errorType': parsed.get('errorType', 'Unknown'),
                    'errorMessage': parsed.get('message') or parsed.get('errorMessage', 'No message'),
                    'service': parsed.get('details', {}).get('service') or parsed.get('scenarioType'),
                    'correlationId': parsed.get('details', {}).get('correlationId') or parsed.get('correlationId'),
                    'details': parsed.get('details'),
                    'rawMessage': event.get('message')
                })
            except json.JSONDecodeError:
                events.append({
                    'id': f"{event.get('logStreamName', 'unknown')}-{event.get('timestamp', 0)}-{idx}",
                    'timestamp': event.get('timestamp'),
                    'scenarioType': 'unknown',
                    'errorType': 'ParseError',
                    'errorMessage': event.get('message', 'Could not parse event'),
                    'rawMessage': event.get('message')
                })
        
        # Sort by timestamp descending and trim to requested limit
        events.sort(key=lambda x: x.get('timestamp') or 0, reverse=True)
        events = events[:limit]
        
        return {
            'success': True,
            'events': events,
            'count': len(events),
            'logGroupName': FAILURE_ERRORS_LOG_GROUP,
            'timeRange': {
                'startTime': filter_start_time,
                'endTime': filter_end_time
            }
        }
        
    except ClientError as e:
        logger.error(f"Failed to get failure events: {e}")
        return {
            'success': False,
            'events': [],
            'count': 0,
            'error': str(e)
        }


# ============================================================================
# DevOps Agent Webhook Functions
# ============================================================================

def notify_devops_agent(
    scenario_type: str,
    scenario_name: str,
    description: str,
    severity: str,
    service: str,
    additional_data: Optional[Dict[str, Any]] = None
) -> None:
    """
    Send an incident notification to AWS DevOps Agent webhook.
    
    Args:
        scenario_type: Type of failure scenario
        scenario_name: Human-readable scenario name
        description: Detailed description of the incident
        severity: Severity level (severe, high, moderate, light, low)
        service: Affected AWS service name
        additional_data: Additional context for investigation
    """
    if not DEVOPS_AGENT_WEBHOOK_URL or not _get_webhook_secret():
        logger.debug("DevOps Agent webhook not configured, skipping notification")
        return
    
    try:
        priority_map = {
            'severe': 'CRITICAL',
            'critical': 'CRITICAL',
            'high': 'HIGH',
            'moderate': 'MEDIUM',
            'medium': 'MEDIUM',
            'light': 'LOW',
            'low': 'LOW',
            'minimal': 'MINIMAL'
        }
        
        now = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.000Z')
        aws_account_id = os.environ.get('AWS_ACCOUNT_ID', 'unknown')
        extra = additional_data or {}
        
        # Build data payload with key fields at top level for easy access by DevOps Agent
        data_payload = {
            # Scenario info
            'scenarioType': scenario_type,
            'scenarioName': scenario_name,
            'severity': severity,
            'environment': 'dev',
            'application': 'CRM-Demo',
            
            # AWS Context - CRITICAL: These fields answer the agent's questions
            'awsAccountId': aws_account_id,
            'awsRegion': AWS_REGION,
            
            # Timeframe - CRITICAL: When did this start?
            'incidentStartTime': now,
            'detectedAt': now,
            'isOngoing': True,
            
            # Merge all additional_data fields at top level for easy access
            **extra
        }
        
        payload = {
            'eventType': 'incident',
            'incidentId': f"{scenario_type}-{str(uuid4())}",
            'action': 'created',
            'priority': priority_map.get(severity, 'MEDIUM'),
            'title': f"{scenario_name} - [Cloudwatch]",
            'description': description,
            'timestamp': now,
            'service': service,
            'data': data_payload
        }
        
        send_devops_agent_webhook(payload)
        
    except Exception as e:
        logger.warning(f"Failed to notify DevOps Agent: {e}")


def send_devops_agent_webhook(payload: Dict[str, Any]) -> None:
    """
    Send a webhook request to AWS DevOps Agent with HMAC signature.
    """
    try:
        timestamp = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.000Z')
        payload_string = json.dumps(payload)
        
        # Generate HMAC-SHA256 signature: timestamp:payload
        signature_input = f"{timestamp}:{payload_string}"
        signature = hmac.new(
            _get_webhook_secret().encode('utf-8'),
            signature_input.encode('utf-8'),
            hashlib.sha256
        ).digest()
        signature_b64 = __import__('base64').b64encode(signature).decode('utf-8')
        
        logger.info(f"Sending DevOps Agent webhook to: {DEVOPS_AGENT_WEBHOOK_URL}")
        logger.info(f"Incident ID: {payload.get('incidentId')}, Priority: {payload.get('priority')}")
        
        # Log the full payload for debugging
        logger.info(f"=== DEVOPS AGENT WEBHOOK PAYLOAD ===")
        logger.info(f"eventType: {payload.get('eventType')}")
        logger.info(f"title: {payload.get('title')}")
        logger.info(f"description: {payload.get('description')}")
        logger.info(f"service: {payload.get('service')}")
        logger.info(f"priority: {payload.get('priority')}")
        
        data_payload = payload.get('data', {})
        logger.info(f"--- DATA PAYLOAD FIELDS ---")
        logger.info(f"data.awsAccountId: {data_payload.get('awsAccountId')}")
        logger.info(f"data.awsRegion: {data_payload.get('awsRegion')}")
        logger.info(f"data.incidentStartTime: {data_payload.get('incidentStartTime')}")
        logger.info(f"data.topicArn: {data_payload.get('topicArn')}")
        logger.info(f"data.topicName: {data_payload.get('topicName')}")
        logger.info(f"data.scenarioType: {data_payload.get('scenarioType')}")
        logger.info(f"data.scenarioName: {data_payload.get('scenarioName')}")
        logger.info(f"Full data payload keys: {list(data_payload.keys())}")
        logger.info(f"=== END PAYLOAD ===")
        
        # Send webhook request
        request = Request(
            DEVOPS_AGENT_WEBHOOK_URL,
            data=payload_string.encode('utf-8'),
            headers={
                'Content-Type': 'application/json',
                'x-amzn-event-timestamp': timestamp,
                'x-amzn-event-signature': signature_b64
            },
            method='POST'
        )
        
        with urlopen(request, timeout=10) as response:
            response_body = response.read().decode('utf-8')
            if response.status != 200:
                logger.warning(f"DevOps Agent webhook returned status {response.status}: {response_body}")
            else:
                logger.info(f"DevOps Agent webhook sent successfully: {payload.get('incidentId')}")
                logger.debug(f"Response: {response_body}")
                
    except Exception as e:
        logger.warning(f"Failed to send DevOps Agent webhook: {e}")


def get_system_status() -> Dict[str, Any]:
    """Get current status of all failure scenarios, including expiration info."""
    logger.info(f"get_system_status called, CONFIG_TABLE_NAME={CONFIG_TABLE_NAME}")
    
    if not CONFIG_TABLE_NAME:
        logger.warning("CONFIG_TABLE_NAME not configured")
        return {
            'scenarios': {},
            'lastModified': None,
            'modifiedBy': None,
            'message': 'Configuration table not configured'
        }
    
    try:
        # First check and disable any expired scenarios (non-critical, don't fail if this errors)
        try:
            check_and_disable_expired_scenarios()
        except Exception as e:
            logger.warning(f"Failed to check expired scenarios (non-critical): {e}")
        
        table = dynamodb.Table(CONFIG_TABLE_NAME)
        response = table.get_item(
            Key={'id': 'system-config', 'sk': 'config'}
        )
        
        logger.info(f"DynamoDB response: {json.dumps(response, default=str)}")
        
        if 'Item' in response:
            item = response['Item']
            scenarios = item.get('failureScenarios', {})
            
            logger.info(f"Found scenarios: {json.dumps(scenarios, default=str)}")
            
            # Add remaining time for active scenarios
            now = datetime.utcnow()
            for scenario_type, config in scenarios.items():
                if config.get('enabled') and config.get('expiresAt'):
                    try:
                        expires_at = config['expiresAt']
                        expires_at_clean = expires_at.replace('Z', '') if expires_at.endswith('Z') else expires_at
                        expiry_time = datetime.fromisoformat(expires_at_clean)
                        remaining_seconds = max(0, int((expiry_time - now).total_seconds()))
                        config['remainingSeconds'] = remaining_seconds
                        logger.info(f"Scenario {scenario_type}: expiresAt={expires_at}, remainingSeconds={remaining_seconds}")
                    except (ValueError, TypeError) as e:
                        logger.warning(f"Failed to parse expiresAt for {scenario_type}: {e}")
                        config['remainingSeconds'] = 0
            
            return {
                'scenarios': scenarios,
                'lastModified': item.get('lastModified'),
                'modifiedBy': item.get('modifiedBy')
            }
        
        logger.info("No Item found in DynamoDB response")
        return {
            'scenarios': {},
            'lastModified': None,
            'modifiedBy': None
        }
    except ClientError as e:
        logger.error(f"Failed to get system status (ClientError): {e}")
        return {
            'scenarios': {},
            'lastModified': None,
            'error': str(e)
        }
    except Exception as e:
        logger.error(f"Failed to get system status (unexpected error): {e}", exc_info=True)
        return {
            'scenarios': {},
            'lastModified': None,
            'error': str(e)
        }


def save_config(scenario_type: str, enabled: bool, severity: str, 
                original_config: Optional[Dict] = None, user_id: str = 'system',
                expires_at: Optional[str] = None, user_display_name: str = 'system') -> bool:
    """Save failure scenario configuration to DynamoDB.
    
    Args:
        scenario_type: Type of failure scenario
        enabled: Whether the scenario is enabled
        severity: Severity level
        original_config: Original AWS resource config for restoration
        user_id: User who made the change
        expires_at: ISO timestamp when scenario should auto-disable (10 min default when enabling)
        user_display_name: Display name of the user who made the change
    """
    logger.info(f"save_config called: scenario_type={scenario_type}, enabled={enabled}, CONFIG_TABLE_NAME={CONFIG_TABLE_NAME}")
    
    if not CONFIG_TABLE_NAME:
        logger.warning("Configuration table not configured")
        return False
    
    try:
        table = dynamodb.Table(CONFIG_TABLE_NAME)
        
        # Get current config
        response = table.get_item(
            Key={'id': 'system-config', 'sk': 'config'}
        )
        
        current_config = response.get('Item', {
            'id': 'system-config',
            'sk': 'config',
            'failureScenarios': {}
        })
        
        # Update scenario
        if 'failureScenarios' not in current_config:
            current_config['failureScenarios'] = {}
        
        now = datetime.utcnow()
        
        # Calculate expiration time (20 minutes from now) when enabling
        if enabled and not expires_at:
            from datetime import timedelta
            expires_at = (now + timedelta(minutes=20)).isoformat() + 'Z'
        
        logger.info(f"Setting expiresAt={expires_at} for scenario {scenario_type}")
        
        scenario_config = {
            'enabled': enabled,
            'severity': severity,
            'originalConfig': original_config,
            'enabledAt': now.isoformat() + 'Z' if enabled else None,
            'enabledBy': user_display_name if enabled else None,
            'expiresAt': expires_at if enabled else None
        }
        
        current_config['failureScenarios'][scenario_type] = scenario_config
        current_config['lastModified'] = now.isoformat()
        current_config['modifiedBy'] = user_id
        
        logger.info(f"Saving config to DynamoDB: {json.dumps(current_config, default=str)}")
        
        table.put_item(Item=current_config)
        
        logger.info(f"Config saved successfully for {scenario_type}")
        
        # Publish scenario change to AppSync for real-time updates
        publish_scenario_change(scenario_type, 'enabled' if enabled else 'disabled', severity, user_id, expires_at if enabled else None)
        
        return True
    except ClientError as e:
        logger.error(f"Failed to save config: {e}")
        return False


def publish_scenario_change(
    scenario_type: str,
    action: str,
    severity: Optional[str] = None,
    user_id: Optional[str] = None,
    expires_at: Optional[str] = None
) -> None:
    """
    Publish a scenario change to AppSync for real-time streaming.
    This allows all connected clients to see timer updates.
    """
    if not APPSYNC_API_URL:
        logger.debug("APPSYNC_API_URL not configured, skipping scenario change publish")
        return
    
    try:
        mutation = '''
            mutation PublishScenarioChange(
                $scenarioType: String!
                $action: String!
                $severity: String
                $userId: String
            ) {
                publishScenarioChange(
                    scenarioType: $scenarioType
                    action: $action
                    severity: $severity
                    userId: $userId
                ) {
                    id
                    timestamp
                    scenarioType
                    action
                    severity
                    userId
                }
            }
        '''
        
        variables = {
            'scenarioType': scenario_type,
            'action': action,
            'severity': severity,
            'userId': user_id
        }
        
        body = json.dumps({
            'query': mutation,
            'variables': variables
        })
        
        # Parse URL and create request
        url = urlparse(APPSYNC_API_URL)
        
        # Create AWS request for signing
        request = AWSRequest(
            method='POST',
            url=APPSYNC_API_URL,
            data=body,
            headers={
                'Content-Type': 'application/json',
                'host': url.netloc
            }
        )
        
        # Sign with SigV4
        credentials = session.get_credentials()
        SigV4Auth(credentials, 'appsync', AWS_REGION).add_auth(request)
        
        # Make the request
        http_request = Request(
            APPSYNC_API_URL,
            data=body.encode('utf-8'),
            headers=dict(request.headers),
            method='POST'
        )
        
        with urlopen(http_request, timeout=5) as response:
            response_data = response.read().decode('utf-8')
            logger.debug(f"AppSync scenario change response: {response_data}")
        
        logger.info(f"Published scenario change to AppSync: {scenario_type} - {action}")
        
    except Exception as e:
        logger.warning(f"Failed to publish scenario change to AppSync: {e}")


def publish_metrics_update(
    active_scenario: Optional[str],
    sqs_queue_depth: int,
    lambda_error_rate: float,
    rds_cpu_utilization: float,
    system_health: str
) -> None:
    """
    Publish real-time metrics update to AppSync for scenario monitoring cards.
    Called periodically to stream CloudWatch metrics to connected clients.
    """
    if not APPSYNC_API_URL:
        logger.debug("APPSYNC_API_URL not configured, skipping metrics publish")
        return
    
    try:
        mutation = '''
            mutation PublishMetricsUpdate(
                $activeScenario: String
                $sqsQueueDepth: Int!
                $lambdaErrorRate: Float!
                $rdsCpuUtilization: Float!
                $systemHealth: String!
            ) {
                publishMetricsUpdate(
                    activeScenario: $activeScenario
                    sqsQueueDepth: $sqsQueueDepth
                    lambdaErrorRate: $lambdaErrorRate
                    rdsCpuUtilization: $rdsCpuUtilization
                    systemHealth: $systemHealth
                ) {
                    id
                    timestamp
                    activeScenario
                    sqsQueueDepth
                    lambdaErrorRate
                    rdsCpuUtilization
                    systemHealth
                }
            }
        '''
        
        variables = {
            'activeScenario': active_scenario,
            'sqsQueueDepth': sqs_queue_depth,
            'lambdaErrorRate': lambda_error_rate,
            'rdsCpuUtilization': rds_cpu_utilization,
            'systemHealth': system_health
        }
        
        body = json.dumps({
            'query': mutation,
            'variables': variables
        })
        
        url = urlparse(APPSYNC_API_URL)
        request = AWSRequest(
            method='POST',
            url=APPSYNC_API_URL,
            data=body,
            headers={
                'Content-Type': 'application/json',
                'host': url.netloc
            }
        )
        
        credentials = session.get_credentials()
        SigV4Auth(credentials, 'appsync', AWS_REGION).add_auth(request)
        
        http_request = Request(
            APPSYNC_API_URL,
            data=body.encode('utf-8'),
            headers=dict(request.headers),
            method='POST'
        )
        
        with urlopen(http_request, timeout=5) as response:
            response_data = response.read().decode('utf-8')
            logger.debug(f"AppSync metrics update response: {response_data}")
        
        logger.info(f"Published metrics update to AppSync: sqs={sqs_queue_depth}, lambda_err={lambda_error_rate:.1f}%, rds_cpu={rds_cpu_utilization:.1f}%")
        
    except Exception as e:
        logger.warning(f"Failed to publish metrics update to AppSync: {e}")


def check_and_disable_expired_scenarios() -> Dict[str, Any]:
    """
    Check for expired failure scenarios and auto-disable them.
    Called during each request to ensure expired scenarios are cleaned up.
    
    Returns:
        Dictionary of scenarios that were auto-disabled
    """
    disabled_scenarios = {}
    
    try:
        # Read directly from DynamoDB to avoid recursion with get_system_status
        if not CONFIG_TABLE_NAME:
            return disabled_scenarios
            
        table = dynamodb.Table(CONFIG_TABLE_NAME)
        response = table.get_item(
            Key={'id': 'system-config', 'sk': 'config'}
        )
        
        if 'Item' not in response:
            return disabled_scenarios
            
        scenarios = response['Item'].get('failureScenarios', {})
        now = datetime.utcnow()
        
        logger.info(f"Checking expired scenarios. Current UTC time: {now.isoformat()}")
        
        for scenario_type, config in scenarios.items():
            if not config.get('enabled'):
                continue
                
            expires_at = config.get('expiresAt')
            if not expires_at:
                logger.info(f"Scenario {scenario_type} enabled but no expiresAt set")
                continue
            
            # Parse expiration time - handle ISO format with Z suffix
            try:
                # Remove Z suffix and parse as naive datetime (already in UTC)
                expires_at_str = expires_at.replace('Z', '') if expires_at.endswith('Z') else expires_at
                # Also handle +00:00 suffix
                if '+00:00' in expires_at_str:
                    expires_at_str = expires_at_str.replace('+00:00', '')
                
                expiry_time = datetime.fromisoformat(expires_at_str)
                
                logger.info(f"Scenario {scenario_type}: expiresAt={expires_at}, parsed={expiry_time.isoformat()}, now={now.isoformat()}")
                
                # Only disable if truly expired (now is AFTER expiry time)
                if now > expiry_time:
                    logger.info(f"Auto-disabling expired scenario: {scenario_type} (expired at {expiry_time.isoformat()})")
                    
                    # Call the appropriate disable function
                    result = auto_disable_scenario(scenario_type)
                    disabled_scenarios[scenario_type] = result
                else:
                    remaining = (expiry_time - now).total_seconds()
                    logger.info(f"Scenario {scenario_type} still active, {remaining:.0f} seconds remaining")
                    
            except (ValueError, TypeError) as e:
                logger.warning(f"Failed to parse expiration time for {scenario_type}: {e}, value was: {expires_at}")
                
    except Exception as e:
        logger.error(f"Failed to check expired scenarios: {e}")
    
    return disabled_scenarios


def auto_disable_scenario(scenario_type: str) -> Dict[str, Any]:
    """
    Auto-disable a specific scenario when it expires.
    """
    disable_functions = {
        'sqsBacklogSpike': disable_sqs_backlog_spike,
        'lambdaFailedDeployment': disable_lambda_failed_deployment,
        'rdsIndexDrop': disable_rds_index_drop
    }
    
    disable_func = disable_functions.get(scenario_type)
    if disable_func:
        try:
            result = disable_func('system-auto-expire')
            result['autoDisabled'] = True
            result['reason'] = 'Timer expired (20 minute limit)'
            return result
        except Exception as e:
            logger.error(f"Failed to auto-disable scenario {scenario_type}: {e}", exc_info=True)
            # Still mark as disabled in config even if cleanup failed
            try:
                save_config(scenario_type, False, 'moderate', None, 'system-auto-expire')
            except Exception:
                pass
            return {
                'success': False,
                'autoDisabled': True,
                'reason': 'Timer expired (20 minute limit)',
                'error': str(e),
                'message': f'Failed to fully disable {scenario_type}: {e}'
            }
    
    return {'success': False, 'message': f'Unknown scenario type: {scenario_type}'}


def _get_scenario_original_config(scenario_type: str) -> Optional[Dict[str, Any]]:
    """
    Get the original config for a scenario directly from DynamoDB.
    This avoids recursion when called from disable functions.
    
    Args:
        scenario_type: Type of failure scenario
        
    Returns:
        Original config dictionary or None
    """
    if not CONFIG_TABLE_NAME:
        return None
    
    try:
        table = dynamodb.Table(CONFIG_TABLE_NAME)
        response = table.get_item(
            Key={'id': 'system-config', 'sk': 'config'}
        )
        
        if 'Item' in response:
            scenarios = response['Item'].get('failureScenarios', {})
            scenario_config = scenarios.get(scenario_type, {})
            return scenario_config.get('originalConfig')
        
        return None
    except ClientError as e:
        logger.warning(f"Failed to get original config for {scenario_type}: {e}")
        return None


def _start_sqs_background_drip() -> bool:
    """Kick off the background SQS message drip via async Lambda self-invocation."""
    try:
        function_name = os.environ.get('AWS_LAMBDA_FUNCTION_NAME', '')
        if not function_name:
            logger.warning("Cannot start SQS background drip: function name not available")
            return False
        lambda_client.invoke(
            FunctionName=function_name,
            InvocationType='Event',
            Payload=json.dumps({
                '_sqsBackgroundDrip': True,
                '_iteration': 0
            })
        )
        logger.info("Started SQS background drip loop")
        return True
    except Exception as e:
        logger.error(f"Failed to start SQS background drip: {e}")
        return False


# SQS Message Backlog Spike - Floods SQS queue with messages to create real backlog
def enable_sqs_backlog_spike(severity: str, user_id: str, user_display_name: str = 'system') -> Dict[str, Any]:
    """
    Enable SQS backlog spike scenario.
    The consumer Lambda's SQS permissions are already denied at infrastructure level (CDK deploy).
    Enabling this scenario floods the queue with messages and starts a background drip.
    Messages accumulate because the consumer can't process them.
    """
    if not NOTIFICATION_QUEUE_URL:
        return {'success': False, 'message': 'SQS queue not configured'}
    
    try:
        # Save config state FIRST so UI updates immediately
        save_config('sqsBacklogSpike', True, severity, None, user_id, user_display_name=user_display_name)
        
        # Determine message count based on severity
        message_counts = {
            'severe': 500,
            'high': 300,
            'moderate': 200,
            'light': 100,
            'low': 50
        }
        message_count = message_counts.get(severity, 150)
        
        # Send messages in batches of 10 (SQS limit)
        sent_count = 0
        errors = []
        batch_size = 10
        
        for batch_start in range(0, message_count, batch_size):
            batch_end = min(batch_start + batch_size, message_count)
            entries = []
            
            for i in range(batch_start, batch_end):
                entries.append({
                    'Id': str(i),
                    'MessageBody': json.dumps({
                        'type': 'opportunity_stage_change',
                        'opportunityId': f'opp-{i:04d}',
                        'timestamp': datetime.utcnow().isoformat() + 'Z',
                        'fromStage': 'Qualified',
                        'toStage': 'Proof of Concept',
                        'ownerId': f'tm-{(i % 5) + 1:03d}',
                    })
                })
            
            try:
                response = sqs_client.send_message_batch(
                    QueueUrl=NOTIFICATION_QUEUE_URL,
                    Entries=entries
                )
                sent_count += len(response.get('Successful', []))
                if response.get('Failed'):
                    errors.extend(response['Failed'])
            except ClientError as e:
                errors.append({'error': str(e), 'batch': batch_start})
                logger.error(f"Failed to send batch starting at {batch_start}: {e}")
        
        # Update config with message count after sending
        save_config('sqsBacklogSpike', True, severity, {
            'messageCount': sent_count,
        }, user_id, user_display_name=user_display_name)
        
        # Get queue name from URL
        queue_name = NOTIFICATION_QUEUE_URL.split('/')[-1]
        aws_account_id = os.environ.get('AWS_ACCOUNT_ID', 'unknown')
        now = datetime.utcnow()
        
        # Push bad commit to GitHub (non-fatal)
        github_result = {'success': False, 'skipped': True}
        try:
            from handlers.github_handler import push_bad_sqs_commit
            github_result = push_bad_sqs_commit()
            logger.info(f"GitHub SQS push result: {github_result}")
        except Exception as e:
            logger.warning(f"GitHub SQS push failed (non-fatal): {e}")
            github_result = {'success': False, 'error': str(e)}
        
        # Log the backlog spike event
        log_failure_error(
            'sqsBacklogSpike',
            'BacklogCreated',
            f"SQS queue flooded with {sent_count} messages. Consumer unable to process — messages accumulating.",
            {
                'service': 'Amazon SQS',
                'queueUrl': NOTIFICATION_QUEUE_URL,
                'queueName': queue_name,
                'messagesSent': sent_count,
                'errors': len(errors),
                'githubCommit': github_result.get('commitSha', 'N/A'),
            }
        )
        
        # Notify DevOps Agent with comprehensive incident data
        consumer_function_name = QUEUE_CONSUMER_FUNCTION_NAME or 'unknown'
        notify_devops_agent(
            'sqsBacklogSpike',
            f'SQS Message Backlog Spike - {queue_name} in {AWS_REGION} ({aws_account_id})',
            (
                f'SQS queue {queue_name} has accumulated a significant number of messages causing backlog. '
                f'The queue consumer Lambda ({consumer_function_name}) appears to be failing to process messages. '
                f'Messages are not being consumed and the backlog is growing. '
                f'ApproximateAgeOfOldestMessage is increasing.'
            ),
            severity,
            'Amazon SQS',
            {
                # SQS Queue Details
                'queueUrl': NOTIFICATION_QUEUE_URL,
                'queueName': queue_name,
                'queueArn': f'arn:aws:sqs:{AWS_REGION}:{aws_account_id}:{queue_name}',
                
                # Consumer Lambda Details
                'consumerFunctionName': consumer_function_name,
                'consumerFunctionArn': f'arn:aws:lambda:{AWS_REGION}:{aws_account_id}:function:{consumer_function_name}',
                
                # AWS Environment
                'awsAccountId': aws_account_id,
                'awsRegion': AWS_REGION,
                
                # Time Window
                'incidentStartTime': now.strftime('%Y-%m-%dT%H:%M:%S.000Z'),
                'isOngoing': True,
                
                # CloudWatch Alarms
                'cloudWatchAlarms': [
                    f'SQS-{queue_name}-ApproximateNumberOfMessagesVisible',
                    f'SQS-{queue_name}-ApproximateAgeOfOldestMessage',
                    f'SQS-{queue_name}-NumberOfMessagesReceived'
                ],
                
                # Symptoms
                'expectedSymptoms': [
                    'High ApproximateNumberOfMessagesVisible metric',
                    'Increasing ApproximateAgeOfOldestMessage',
                    'Consumer Lambda errors in CloudWatch Logs',
                    'Messages returning to queue after failed processing attempts',
                    'Dead-letter queue receiving messages after max retries',
                ],
                
                # Impact Assessment
                'impactedFeatures': ['Message processing', 'Event notifications', 'Async operations'],
                'estimatedUsersAffected': 'All users waiting for async operations',
                'businessImpact': 'Delayed message processing and potential timeouts'
            }
        )
        
        return {
            'success': True,
            'message': f"SQS queue flooded with {sent_count} messages. Background drip started.",
            'messagesSent': sent_count,
            'errors': len(errors),
            'githubCommit': github_result,
            'backgroundDripStarted': _start_sqs_background_drip(),
        }
        
    except ClientError as e:
        logger.error(f"Failed to enable SQS backlog spike: {e}")
        return {'success': False, 'message': str(e)}


def disable_sqs_backlog_spike(user_id: str) -> Dict[str, Any]:
    """
    Disable SQS backlog spike — PURGES THE QUEUE to clear the backlog.
    The consumer deny policy stays in place (it's baked into the infrastructure).
    """
    if not NOTIFICATION_QUEUE_URL:
        return {'success': False, 'message': 'SQS queue not configured'}
    
    try:
        # Purge the main queue and DLQ to clear all messages
        sqs_client.purge_queue(QueueUrl=NOTIFICATION_QUEUE_URL)
        if NOTIFICATION_DLQ_URL:
            try:
                sqs_client.purge_queue(QueueUrl=NOTIFICATION_DLQ_URL)
                logger.info("DLQ purged successfully")
            except ClientError as dlq_err:
                if dlq_err.response['Error']['Code'] == 'AWS.SimpleQueueService.PurgeQueueInProgress':
                    logger.info("DLQ purge already in progress")
                else:
                    logger.warning(f"Failed to purge DLQ: {dlq_err}")
        
        # Save config state
        save_config('sqsBacklogSpike', False, 'moderate', None, user_id)
        
        # Push good commit to GitHub (non-fatal)
        github_result = {'success': False, 'skipped': True}
        try:
            from handlers.github_handler import push_good_sqs_commit
            github_result = push_good_sqs_commit()
            logger.info(f"GitHub SQS fix push result: {github_result}")
        except Exception as e:
            logger.warning(f"GitHub SQS fix push failed (non-fatal): {e}")
            github_result = {'success': False, 'error': str(e)}
        
        queue_name = NOTIFICATION_QUEUE_URL.split('/')[-1]
        
        log_failure_error(
            'sqsBacklogSpike',
            'BacklogCleared',
            f"SQS queue {queue_name} purged — backlog cleared",
            {
                'service': 'Amazon SQS',
                'queueUrl': NOTIFICATION_QUEUE_URL,
                'queueName': queue_name,
                'githubCommit': github_result.get('commitSha', 'N/A'),
            }
        )
        
        return {
            'success': True,
            'message': f"SQS queue purged. Backlog cleared.",
            'githubCommit': github_result,
        }
        
    except ClientError as e:
        # PurgeQueueInProgress means a purge is already happening
        if e.response['Error']['Code'] == 'AWS.SimpleQueueService.PurgeQueueInProgress':
            save_config('sqsBacklogSpike', False, 'moderate', None, user_id)
            return {
                'success': True,
                'message': 'Queue purge already in progress. Backlog being cleared.'
            }
        logger.error(f"Failed to disable SQS backlog spike: {e}")
        return {'success': False, 'message': str(e)}


# RDS Index Drop - Actually drops database indexes for authentic performance degradation
# Index definitions that will be dropped/recreated
RDS_INDEXES = [
    {'name': 'idx_opportunities_owner_id', 'table': 'opportunities', 'column': 'owner_id'},
    {'name': 'idx_opportunities_stage', 'table': 'opportunities', 'column': 'stage'},
    {'name': 'idx_accounts_owner_id', 'table': 'accounts', 'column': 'owner_id'},
    {'name': 'idx_accounts_industry_id', 'table': 'accounts', 'column': 'industry_id'},
]


def _get_db_connection():
    """Get a database connection for index operations."""
    from db_connection import get_database_connection, return_database_connection
    return get_database_connection(), return_database_connection


def _run_slow_queries(count: int = 10) -> Dict[str, Any]:
    """
    Run queries that will be slow without indexes to generate RDS latency metrics.
    These queries use columns that had indexes dropped, forcing full table scans.
    """
    queries_run = 0
    total_time_ms = 0
    errors = []
    
    try:
        connection, return_conn = _get_db_connection()
        try:
            cursor = connection.cursor()
            import time
            
            # Queries that will be slow without indexes
            slow_queries = [
                "SELECT * FROM opportunities WHERE stage = 'Launched'",
                "SELECT * FROM opportunities WHERE owner_id = 'tm-001'",
                "SELECT * FROM accounts WHERE industry_id = 'Technology'",
                "SELECT * FROM accounts WHERE owner_id = 'tm-001'",
                "SELECT COUNT(*) FROM opportunities WHERE stage IN ('Launched', 'Qualified', 'Proof of Concept')",
            ]
            
            for i in range(count):
                query = slow_queries[i % len(slow_queries)]
                try:
                    start = time.time()
                    cursor.execute(query)
                    cursor.fetchall()
                    elapsed_ms = (time.time() - start) * 1000
                    total_time_ms += elapsed_ms
                    queries_run += 1
                    logger.info(f"Slow query {i+1}/{count} took {elapsed_ms:.0f}ms")
                except Exception as e:
                    errors.append({'query': i, 'error': str(e)})
                    logger.warning(f"Query {i+1} failed: {e}")
            
            cursor.close()
        finally:
            return_conn(connection)
            
    except Exception as e:
        logger.error(f"Database connection error during slow queries: {e}")
        errors.append({'query': 'connection', 'error': str(e)})
    
    avg_time_ms = total_time_ms / queries_run if queries_run > 0 else 0
    return {
        'queriesRun': queries_run,
        'totalTimeMs': total_time_ms,
        'avgTimeMs': avg_time_ms,
        'errors': errors
    }


def _start_rds_background_queries() -> bool:
    """Kick off the background RDS query loop via async Lambda self-invocation."""
    try:
        function_name = os.environ.get('AWS_LAMBDA_FUNCTION_NAME', '')
        if not function_name:
            logger.warning("Cannot start RDS background queries: function name not available")
            return False
        lambda_client.invoke(
            FunctionName=function_name,
            InvocationType='Event',
            Payload=json.dumps({
                '_rdsBackgroundQueries': True,
                '_iteration': 0
            })
        )
        logger.info("Started RDS background query loop")
        return True
    except Exception as e:
        logger.error(f"Failed to start RDS background queries: {e}")
        return False


def enable_rds_index_drop(severity: str, user_id: str, user_display_name: str = 'system') -> Dict[str, Any]:
    """
    Enable RDS slow query scenario.
    
    Steps:
    1. Drop database indexes (real AWS change)
    2. Save config state to DynamoDB
    3. Push "bad migration" commit to GitHub (non-fatal)
    4. Start background query loop for CPU pressure
    5. Log failure event
    6. Notify DevOps Agent
    """
    # Step 1: Drop database indexes
    indexes_dropped = []
    try:
        connection, return_conn = _get_db_connection()
        try:
            cursor = connection.cursor()
            for idx in RDS_INDEXES:
                try:
                    cursor.execute(f"DROP INDEX IF EXISTS {idx['name']}")
                    indexes_dropped.append(idx['name'])
                    logger.info(f"Dropped index: {idx['name']}")
                except Exception as e:
                    logger.warning(f"Failed to drop index {idx['name']}: {e}")
            connection.commit()
            cursor.close()
        finally:
            return_conn(connection)
    except Exception as e:
        logger.error(f"Database connection error during index drop: {e}")
    
    # Step 2: Save config state
    save_config('rdsIndexDrop', True, severity, {'indexesDropped': indexes_dropped}, user_id, user_display_name=user_display_name)
    
    # Step 3: Push bad commit to GitHub (non-fatal)
    github_result = {'success': False, 'skipped': True}
    try:
        from handlers.github_handler import push_bad_rds_commit
        github_result = push_bad_rds_commit()
        logger.info(f"GitHub push result: {github_result}")
    except Exception as e:
        logger.warning(f"GitHub push failed (non-fatal): {e}")
        github_result = {'success': False, 'error': str(e)}
    
    # Get database info from environment
    database_name = os.environ.get('DATABASE_NAME', 'crm_demo')
    database_proxy_endpoint = os.environ.get('DATABASE_PROXY_ENDPOINT', '')
    aws_account_id = os.environ.get('AWS_ACCOUNT_ID', 'unknown')
    
    cluster_identifier = 'unknown'
    if database_proxy_endpoint:
        parts = database_proxy_endpoint.split('.')
        if len(parts) > 0:
            cluster_identifier = parts[0]
    
    now = datetime.utcnow()
    current_time = now.strftime('%Y-%m-%dT%H:%M:%S.000Z')
    
    # Step 5: Log the scenario activation
    log_failure_error(
        'rdsIndexDrop',
        'ScenarioActivated',
        f"RDS slow query scenario activated — indexes dropped: {indexes_dropped}",
        {
            'service': 'Amazon RDS',
            'indexesDropped': indexes_dropped,
            'githubCommit': github_result.get('commitSha', 'N/A'),
        }
    )
    
    # Step 6: Notify DevOps Agent
    rds_instance_arn = f'arn:aws:rds:{AWS_REGION}:{aws_account_id}:db:{cluster_identifier}-instance-1'
    rds_cluster_arn = f'arn:aws:rds:{AWS_REGION}:{aws_account_id}:cluster:{cluster_identifier}'
    investigate_start = (now - __import__('datetime').timedelta(minutes=5)).strftime('%Y-%m-%dT%H:%M:%S.000Z')
    
    notify_devops_agent(
        'rdsIndexDrop',
        f'RDS Read Latency/CPU Utilization High - {cluster_identifier} in {AWS_REGION} ({aws_account_id})',
        f'RDS Instance Details: '
        f'DB Instance Identifier: {cluster_identifier}-instance-1. '
        f'DB Instance ARN: {rds_instance_arn}. '
        f'This instance is part of an Aurora DSQL cluster: {cluster_identifier} (ARN: {rds_cluster_arn}). '
        f'Database Name: {database_name}. Endpoint: {database_proxy_endpoint}. '
        f'Engine: Aurora DSQL (PostgreSQL-compatible). '
        f'AWS Context: '
        f'AWS Account ID: {aws_account_id}. AWS Region: {AWS_REGION}. '
        f'Incident Timing: '
        f'Latency spike first detected at {current_time}. '
        f'The issue is still ongoing. '
        f'Investigate time range: {investigate_start} to now. '
        f'Symptom Details: '
        f'CPU usage is elevated beyond normal baseline. '
        f'Normal baseline CPU for this database is 5-15%. Current CPU is significantly elevated. '
        f'Datadog monitor aws.rds.cpuutilization is alerting. '
        f'Query latency baseline: <50ms. Current: 200-5000ms. '
        f'Additional Context: '
        f'Connected applications: CRM REST API (AWS Lambda behind API Gateway), CRM Frontend (React on CloudFront). '
        f'All database queries across the CRM application are experiencing degraded performance.',
        severity,
        'Amazon Aurora DSQL',
        {
            'rdsInstanceIdentifier': f'{cluster_identifier}-instance-1',
            'rdsInstanceArn': rds_instance_arn,
            'rdsClusterIdentifier': cluster_identifier,
            'rdsClusterArn': rds_cluster_arn,
            'isCluster': True,
            'databaseEndpoint': database_proxy_endpoint,
            'databaseName': database_name,
            'databaseEngine': 'Aurora DSQL (PostgreSQL-compatible)',
            'awsAccountId': aws_account_id,
            'awsRegion': AWS_REGION,
            'incidentTimestamp': current_time,
            'latencySpikeDetectedAt': current_time,
            'isOngoing': True,
            'investigateTimeRange': f'{investigate_start} to {current_time}',
            'investigateStartTime': investigate_start,
            'investigateEndTime': current_time,
            'cpuImpact': 'Elevated beyond normal baseline',
            'baselineCpuUsage': '5-15%',
            'currentCpuUsage': 'Significantly elevated',
            'baselineQueryLatency': '<50ms',
            'currentQueryLatency': '200-5000ms',
            'datadogMonitorName': 'aws.rds.cpuutilization',
            'datadogAlertStatus': 'Triggered - latency exceeded threshold',
            'performanceDegradation': 'All queries experiencing high latency',
            'detectionMethod': 'Datadog aws.rds.cpuutilization monitor + CloudWatch ReadLatency alarm',
            'cloudWatchAlarms': [
                f'RDS-{cluster_identifier}-ReadLatency',
                f'RDS-{cluster_identifier}-WriteLatency',
                f'RDS-{cluster_identifier}-DatabaseConnections',
                'CRM-API-HighLatency'
            ],
            'affectedTables': ['opportunities', 'accounts'],
            'indexesDropped': indexes_dropped,
            'connectedApplications': [
                'CRM REST API (AWS Lambda behind API Gateway)',
                'CRM Frontend (React app on CloudFront)',
            ],
            'impactedFeatures': ['Pipeline view', 'Account listing', 'Opportunity search', 'Team performance'],
            'estimatedUsersAffected': 'All CRM users',
            'businessImpact': 'Severe - CRM application experiencing significant slowdowns'
        }
    )
    
    # Step 4: Start background query loop
    return {
        'success': True,
        'message': f"RDS slow query scenario activated. Indexes dropped: {indexes_dropped}. Background query loop started.",
        'indexesDropped': indexes_dropped,
        'githubCommit': github_result,
        'backgroundQueriesStarted': _start_rds_background_queries(),
    }


def disable_rds_index_drop(user_id: str) -> Dict[str, Any]:
    """
    Disable RDS slow query scenario.
    
    Steps:
    1. Recreate database indexes
    2. Save config state (stops background query loop)
    3. Push "fix" commit to GitHub (non-fatal)
    4. Log deactivation event
    """
    # Step 1: Recreate database indexes
    indexes_recreated = []
    try:
        connection, return_conn = _get_db_connection()
        try:
            cursor = connection.cursor()
            for idx in RDS_INDEXES:
                try:
                    cursor.execute(
                        f"CREATE INDEX IF NOT EXISTS {idx['name']} ON {idx['table']}({idx['column']})"
                    )
                    indexes_recreated.append(idx['name'])
                    logger.info(f"Recreated index: {idx['name']}")
                except Exception as e:
                    logger.warning(f"Failed to recreate index {idx['name']}: {e}")
            connection.commit()
            cursor.close()
        finally:
            return_conn(connection)
    except Exception as e:
        logger.error(f"Database connection error during index recreation: {e}")
    
    # Step 2: Save config state (background query loop checks this and stops)
    save_config('rdsIndexDrop', False, 'moderate', None, user_id)
    
    # Step 3: Push good commit to GitHub (non-fatal)
    github_result = {'success': False, 'skipped': True}
    try:
        from handlers.github_handler import push_good_rds_commit
        github_result = push_good_rds_commit()
        logger.info(f"GitHub fix push result: {github_result}")
    except Exception as e:
        logger.warning(f"GitHub fix push failed (non-fatal): {e}")
        github_result = {'success': False, 'error': str(e)}
    
    # Step 4: Log deactivation
    log_failure_error(
        'rdsIndexDrop',
        'ScenarioDeactivated',
        f"RDS slow query scenario deactivated — indexes recreated: {indexes_recreated}",
        {
            'service': 'Amazon RDS',
            'indexesRecreated': indexes_recreated,
            'githubCommit': github_result.get('commitSha', 'N/A'),
        }
    )
    
    return {
        'success': True,
        'message': f"RDS slow query scenario deactivated. Indexes recreated: {indexes_recreated}. Background queries stopping.",
        'indexesRecreated': indexes_recreated,
        'githubCommit': github_result,
    }


# Lambda Failed Deployment - Updates Lambda code to a version with a realistic bug
# Broken code: references a module that was removed in a recent refactor
def enable_lambda_failed_deployment(severity: str, user_id: str, user_display_name: str = 'system') -> Dict[str, Any]:
    """
    Enable Lambda failed deployment scenario.
    The broken code is already deployed at infrastructure level (missing ./config/pipeline-rules module).
    Enabling this scenario activates the failure injection path so CRM API traffic invokes the
    broken event processor, generating real errors visible in CloudWatch.
    """
    if not TARGET_LAMBDA_ARN:
        return {'success': False, 'message': 'Target Lambda not configured'}
    
    # Save config state — this activates the failure injection in inject_failure_if_enabled
    save_config('lambdaFailedDeployment', True, severity, None, user_id, user_display_name=user_display_name)
    
    # Push bad commit to GitHub (non-fatal)
    github_result = {'success': False, 'skipped': True}
    try:
        from handlers.github_handler import push_bad_lambda_commit
        github_result = push_bad_lambda_commit()
        logger.info(f"GitHub Lambda push result: {github_result}")
    except Exception as e:
        logger.warning(f"GitHub Lambda push failed (non-fatal): {e}")
        github_result = {'success': False, 'error': str(e)}
    
    function_name = TARGET_LAMBDA_ARN.split(':')[-1]
    current_time = datetime.now(timezone.utc).isoformat()
    
    arn_parts = TARGET_LAMBDA_ARN.split(':') if TARGET_LAMBDA_ARN else []
    aws_region = arn_parts[3] if len(arn_parts) > 3 else 'unknown'
    aws_account_id = arn_parts[4] if len(arn_parts) > 4 else 'unknown'
    
    # Log the scenario activation
    log_failure_error(
        'lambdaFailedDeployment',
        'ScenarioActivated',
        f"Lambda error scenario activated — CRM traffic will now invoke broken event processor {function_name}",
        {
            'service': 'AWS Lambda',
            'functionName': function_name,
        }
    )
    
    # Notify DevOps Agent
    notify_devops_agent(
        'lambdaFailedDeployment',
        f'High Lambda Error Rate, all invocations failing - {function_name} in {aws_region} ({aws_account_id})',
        f'AWS Account ID: {aws_account_id}. '
        f'AWS Region: {aws_region}. '
        f'Lambda Function Name: {function_name}. '
        f'Lambda Function ARN: {TARGET_LAMBDA_ARN}. '
        f'Incident Time: {current_time}. Issue is ongoing. '
        f'Detection Method: CloudWatch Alarm triggered on sustained error rate exceeding threshold. '
        f'All invocations of this function are failing. '
        f'CloudWatch Log Group: /aws/lambda/{function_name}. '
        f'Runtime: nodejs22.x. Handler: index.handler. '
        f'Impact: All dependent services receiving 5xx errors from this function.',
        severity,
        'AWS Lambda',
        {
            'lambdaFunctionName': function_name,
            'lambdaFunctionArn': TARGET_LAMBDA_ARN,
            'runtime': 'nodejs22.x',
            'handler': 'index.handler',
            'awsAccountId': aws_account_id,
            'awsRegion': aws_region,
            'detectedAt': current_time,
            'isOngoing': True,
            'cloudWatchLogGroup': f'/aws/lambda/{function_name}',
            'cloudWatchAlarms': [
                f'Lambda-{function_name}-Errors',
                f'Lambda-{function_name}-Duration',
                'CRM-API-5xxErrors',
            ],
            'impactedServices': ['CRM Event Processor', 'Pipeline Notifications', 'Downstream Consumers'],
            'estimatedUsersAffected': 'All users relying on async event processing',
            'businessImpact': 'Critical - Lambda function returning errors on all invocations'
        }
    )
    
    return {
        'success': True,
        'message': f"Lambda error scenario activated. CRM API traffic will generate errors from {function_name}.",
        'functionName': function_name,
        'githubCommit': github_result,
    }


def disable_lambda_failed_deployment(user_id: str) -> Dict[str, Any]:
    """
    Disable Lambda failed deployment scenario.
    The broken code stays deployed — we just deactivate the failure injection path
    so CRM API traffic no longer invokes the broken event processor.
    """
    # Save config state — this deactivates the failure injection
    save_config('lambdaFailedDeployment', False, 'moderate', None, user_id)
    
    # Push good commit to GitHub (non-fatal)
    github_result = {'success': False, 'skipped': True}
    try:
        from handlers.github_handler import push_good_lambda_commit
        github_result = push_good_lambda_commit()
        logger.info(f"GitHub Lambda fix push result: {github_result}")
    except Exception as e:
        logger.warning(f"GitHub Lambda fix push failed (non-fatal): {e}")
        github_result = {'success': False, 'error': str(e)}
    
    function_name = TARGET_LAMBDA_ARN.split(':')[-1] if TARGET_LAMBDA_ARN else 'unknown'
    
    log_failure_error(
        'lambdaFailedDeployment',
        'ScenarioDeactivated',
        f"Lambda error scenario deactivated — CRM traffic will no longer invoke event processor {function_name}",
        {
            'service': 'AWS Lambda',
            'functionName': function_name,
            'githubCommit': github_result.get('commitSha', 'N/A'),
        }
    )
    
    return {
        'success': True,
        'message': f"Lambda error scenario deactivated.",
        'functionName': function_name,
        'githubCommit': github_result,
    }




# ============================================================================
# CloudWatch Metrics Functions
# ============================================================================

def get_metrics(
    start_time: Optional[str] = None,
    end_time: Optional[str] = None
) -> Dict[str, Any]:
    """
    Retrieve CloudWatch metrics for the dashboard.
    
    Args:
        start_time: ISO 8601 timestamp (default: 15 minutes ago)
        end_time: ISO 8601 timestamp (default: now)
        
    Returns:
        Dictionary with metrics and time series data
    """
    try:
        from datetime import timedelta
        now = datetime.utcnow()
        
        # Parse time range
        if end_time:
            end_dt = datetime.fromisoformat(end_time.replace('Z', '').replace('+00:00', ''))
        else:
            end_dt = now
            
        if start_time:
            start_dt = datetime.fromisoformat(start_time.replace('Z', '').replace('+00:00', ''))
        else:
            start_dt = now - timedelta(minutes=15)
        
        # Calculate period based on time range
        range_seconds = (end_dt - start_dt).total_seconds()
        if range_seconds > 24 * 60 * 60:
            period = 3600  # 1 hour for > 24h
        elif range_seconds > 6 * 60 * 60:
            period = 900   # 15 min for > 6h
        elif range_seconds > 60 * 60:
            period = 300   # 5 min for > 1h
        else:
            period = 60    # 1 min for <= 1h
        
        # Build metric queries
        metric_queries = []
        
        # Lambda metrics
        if TARGET_LAMBDA_ARN:
            function_name = TARGET_LAMBDA_ARN.split(':')[-1]
            metric_queries.extend([
                _create_metric_query('lambda_invocations', 'AWS/Lambda', 'Invocations', 
                                    'FunctionName', function_name, 'Sum', period),
                _create_metric_query('lambda_errors', 'AWS/Lambda', 'Errors',
                                    'FunctionName', function_name, 'Sum', period),
                _create_metric_query('lambda_throttles', 'AWS/Lambda', 'Throttles',
                                    'FunctionName', function_name, 'Sum', period),
                _create_metric_query('lambda_duration', 'AWS/Lambda', 'Duration',
                                    'FunctionName', function_name, 'Average', period),
            ])
        
        # SNS metrics
        if NOTIFICATION_TOPIC_ARN:
            topic_name = NOTIFICATION_TOPIC_ARN.split(':')[-1]
            metric_queries.extend([
                _create_metric_query('sns_published', 'AWS/SNS', 'NumberOfMessagesPublished',
                                    'TopicName', topic_name, 'Sum', period),
                _create_metric_query('sns_failed', 'AWS/SNS', 'NumberOfNotificationsFailed',
                                    'TopicName', topic_name, 'Sum', period),
            ])
        
        # SQS metrics
        if NOTIFICATION_QUEUE_URL:
            queue_name = NOTIFICATION_QUEUE_URL.split('/')[-1]
            metric_queries.extend([
                _create_metric_query('sqs_sent', 'AWS/SQS', 'NumberOfMessagesSent',
                                    'QueueName', queue_name, 'Sum', period),
                _create_metric_query('sqs_received', 'AWS/SQS', 'NumberOfMessagesReceived',
                                    'QueueName', queue_name, 'Sum', period),
                _create_metric_query('sqs_visible', 'AWS/SQS', 'ApproximateNumberOfMessagesVisible',
                                    'QueueName', queue_name, 'Average', period),
            ])
        
        # S3 metrics
        if DATA_BUCKET_NAME:
            metric_queries.extend([
                _create_metric_query('s3_requests', 'AWS/S3', 'AllRequests',
                                    'BucketName', DATA_BUCKET_NAME, 'Sum', period),
                _create_metric_query('s3_errors', 'AWS/S3', '4xxErrors',
                                    'BucketName', DATA_BUCKET_NAME, 'Sum', period),
            ])
        
        # Fetch metrics from CloudWatch
        metrics_data = {}
        time_series = []
        
        if metric_queries:
            response = cloudwatch_client.get_metric_data(
                MetricDataQueries=metric_queries,
                StartTime=start_dt,
                EndTime=end_dt
            )
            
            # Build timestamp map for time series
            timestamp_map = {}
            
            for result in response.get('MetricDataResults', []):
                metric_id = result.get('Id', '')
                values = result.get('Values', [])
                timestamps = result.get('Timestamps', [])
                
                # Get latest value for summary metrics
                metrics_data[metric_id] = values[0] if values else 0
                
                # Build time series
                for i, ts in enumerate(timestamps):
                    ts_key = ts.isoformat() if hasattr(ts, 'isoformat') else str(ts)
                    if ts_key not in timestamp_map:
                        timestamp_map[ts_key] = {'timestamp': ts_key}
                    timestamp_map[ts_key][metric_id] = values[i] if i < len(values) else 0
            
            # Convert to sorted time series array
            time_series = sorted(timestamp_map.values(), key=lambda x: x['timestamp'])
        
        # Calculate system health
        total_errors = (
            metrics_data.get('lambda_errors', 0) +
            metrics_data.get('sns_failed', 0) +
            metrics_data.get('s3_errors', 0)
        )
        total_requests = (
            metrics_data.get('lambda_invocations', 0) +
            metrics_data.get('sns_published', 0) +
            metrics_data.get('s3_requests', 0)
        )
        
        error_rate = (total_errors / total_requests * 100) if total_requests > 0 else 0
        
        if error_rate > 10 or metrics_data.get('lambda_throttles', 0) > 0:
            system_health = 'unhealthy'
        elif error_rate > 5:
            system_health = 'degraded'
        else:
            system_health = 'healthy'
        
        # Get active scenario for real-time streaming
        active_scenario = None
        try:
            status = get_system_status()
            for scenario_type, config in status.get('scenarios', {}).items():
                if config.get('enabled'):
                    active_scenario = scenario_type
                    break
        except Exception:
            pass
        
        # Calculate scenario-specific metrics
        sqs_queue_depth = int(metrics_data.get('sqs_visible', 0))
        
        # Always query SQS queue directly for real-time depth
        # (CloudWatch has a 1-5 minute delay for SQS metrics)
        if NOTIFICATION_QUEUE_URL:
            try:
                queue_attrs = sqs_client.get_queue_attributes(
                    QueueUrl=NOTIFICATION_QUEUE_URL,
                    AttributeNames=['ApproximateNumberOfMessages']
                )
                real_depth = int(queue_attrs.get('Attributes', {}).get('ApproximateNumberOfMessages', 0))
                sqs_queue_depth = max(sqs_queue_depth, real_depth)
                logger.info(f"Real-time SQS queue depth: {real_depth}")
            except Exception as e:
                logger.warning(f"Failed to get real-time SQS queue depth: {e}")
        
        lambda_invocations = metrics_data.get('lambda_invocations', 0)
        lambda_errors = metrics_data.get('lambda_errors', 0)
        lambda_error_rate = (lambda_errors / lambda_invocations * 100) if lambda_invocations > 0 else 0.0
        
        # Probe the target Lambda directly for real-time error detection
        # Only probe when the Lambda scenario is active (broken code is permanently deployed)
        lambda_scenario_active = False
        for scenario_type, config in status.get('scenarios', {}).items():
            if scenario_type == 'lambdaFailedDeployment' and config.get('enabled'):
                lambda_scenario_active = True
                break
        
        if not lambda_scenario_active:
            # Scenario is off — no one is invoking the broken Lambda, so error rate is 0
            lambda_error_rate = 0.0
        elif TARGET_LAMBDA_ARN:
            try:
                function_name = TARGET_LAMBDA_ARN.split(':')[-1]
                probe_response = lambda_client.invoke(
                    FunctionName=function_name,
                    InvocationType='RequestResponse',
                    Payload=json.dumps({
                        'source': 'crm.api',
                        'type': 'health_check',
                        'timestamp': now.isoformat(),
                    }),
                )
                if probe_response.get('FunctionError'):
                    # Function is broken — report 100% error rate
                    lambda_error_rate = max(lambda_error_rate, 100.0)
                    logger.info(f"Lambda probe: FAILED (FunctionError={probe_response.get('FunctionError')})")
                else:
                    logger.info("Lambda probe: OK")
            except Exception as e:
                logger.warning(f"Lambda probe failed: {e}")
                # If we can't even invoke it, treat as erroring
                lambda_error_rate = max(lambda_error_rate, 100.0)
        
        # Calculate RDS CPU utilization
        # Always run a probe query for real-time latency, then blend with CloudWatch CPU when available
        rds_cpu_utilization = 8.0  # Default baseline CPU utilization %
        rds_scenario_active = False
        for scenario_type, config in status.get('scenarios', {}).items():
            if scenario_type == 'rdsIndexDrop' and config.get('enabled'):
                rds_scenario_active = True
                break
        
        # Run a real probe query to measure current database performance
        # Only run heavy queries when the RDS scenario is active
        if rds_scenario_active:
            try:
                import time as _time
                from db_connection import get_database_connection, return_database_connection
                conn = get_database_connection()
                if conn:
                    try:
                        cur = conn.cursor()
                        # Run multiple heavy queries to get a realistic latency measurement
                        # Cross joins and aggregations force significant CPU work without indexes
                        heavy_queries = [
                            "SELECT * FROM opportunities WHERE stage = 'Launched'",
                            "SELECT a.*, COUNT(o.id) FROM accounts a LEFT JOIN opportunities o ON a.id = o.account_id GROUP BY a.id",
                            "SELECT o1.id, o2.id FROM opportunities o1, opportunities o2 WHERE o1.owner_id = o2.owner_id AND o1.id != o2.id LIMIT 500",
                        ]
                        total_ms = 0
                        for q in heavy_queries:
                            try:
                                start_t = _time.time()
                                cur.execute(q)
                                cur.fetchall()
                                total_ms += (_time.time() - start_t) * 1000
                            except Exception:
                                pass
                        cur.close()
                        query_ms = total_ms
                        logger.info(f"RDS probe queries total latency: {query_ms:.0f}ms")
                        
                        # With indexes dropped, even moderate latency means high CPU
                        if query_ms < 100:
                            rds_cpu_utilization = 55.0 + (query_ms / 100.0) * 10.0
                        elif query_ms < 500:
                            rds_cpu_utilization = 65.0 + ((query_ms - 100) / 400.0) * 20.0
                        else:
                            rds_cpu_utilization = min(95.0, 85.0 + ((query_ms - 500) / 2000.0) * 10.0)
                    finally:
                        return_database_connection(conn)
                else:
                    rds_cpu_utilization = 75.0
            except Exception as e:
                logger.warning(f"Failed to run RDS probe query: {e}")
                rds_cpu_utilization = 70.0
        
        # Publish real-time metrics to AppSync for connected clients
        # Recalculate system health based on real-time probe results (not just CloudWatch)
        if lambda_error_rate > 10 or rds_cpu_utilization > 40 or sqs_queue_depth > 50:
            system_health = 'unhealthy'
        elif lambda_error_rate > 5 or rds_cpu_utilization > 25 or sqs_queue_depth > 25:
            system_health = 'degraded'
        
        publish_metrics_update(
            active_scenario=active_scenario,
            sqs_queue_depth=sqs_queue_depth,
            lambda_error_rate=round(lambda_error_rate, 2),
            rds_cpu_utilization=round(rds_cpu_utilization, 2),
            system_health=system_health
        )
        
        return {
            'success': True,
            'metrics': {
                'lambdaInvocations': int(metrics_data.get('lambda_invocations', 0)),
                'lambdaErrors': int(metrics_data.get('lambda_errors', 0)),
                'lambdaThrottles': int(metrics_data.get('lambda_throttles', 0)),
                'lambdaDuration': round(metrics_data.get('lambda_duration', 0), 2),
                'snsPublishSuccess': int(metrics_data.get('sns_published', 0)),
                'snsPublishFailed': int(metrics_data.get('sns_failed', 0)),
                'sqsMessagesSent': int(metrics_data.get('sqs_sent', 0)),
                'sqsMessagesReceived': int(metrics_data.get('sqs_received', 0)),
                'sqsMessagesVisible': sqs_queue_depth,
                's3Requests': int(metrics_data.get('s3_requests', 0)),
                's3Errors': int(metrics_data.get('s3_errors', 0)),
                'systemHealth': system_health,
                'errorRate': round(error_rate, 2),
                'lambdaErrorRate': round(lambda_error_rate, 2),
                'rdsCpuUtilization': round(rds_cpu_utilization, 2),
                'activeScenario': active_scenario,
                'timestamp': now.isoformat() + 'Z'
            },
            'timeSeries': time_series,
            'timeRange': {
                'start': start_dt.isoformat() + 'Z',
                'end': end_dt.isoformat() + 'Z'
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to get metrics: {e}")
        return {
            'success': False,
            'metrics': {},
            'timeSeries': [],
            'error': str(e)
        }


def _create_metric_query(
    query_id: str,
    namespace: str,
    metric_name: str,
    dimension_name: str,
    dimension_value: str,
    stat: str,
    period: int
) -> Dict[str, Any]:
    """Helper to create a CloudWatch metric query."""
    return {
        'Id': query_id,
        'MetricStat': {
            'Metric': {
                'Namespace': namespace,
                'MetricName': metric_name,
                'Dimensions': [
                    {'Name': dimension_name, 'Value': dimension_value}
                ]
            },
            'Period': period,
            'Stat': stat
        }
    }


def invoke_target_lambda(count: int = 5) -> Dict[str, Any]:
    """
    Invoke the target Lambda function multiple times to generate CloudWatch metrics.
    When the Lambda Error scenario is active, this will generate actual errors.
    
    Args:
        count: Number of invocations (default 5, max 20)
        
    Returns:
        Dictionary with invocation results
    """
    if not TARGET_LAMBDA_ARN:
        return {'success': False, 'message': 'Target Lambda not configured'}
    
    count = min(max(1, count), 20)  # Clamp between 1 and 20
    function_name = TARGET_LAMBDA_ARN.split(':')[-1]
    
    results = {'success': True, 'invocations': [], 'errors': 0, 'successes': 0}
    
    for i in range(count):
        try:
            response = lambda_client.invoke(
                FunctionName=function_name,
                InvocationType='RequestResponse',
                Payload=json.dumps({'test': True, 'invocation': i + 1})
            )
            
            status_code = response.get('StatusCode', 0)
            function_error = response.get('FunctionError')
            
            if function_error:
                results['errors'] += 1
                results['invocations'].append({
                    'index': i + 1,
                    'status': 'error',
                    'functionError': function_error
                })
            else:
                results['successes'] += 1
                results['invocations'].append({
                    'index': i + 1,
                    'status': 'success',
                    'statusCode': status_code
                })
                
        except Exception as e:
            results['errors'] += 1
            results['invocations'].append({
                'index': i + 1,
                'status': 'error',
                'error': str(e)
            })
    
    results['message'] = f"Invoked {count} times: {results['successes']} success, {results['errors']} errors"
    return results


def publish_metrics_to_appsync(
    active_scenario: Optional[str],
    sqs_queue_depth: int,
    lambda_error_rate: float,
    rds_cpu_utilization: float,
    system_health: str
) -> None:
    """
    Publish real-time metrics update to AppSync for streaming to connected clients.
    """
    if not APPSYNC_API_URL:
        logger.debug("APPSYNC_API_URL not configured, skipping metrics publish")
        return
    
    try:
        mutation = '''
            mutation PublishMetricsUpdate(
                $activeScenario: String
                $sqsQueueDepth: Int!
                $lambdaErrorRate: Float!
                $rdsCpuUtilization: Float!
                $systemHealth: String!
            ) {
                publishMetricsUpdate(
                    activeScenario: $activeScenario
                    sqsQueueDepth: $sqsQueueDepth
                    lambdaErrorRate: $lambdaErrorRate
                    rdsCpuUtilization: $rdsCpuUtilization
                    systemHealth: $systemHealth
                ) {
                    id
                    timestamp
                    activeScenario
                    sqsQueueDepth
                    lambdaErrorRate
                    rdsCpuUtilization
                    systemHealth
                }
            }
        '''
        
        variables = {
            'activeScenario': active_scenario,
            'sqsQueueDepth': sqs_queue_depth,
            'lambdaErrorRate': lambda_error_rate,
            'rdsCpuUtilization': rds_cpu_utilization,
            'systemHealth': system_health
        }
        
        body = json.dumps({
            'query': mutation,
            'variables': variables
        })
        
        url = urlparse(APPSYNC_API_URL)
        
        request = AWSRequest(
            method='POST',
            url=APPSYNC_API_URL,
            data=body,
            headers={
                'Content-Type': 'application/json',
                'host': url.netloc
            }
        )
        
        credentials = session.get_credentials()
        SigV4Auth(credentials, 'appsync', AWS_REGION).add_auth(request)
        
        http_request = Request(
            APPSYNC_API_URL,
            data=body.encode('utf-8'),
            headers=dict(request.headers),
            method='POST'
        )
        
        with urlopen(http_request, timeout=5) as response:
            response_data = response.read().decode('utf-8')
            logger.debug(f"AppSync metrics response: {response_data}")
        
        logger.info(f"Published metrics update to AppSync: SQS={sqs_queue_depth}, ErrorRate={lambda_error_rate:.1f}%, RDS_CPU={rds_cpu_utilization:.1f}%")
        
    except Exception as e:
        logger.warning(f"Failed to publish metrics to AppSync: {e}")


def trigger_rds_queries(count: int = 5) -> Dict[str, Any]:
    """
    Trigger database queries to generate RDS metrics.
    When indexes are dropped, these queries will be slow.
    
    Args:
        count: Number of queries to execute
        
    Returns:
        Dictionary with query results and timing
    """
    from db_connection import get_database_connection, return_database_connection
    
    count = min(max(1, count), 20)  # Clamp between 1 and 20
    results = {'success': True, 'queries': [], 'totalTime': 0}
    
    conn = None
    try:
        conn = get_database_connection()
        if not conn:
            return {'success': False, 'message': 'Database connection not available'}
        
        cursor = conn.cursor()
        
        # Heavy queries without LIMIT to force full table scans when indexes are dropped
        queries = [
            "SELECT * FROM opportunities WHERE stage = 'Qualified'",
            "SELECT * FROM accounts WHERE industry_id = 'Technology'",
            "SELECT * FROM opportunities WHERE owner_id = 'tm-001'",
            "SELECT COUNT(*), AVG(amount), SUM(amount) FROM opportunities GROUP BY stage",
            "SELECT a.*, COUNT(o.id) FROM accounts a LEFT JOIN opportunities o ON a.id = o.account_id GROUP BY a.id",
            "SELECT * FROM opportunities ORDER BY amount DESC",
            "SELECT * FROM accounts ORDER BY name",
            "SELECT o.*, a.name FROM opportunities o LEFT JOIN accounts a ON o.account_id = a.id WHERE o.stage IN ('Qualified', 'Proof of Concept', 'Launched')",
        ]
        
        import time
        for i in range(count):
            query = queries[i % len(queries)]
            start = time.time()
            try:
                cursor.execute(query)
                cursor.fetchall()
                elapsed = (time.time() - start) * 1000  # Convert to ms
                results['queries'].append({
                    'index': i + 1,
                    'query': query[:50] + '...',
                    'timeMs': round(elapsed, 2),
                    'status': 'success'
                })
                results['totalTime'] += elapsed
            except Exception as e:
                elapsed = (time.time() - start) * 1000
                results['queries'].append({
                    'index': i + 1,
                    'query': query[:50] + '...',
                    'timeMs': round(elapsed, 2),
                    'status': 'error',
                    'error': str(e)
                })
                results['totalTime'] += elapsed
        
        cursor.close()
        results['avgTimeMs'] = round(results['totalTime'] / count, 2) if count > 0 else 0
        results['message'] = f"Executed {count} queries, avg time: {results['avgTimeMs']}ms"
        
    except Exception as e:
        logger.error(f"Failed to trigger RDS queries: {e}")
        results['success'] = False
        results['error'] = str(e)
    finally:
        if conn:
            return_database_connection(conn)
    
    return results
