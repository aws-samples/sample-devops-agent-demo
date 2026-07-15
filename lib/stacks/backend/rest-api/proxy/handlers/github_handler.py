"""
GitHub integration handler for failure simulator scenarios.

Handles pushing "bad" and "good" commits to a GitHub repository to create
an audit trail that investigation tools (like AWS DevOps Agent) can trace.

GitHub credentials are stored in AWS SSM Parameter Store:
- /workshop/crm/github-pat  (SecureString) — GitHub Personal Access Token
- /workshop/crm/github-repo (String) — Repository in owner/repo format
"""

import json
import logging
import os
import base64
from typing import Any, Dict, Optional, Tuple
from urllib.request import Request, urlopen
from urllib.error import HTTPError

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# SSM parameter names
GITHUB_PAT_PARAM = os.environ.get('GITHUB_PAT_PARAM', '/workshop/crm/github-pat')
GITHUB_REPO_PARAM = os.environ.get('GITHUB_REPO_PARAM', '/workshop/crm/github-repo')

# Cache for GitHub config
_github_config_cache: Optional[Dict[str, str]] = None

GITHUB_API_BASE = 'https://api.github.com'

# ============================================================================
# SQL Content Constants
# ============================================================================

BAD_MIGRATION_SQL = """-- Performance optimization: remove redundant indexes
-- These indexes are causing write amplification on high-throughput tables
-- Ref: PERF-2847 — Optimize write path for accounts and opportunities

DROP INDEX IF EXISTS idx_opportunities_owner_id;
DROP INDEX IF EXISTS idx_opportunities_stage;
DROP INDEX IF EXISTS idx_accounts_owner_id;
DROP INDEX IF EXISTS idx_accounts_industry_id;

-- Analyze tables after index removal
ANALYZE opportunities;
ANALYZE accounts;
"""

GOOD_MIGRATION_SQL = """-- Rollback: restore indexes removed in PERF-2847
-- Write amplification was not the bottleneck; read latency increased significantly
-- Restoring indexes to fix query performance degradation

CREATE INDEX IF NOT EXISTS idx_opportunities_owner_id ON opportunities(owner_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_accounts_owner_id ON accounts(owner_id);
CREATE INDEX IF NOT EXISTS idx_accounts_industry_id ON accounts(industry_id);

ANALYZE opportunities;
ANALYZE accounts;
"""

BAD_COMMIT_MESSAGE = (
    "perf: remove redundant database indexes for write optimization\n\n"
    "Dropped indexes causing write amplification on high-throughput tables.\n"
    "Related to PERF-2847 — Database write path optimization."
)

GOOD_COMMIT_MESSAGE = (
    "fix: restore database indexes removed in PERF-2847\n\n"
    "Write amplification was not the bottleneck; read latency increased significantly.\n"
    "Restoring indexes to fix query performance degradation."
)

MIGRATION_FILE_PATH = "src/migrations/optimize-queries.sql"

# ============================================================================
# Lambda Scenario — Commit Content
# ============================================================================

BAD_LAMBDA_CODE = """/**
 * CRM Event Processor — refactored to use centralized pipeline rules config.
 *
 * Ref: REFACTOR-1192 — Consolidate event processing logic into shared config module.
 * Moved inline rule definitions to ./config/pipeline-rules for reuse across services.
 */

export const handler = async (event) => {
    console.log('CRM event processor invoked', JSON.stringify(event));

    // Load pipeline rules from shared config module
    const configPath = ['config', 'pipeline-rules'].join('/');
    const pipelineConfig = await import(`./${configPath}`);

    const records = Array.isArray(event) ? event : [event];
    for (const record of records) {
        const payload = typeof record === 'string' ? JSON.parse(record) : record;
        const rules = pipelineConfig.getRulesForEvent(payload.type);

        for (const rule of rules) {
            console.log(`Processing rule ${rule.id} for event type ${payload.type}`);
        }
    }

    return { statusCode: 200, body: JSON.stringify({ processed: records.length }) };
};
"""

GOOD_LAMBDA_CODE = """/**
 * CRM Event Processor — reverted to inline rule definitions.
 *
 * Ref: REFACTOR-1192 — Revert: shared config module was removed in a prior cleanup
 * but this function still referenced it, causing Runtime.ImportModuleError on every
 * invocation. Restoring inline definitions until the shared module is re-published.
 */

export const handler = async (event) => {
    console.log('CRM event processor invoked', JSON.stringify(event));

    // Inline pipeline rules (reverted from shared config)
    const rules = [
        { id: 'stage-change', type: 'opportunity_stage_change', action: 'notify' },
        { id: 'account-update', type: 'account_update', action: 'refresh-cache' },
        { id: 'lead-assign', type: 'lead_assignment', action: 'welcome-email' },
    ];

    const records = Array.isArray(event) ? event : [event];
    for (const record of records) {
        const payload = typeof record === 'string' ? JSON.parse(record) : record;
        const matched = rules.filter(r => r.type === payload.type);
        for (const rule of matched) {
            console.log(`Processing rule ${rule.id} for event type ${payload.type}`);
        }
    }

    return { statusCode: 200, body: JSON.stringify({ processed: records.length }) };
};
"""

BAD_LAMBDA_COMMIT_MESSAGE = (
    "refactor: consolidate event processor to use shared pipeline-rules config\n\n"
    "Moved inline rule definitions to ./config/pipeline-rules for reuse across services.\n"
    "Related to REFACTOR-1192 — Consolidate event processing logic."
)

GOOD_LAMBDA_COMMIT_MESSAGE = (
    "fix: revert event processor to inline rules after ImportModuleError\n\n"
    "The shared config module (./config/pipeline-rules) was removed in a prior cleanup\n"
    "but this function still referenced it. Reverting to inline definitions.\n"
    "Related to REFACTOR-1192."
)

LAMBDA_FILE_PATH = "src/processors/eventProcessor.js"

# ============================================================================
# SQS Scenario — Commit Content
# ============================================================================

BAD_SQS_CODE = """/**
 * SQS Queue Consumer — updated retry and concurrency settings.
 *
 * Ref: OPS-3391 — Reduce consumer concurrency to prevent downstream throttling.
 * Lowered reserved concurrency from 10 to 1 and increased batch window to reduce
 * burst pressure on the notification service.
 */

const { SQSClient, DeleteMessageCommand } = require('@aws-sdk/client-sqs');
const sqs = new SQSClient({});

exports.handler = async (event) => {
    const failures = [];

    for (const record of event.Records) {
        try {
            const body = JSON.parse(record.body);
            console.log(`Processing ${body.type || 'unknown'} message ${record.messageId}`);

            // Simulate downstream call with aggressive timeout
            await processWithTimeout(body, 500);

            console.log(`Processed message ${record.messageId}`);
        } catch (err) {
            console.error(`Failed to process message ${record.messageId}:`, err.message);
            failures.push({ itemIdentifier: record.messageId });
        }
    }

    return { batchItemFailures: failures };
};

async function processWithTimeout(body, timeoutMs) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Processing timeout exceeded')), timeoutMs);
        // Simulate work
        setTimeout(() => { clearTimeout(timer); resolve(); }, 200 + Math.random() * 600);
    });
}
"""

GOOD_SQS_CODE = """/**
 * SQS Queue Consumer — restored original concurrency and timeout settings.
 *
 * Ref: OPS-3391 — Revert: reduced concurrency caused message backlog.
 * The 500ms timeout was too aggressive for downstream notification service
 * response times. Restoring 5s timeout and standard concurrency.
 */

const { SQSClient } = require('@aws-sdk/client-sqs');
const sqs = new SQSClient({});

exports.handler = async (event) => {
    const failures = [];

    for (const record of event.Records) {
        try {
            const body = JSON.parse(record.body);
            console.log(`Processing ${body.type || 'unknown'} message ${record.messageId}`);

            await processMessage(body);

            console.log(`Processed message ${record.messageId}`);
        } catch (err) {
            console.error(`Failed to process message ${record.messageId}:`, err.message);
            failures.push({ itemIdentifier: record.messageId });
        }
    }

    return { batchItemFailures: failures };
};

async function processMessage(body) {
    // Standard processing with 5s timeout
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
    const type = body.type || 'unknown';
    switch (type) {
        case 'opportunity_stage_change':
            console.log(`Routing stage change for opportunity ${body.opportunityId}`);
            break;
        case 'account_update':
            console.log(`Refreshing cache for account ${body.accountId}`);
            break;
        default:
            console.log(`Processing generic event: ${type}`);
    }
}
"""

BAD_SQS_COMMIT_MESSAGE = (
    "ops: reduce queue consumer concurrency to prevent downstream throttling\n\n"
    "Lowered reserved concurrency and added aggressive timeout to reduce\n"
    "burst pressure on the notification service.\n"
    "Related to OPS-3391 — Consumer throughput optimization."
)

GOOD_SQS_COMMIT_MESSAGE = (
    "fix: restore queue consumer timeout after message backlog\n\n"
    "The 500ms timeout was too aggressive for downstream response times,\n"
    "causing all messages to fail and pile up in the queue.\n"
    "Restoring standard 5s timeout. Related to OPS-3391."
)

SQS_CONSUMER_FILE_PATH = "src/consumers/queueConsumer.js"

# GitHub Actions workflow for database migrations
DB_MIGRATION_WORKFLOW = """name: Run Database Migration

on:
  push:
    branches: [main]
    paths: ['src/migrations/*.sql']

permissions:
  id-token: write
  contents: read

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Validate SQL syntax
        run: |
          for f in src/migrations/*.sql; do
            echo "Validating $f..."
            python3 -c "import sqlparse; sqlparse.parse(open('$f').read())"
          done

      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ vars.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: Run migration
        run: |
          ENDPOINT=$(aws rds describe-db-instances --query 'DBInstances[0].Endpoint.Address' --output text)
          for f in src/migrations/*.sql; do
            echo "Applying $f..."
            psql "host=$ENDPOINT dbname=crmdb" -f "$f"
          done

      - name: Verify migration
        run: |
          psql "host=$ENDPOINT dbname=crmdb" -c "\\\\di" | head -20
"""

# GitHub Actions workflow for queue consumer deployments
DEPLOY_QUEUE_CONSUMER_WORKFLOW = """name: Deploy Queue Consumer

on:
  push:
    branches: [main]
    paths: ['src/consumers/queueConsumer.js']

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Validate JavaScript syntax
        run: node --check src/consumers/queueConsumer.js

      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ vars.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: Package and deploy Lambda
        run: |
          FUNCTION_NAME=$(aws lambda list-functions --query 'Functions[?contains(FunctionName, `queueConsumer`)].FunctionName' --output text | head -1)
          cd src/consumers
          zip -r /tmp/consumer.zip queueConsumer.js
          aws lambda update-function-code --function-name "$FUNCTION_NAME" --zip-file fileb:///tmp/consumer.zip

      - name: Verify deployment
        run: |
          aws lambda get-function --function-name "$FUNCTION_NAME" --query 'Configuration.LastModified'
"""


# ============================================================================
# GitHub Config Helpers
# ============================================================================

def _get_github_config() -> Dict[str, str]:
    """
    Retrieve GitHub PAT and repo from SSM Parameter Store (cached).

    Returns:
        dict with 'pat' and 'repo' keys

    Raises:
        ValueError: If parameters are not configured
    """
    global _github_config_cache
    if _github_config_cache is not None:
        return _github_config_cache

    ssm = boto3.client('ssm')

    try:
        pat_response = ssm.get_parameter(Name=GITHUB_PAT_PARAM, WithDecryption=True)
        pat = pat_response['Parameter']['Value']
    except ClientError as e:
        logger.error(f"Failed to retrieve GitHub PAT from SSM ({GITHUB_PAT_PARAM}): {e}")
        raise ValueError(f"GitHub PAT not configured in SSM: {GITHUB_PAT_PARAM}")

    try:
        repo_response = ssm.get_parameter(Name=GITHUB_REPO_PARAM)
        repo = repo_response['Parameter']['Value']
    except ClientError as e:
        logger.error(f"Failed to retrieve GitHub repo from SSM ({GITHUB_REPO_PARAM}): {e}")
        raise ValueError(f"GitHub repo not configured in SSM: {GITHUB_REPO_PARAM}")

    _github_config_cache = {'pat': pat, 'repo': repo}
    logger.info(f"GitHub config loaded: repo={repo}")
    return _github_config_cache


def _github_api_request(
    method: str,
    path: str,
    body: Optional[Dict[str, Any]] = None,
    pat: Optional[str] = None
) -> Tuple[int, Any]:
    """
    Make a GitHub API request.

    Args:
        method: HTTP method (GET, PUT, POST, DELETE)
        path: API path (e.g., /repos/owner/repo/contents/file.sql)
        body: Request body (will be JSON-encoded)
        pat: GitHub PAT (if None, fetched from SSM)

    Returns:
        Tuple of (status_code, response_body)
    """
    if pat is None:
        config = _get_github_config()
        pat = config['pat']

    url = f"{GITHUB_API_BASE}{path}"
    data = json.dumps(body).encode('utf-8') if body else None

    request = Request(
        url,
        data=data,
        headers={
            'Authorization': f'token {pat}',
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': 'CRM-Demo-FailureSimulator',
        },
        method=method,
    )

    try:
        with urlopen(request, timeout=15) as response:
            response_body = json.loads(response.read().decode('utf-8'))
            return response.status, response_body
    except HTTPError as e:
        error_body = e.read().decode('utf-8') if e.fp else '{}'
        try:
            error_body = json.loads(error_body)
        except json.JSONDecodeError:
            pass
        logger.warning(f"GitHub API {method} {path} returned {e.code}: {error_body}")
        return e.code, error_body


# ============================================================================
# File Push Helpers
# ============================================================================

def _push_file(
    repo: str,
    file_path: str,
    content: str,
    commit_message: str,
    pat: str,
    branch: str = 'main'
) -> Dict[str, Any]:
    """
    Push a file to a GitHub repository via the Contents API.

    If the file already exists, it will be updated (requires the current SHA).
    If it doesn't exist, it will be created.

    Args:
        repo: Repository in owner/repo format
        file_path: Path within the repo (e.g., src/migrations/optimize-queries.sql)
        content: File content (will be base64-encoded)
        commit_message: Git commit message
        pat: GitHub PAT
        branch: Target branch (default: main)

    Returns:
        dict with push result details
    """
    # Check if file already exists to get its SHA
    existing_sha = None
    status, response = _github_api_request(
        'GET',
        f'/repos/{repo}/contents/{file_path}?ref={branch}',
        pat=pat,
    )
    if status == 200 and isinstance(response, dict):
        existing_sha = response.get('sha')
        logger.info(f"File {file_path} exists, SHA={existing_sha}")

    # Build the request body
    body: Dict[str, Any] = {
        'message': commit_message,
        'content': base64.b64encode(content.encode('utf-8')).decode('utf-8'),
        'branch': branch,
    }
    if existing_sha:
        body['sha'] = existing_sha

    # Push the file
    status, response = _github_api_request(
        'PUT',
        f'/repos/{repo}/contents/{file_path}',
        body=body,
        pat=pat,
    )

    if status in (200, 201):
        commit_sha = response.get('commit', {}).get('sha', 'unknown')
        logger.info(f"Successfully pushed {file_path} to {repo} (commit: {commit_sha})")
        return {
            'success': True,
            'file': file_path,
            'commitSha': commit_sha,
            'action': 'updated' if existing_sha else 'created',
        }
    else:
        logger.error(f"Failed to push {file_path} to {repo}: {status} {response}")
        return {
            'success': False,
            'file': file_path,
            'error': str(response),
            'statusCode': status,
        }


# ============================================================================
# Public API — Called by admin_handler.py
# ============================================================================

def push_bad_rds_commit() -> Dict[str, Any]:
    """
    Push the "bad migration" SQL file to GitHub.
    This creates the audit trail for the RDS Index Drop scenario.

    Non-fatal: returns success=False on failure but does not raise.
    """
    try:
        config = _get_github_config()
        result = _push_file(
            repo=config['repo'],
            file_path=MIGRATION_FILE_PATH,
            content=BAD_MIGRATION_SQL,
            commit_message=BAD_COMMIT_MESSAGE,
            pat=config['pat'],
        )
        return result
    except Exception as e:
        logger.warning(f"Failed to push bad RDS commit (non-fatal): {e}")
        return {'success': False, 'error': str(e)}


def push_good_rds_commit() -> Dict[str, Any]:
    """
    Push the "fix" SQL file to GitHub.
    This creates the rollback audit trail for the RDS Index Drop scenario.

    Non-fatal: returns success=False on failure but does not raise.
    """
    try:
        config = _get_github_config()
        result = _push_file(
            repo=config['repo'],
            file_path=MIGRATION_FILE_PATH,
            content=GOOD_MIGRATION_SQL,
            commit_message=GOOD_COMMIT_MESSAGE,
            pat=config['pat'],
        )
        return result
    except Exception as e:
        logger.warning(f"Failed to push good RDS commit (non-fatal): {e}")
        return {'success': False, 'error': str(e)}


# ============================================================================
# Lambda Scenario — GitHub Push Functions
# ============================================================================

def push_bad_lambda_commit() -> Dict[str, Any]:
    """
    Push the "bad refactor" Lambda code to GitHub.
    The code references a missing ./config/pipeline-rules module.

    Non-fatal: returns success=False on failure but does not raise.
    """
    try:
        config = _get_github_config()
        result = _push_file(
            repo=config['repo'],
            file_path=LAMBDA_FILE_PATH,
            content=BAD_LAMBDA_CODE,
            commit_message=BAD_LAMBDA_COMMIT_MESSAGE,
            pat=config['pat'],
        )
        return result
    except Exception as e:
        logger.warning(f"Failed to push bad Lambda commit (non-fatal): {e}")
        return {'success': False, 'error': str(e)}


def push_good_lambda_commit() -> Dict[str, Any]:
    """
    Push the "fix" Lambda code to GitHub — reverts to inline rule definitions.

    Non-fatal: returns success=False on failure but does not raise.
    """
    try:
        config = _get_github_config()
        result = _push_file(
            repo=config['repo'],
            file_path=LAMBDA_FILE_PATH,
            content=GOOD_LAMBDA_CODE,
            commit_message=GOOD_LAMBDA_COMMIT_MESSAGE,
            pat=config['pat'],
        )
        return result
    except Exception as e:
        logger.warning(f"Failed to push good Lambda commit (non-fatal): {e}")
        return {'success': False, 'error': str(e)}


# ============================================================================
# SQS Scenario — GitHub Push Functions
# ============================================================================

def push_bad_sqs_commit() -> Dict[str, Any]:
    """
    Push the "bad config" SQS consumer code to GitHub.
    The code has an aggressive timeout that causes all messages to fail.

    Non-fatal: returns success=False on failure but does not raise.
    """
    try:
        config = _get_github_config()
        result = _push_file(
            repo=config['repo'],
            file_path=SQS_CONSUMER_FILE_PATH,
            content=BAD_SQS_CODE,
            commit_message=BAD_SQS_COMMIT_MESSAGE,
            pat=config['pat'],
        )
        return result
    except Exception as e:
        logger.warning(f"Failed to push bad SQS commit (non-fatal): {e}")
        return {'success': False, 'error': str(e)}


def push_good_sqs_commit() -> Dict[str, Any]:
    """
    Push the "fix" SQS consumer code to GitHub — restores standard timeout.

    Non-fatal: returns success=False on failure but does not raise.
    """
    try:
        config = _get_github_config()
        result = _push_file(
            repo=config['repo'],
            file_path=SQS_CONSUMER_FILE_PATH,
            content=GOOD_SQS_CODE,
            commit_message=GOOD_SQS_COMMIT_MESSAGE,
            pat=config['pat'],
        )
        return result
    except Exception as e:
        logger.warning(f"Failed to push good SQS commit (non-fatal): {e}")
        return {'success': False, 'error': str(e)}


def ensure_scenario_workflows() -> Dict[str, Any]:
    """
    Ensure GitHub Actions workflow files exist in the repo.
    Pushes the db-migration and deploy-queue-consumer workflows if they don't already exist.

    Non-fatal: failures are logged but do not raise.
    """
    results = {}
    try:
        config = _get_github_config()

        workflows = {
            'run-db-migration': {
                'path': '.github/workflows/run-db-migration.yml',
                'content': DB_MIGRATION_WORKFLOW,
                'message': 'ci: add database migration workflow',
            },
            'deploy-queue-consumer': {
                'path': '.github/workflows/deploy-queue-consumer.yml',
                'content': DEPLOY_QUEUE_CONSUMER_WORKFLOW,
                'message': 'ci: add queue consumer deployment workflow',
            },
        }

        for name, wf in workflows.items():
            status, response = _github_api_request(
                'GET',
                f'/repos/{config["repo"]}/contents/{wf["path"]}?ref=main',
                pat=config['pat'],
            )
            if status == 200:
                logger.info(f"Workflow {wf['path']} already exists, skipping")
                results[name] = {'exists': True, 'pushed': False}
            else:
                push_result = _push_file(
                    repo=config['repo'],
                    file_path=wf['path'],
                    content=wf['content'],
                    commit_message=wf['message'],
                    pat=config['pat'],
                )
                results[name] = push_result

    except Exception as e:
        logger.warning(f"Failed to ensure scenario workflows (non-fatal): {e}")
        results['error'] = str(e)

    return results


def validate_github_config() -> Dict[str, Any]:
    """
    Validate that GitHub credentials are configured and working.

    Returns:
        dict with validation results
    """
    try:
        config = _get_github_config()
    except ValueError as e:
        return {'configured': False, 'error': str(e)}

    # Validate PAT by calling /user
    status, user_data = _github_api_request('GET', '/user', pat=config['pat'])
    if status != 200:
        return {'configured': True, 'valid': False, 'error': 'PAT is invalid or expired'}

    # Validate repo access
    status, repo_data = _github_api_request(
        'GET',
        f'/repos/{config["repo"]}',
        pat=config['pat'],
    )
    if status != 200:
        return {
            'configured': True,
            'valid': False,
            'error': f'Cannot access repo {config["repo"]}',
            'user': user_data.get('login'),
        }

    return {
        'configured': True,
        'valid': True,
        'user': user_data.get('login'),
        'repo': config['repo'],
        'repoFullName': repo_data.get('full_name'),
    }


def get_github_status() -> Dict[str, Any]:
    """
    Get the current GitHub integration status for the UI.
    """
    try:
        validation = validate_github_config()
        return {
            'success': True,
            **validation,
        }
    except Exception as e:
        return {
            'success': False,
            'configured': False,
            'error': str(e),
        }
