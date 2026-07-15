"""
Main Lambda handler for CRM API Gateway proxy.

This Lambda function serves as the entry point for all CRM API requests.
It routes requests to appropriate entity handlers, enhances responses with S3 image URLs,
applies CORS headers, and handles exceptions with proper error formatting.

Requirements: 1.1, 1.2, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 9.1, 10.1
"""

import json
import logging
import os
import time
import random
from typing import Dict, Any, Optional, Tuple
import boto3
from botocore.exceptions import ClientError

# Import handler modules
from router import parse_api_gateway_event, validate_route, get_operation_type
from db_connection import get_database_connection, return_database_connection
from handlers import accounts_handler, opportunities_handler, team_members_handler, industries_handler, admin_handler
from s3_integration import enhance_with_images
from cors_handler import process_cors
from error_handler import (
    handle_validation_error,
    handle_not_found_error,
    handle_conflict_error,
    handle_database_error,
    handle_server_error,
    parse_database_error
)

# CloudWatch client for custom metrics
cloudwatch = boto3.client('cloudwatch')

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)


# ============================================================================
# Failure Injection Logic
# ============================================================================

def check_failure_scenarios() -> Dict[str, Any]:
    """
    Check which failure scenarios are currently enabled.
    Also checks for and auto-disables expired scenarios.
    
    Returns:
        Dictionary with scenario names as keys and their config as values
    """
    try:
        # This will also check and disable expired scenarios
        status = admin_handler.get_system_status()
        if not status:
            return {}
            
        scenarios = status.get('scenarios', {})
        if not scenarios:
            return {}
        
        # Filter to only return enabled scenarios
        enabled_scenarios = {}
        for name, config in scenarios.items():
            if isinstance(config, dict) and config.get('enabled', False):
                enabled_scenarios[name] = config
        
        return enabled_scenarios
    except Exception as e:
        logger.warning(f"Failed to check failure scenarios: {e}")
        return {}


def should_inject_failure(scenario_name: str, scenarios: Dict[str, Any]) -> Tuple[bool, str]:
    """
    Determine if a failure should be injected based on scenario config.
    
    Args:
        scenario_name: Name of the failure scenario
        scenarios: Dictionary of enabled scenarios
        
    Returns:
        Tuple of (should_inject, severity)
    """
    scenario = scenarios.get(scenario_name, {})
    if not scenario.get('enabled', False):
        return False, 'moderate'
    
    severity = scenario.get('severity', 'moderate')
    
    # Probability based on severity
    probability_map = {
        'severe': 1.0,      # Always fail
        'high': 0.8,        # 80% chance
        'moderate': 0.5,    # 50% chance
        'light': 0.3,       # 30% chance
        'low': 0.1          # 10% chance
    }
    
    probability = probability_map.get(severity, 0.5)
    return random.random() < probability, severity


def inject_failure_if_enabled(
    route_info,
    operation: str,
    scenarios: Dict[str, Any]
) -> Optional[Dict[str, Any]]:
    """
    Check enabled failure scenarios and inject realistic failures during CRM operations.
    
    Note: The CRM app primarily performs read operations (list, get, search).
    All failure scenarios are triggered on these read operations to demonstrate
    realistic error conditions during normal app usage.
    
    Args:
        route_info: Parsed route information
        operation: Operation type (list, get, create, update, delete)
        scenarios: Dictionary of enabled failure scenarios
        
    Returns:
        Error response dict if failure should be injected, None otherwise
    """
    resource_type = route_info.resource_type
    resource_id = route_info.resource_id
    
    # Lambda Failed Deployment - invokes the event processor Lambda as a post-processing step.
    # When the broken code is deployed, this invocation fails and the error propagates
    # back through the API Gateway response — exactly like a real broken deployment.
    # A broken deployment always fails — no probability check needed.
    lambda_scenario = scenarios.get('lambdaFailedDeployment', {})
    if lambda_scenario.get('enabled', False):
        target_lambda_arn = os.environ.get('TARGET_LAMBDA_ARN', '')
        if target_lambda_arn:
            function_name = target_lambda_arn.split(':')[-1]
            try:
                _lambda = boto3.client('lambda')
                invoke_response = _lambda.invoke(
                    FunctionName=function_name,
                    InvocationType='RequestResponse',
                    Payload=json.dumps({
                        'source': 'crm.api',
                        'operation': operation,
                        'resource': resource_type,
                        'resourceId': resource_id,
                        'timestamp': __import__('datetime').datetime.utcnow().isoformat(),
                    }),
                )
                # Check if the function itself errored
                if invoke_response.get('FunctionError'):
                    error_payload = json.loads(invoke_response['Payload'].read().decode('utf-8'))
                    error_msg = error_payload.get('errorMessage', 'Event processor invocation failed')
                    error_type = error_payload.get('errorType', 'RuntimeError')
                    admin_handler.log_failure_error(
                        'lambdaFailedDeployment',
                        error_type,
                        f"Event processor failed during {resource_type} {operation}: {error_msg}",
                        {
                            'service': 'AWS Lambda',
                            'functionName': function_name,
                            'operation': operation,
                            'resource': resource_type,
                            'resourceId': resource_id,
                            'errorType': error_type,
                        }
                    )
                    raise Exception(f"Event processor error: {error_msg}")
            except ClientError as e:
                admin_handler.log_failure_error(
                    'lambdaFailedDeployment',
                    'InvocationError',
                    f"Failed to invoke event processor during {resource_type} {operation}: {str(e)}",
                    {
                        'service': 'AWS Lambda',
                        'functionName': function_name,
                        'operation': operation,
                        'resource': resource_type,
                    }
                )
                raise Exception(f"Event processor invocation failed: {str(e)}")
    
    # SQS Backlog Spike - logs realistic message processing failures
    should_fail, severity = should_inject_failure('sqsBacklogSpike', scenarios)
    if should_fail:
        import random
        queue_depth = random.randint(80, 350)
        oldest_msg_age = random.randint(120, 600)
        admin_handler.log_failure_error(
            'sqsBacklogSpike',
            'MessageProcessingFailure',
            f"ERROR: Async notification for {resource_type} {operation} failed to enqueue. "
            f"Queue depth: {queue_depth} messages. Oldest message age: {oldest_msg_age}s. "
            f"Consumer Lambda returning errors — messages not being acknowledged.",
            {
                'service': 'Amazon SQS',
                'operation': operation,
                'resource': resource_type,
                'resourceId': resource_id,
                'queueUrl': admin_handler.NOTIFICATION_QUEUE_URL,
                'approximateQueueDepth': queue_depth,
                'oldestMessageAgeSec': oldest_msg_age,
                'consumerErrorRate': '100%',
                'impact': 'Stage-change notifications, lead assignments, and follow-up emails delayed',
                'dlqMessages': random.randint(5, 40),
            }
        )
    
    # RDS Index Drop - indexes are actually dropped, so queries will naturally be slower
    # Emit realistic application-level warnings that a real CRM would log
    should_fail, severity = should_inject_failure('rdsIndexDrop', scenarios)
    if should_fail:
        import time as _time
        import random
        # Simulate the latency a user request would experience
        simulated_latency = random.randint(800, 4500)
        if simulated_latency > 3000:
            admin_handler.log_failure_error(
                'rdsIndexDrop',
                'RequestTimeout',
                f"ERROR: {resource_type.upper()} {operation} request timed out after {simulated_latency}ms. "
                f"Database query exceeded response deadline. "
                f"User received: 'Something went wrong. Please try again.'",
                {
                    'service': 'Amazon RDS',
                    'operation': operation,
                    'resource': resource_type,
                    'resourceId': resource_id,
                    'latencyMs': simulated_latency,
                    'endpoint': f'GET /{resource_type}' + (f'/{resource_id}' if resource_id else ''),
                    'cause': 'Sequential scan — missing index on filter column',
                    'httpStatus': 504,
                    'userImpact': 'Page load failed',
                }
            )
        else:
            admin_handler.log_failure_error(
                'rdsIndexDrop',
                'HighLatency',
                f"WARN: {resource_type.upper()} {operation} responded in {simulated_latency}ms (SLA: 500ms). "
                f"Database performing sequential scan due to missing index. "
                f"Page load degraded for end user.",
                {
                    'service': 'Amazon RDS',
                    'operation': operation,
                    'resource': resource_type,
                    'resourceId': resource_id,
                    'latencyMs': simulated_latency,
                    'slaThresholdMs': 500,
                    'endpoint': f'GET /{resource_type}' + (f'/{resource_id}' if resource_id else ''),
                    'cause': 'Sequential scan — missing index on filter column',
                    'queryPlan': 'Seq Scan',
                }
            )
    
    return None


def handle_admin_route(route_info, event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Handle admin routes for failure simulator.
    
    Args:
        route_info: Parsed route information
        event: Original API Gateway event
        
    Returns:
        Response dictionary
    """
    path = route_info.path
    method = route_info.http_method
    body = route_info.body
    query_params = route_info.query_params
    
    # Extract user ID and display name from Cognito claims
    user_id = 'system'
    user_display_name = 'system'
    claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
    if claims:
        user_id = claims.get('sub', 'system')
        # Try to get a display name: preferred_username > email > cognito:username > sub
        user_display_name = (
            claims.get('preferred_username')
            or claims.get('email')
            or claims.get('cognito:username')
            or user_id
        )
        # For federated users (e.g., "Amazon_alias"), extract the alias
        if user_display_name and user_display_name.startswith('Amazon_'):
            user_display_name = user_display_name.split('_', 1)[1]
        logger.info(f"User claims: sub={user_id}, display_name={user_display_name}, available_keys={list(claims.keys())}")
    
    severity = body.get('severity', 'moderate') if body else 'moderate'
    # Frontend can pass the display name explicitly (extracted from Cognito on the client side)
    if body and body.get('userDisplayName'):
        user_display_name = body['userDisplayName']
    
    try:
        # System status endpoint
        if path == '/admin/system-status' and method == 'GET':
            return admin_handler.get_system_status()
        
        # Failure events endpoint (CloudWatch Logs)
        if path == '/admin/failure-events' and method == 'GET':
            start_time = query_params.get('startTime')
            end_time = query_params.get('endTime')
            limit = query_params.get('limit', '50')
            
            return admin_handler.get_failure_events(
                start_time=int(start_time) if start_time else None,
                end_time=int(end_time) if end_time else None,
                limit=int(limit)
            )
        
        # Metrics endpoint (CloudWatch Metrics)
        if path == '/admin/metrics' or path == '/metrics':
            if method == 'GET':
                start_time = query_params.get('startTime')
                end_time = query_params.get('endTime')
                return admin_handler.get_metrics(start_time, end_time)
        
        # Invoke event processor endpoint (for generating CloudWatch metrics)
        if path == '/admin/invoke-target' and method == 'POST':
            count = body.get('count', 5) if body else 5
            return admin_handler.invoke_target_lambda(count)
        
        # Trigger RDS queries endpoint (for generating RDS metrics when indexes are dropped)
        if path == '/admin/trigger-rds-queries' and method == 'POST':
            count = body.get('count', 5) if body else 5
            return admin_handler.trigger_rds_queries(count)
        
        # GitHub integration endpoints
        if path == '/admin/github/status' and method == 'GET':
            from handlers.github_handler import get_github_status
            return get_github_status()
        
        if path == '/admin/github/validate' and method == 'POST':
            from handlers.github_handler import validate_github_config
            return validate_github_config()
        
        if path == '/admin/github/ensure-workflows' and method == 'POST':
            from handlers.github_handler import ensure_scenario_workflows
            return ensure_scenario_workflows()
        
        # Failure scenario endpoints
        if '/admin/failures/' in path:
            scenario = path.split('/admin/failures/')[-1].replace('-', '_')
            scenario = ''.join(word.capitalize() if i > 0 else word 
                             for i, word in enumerate(scenario.split('_')))
            # Convert to camelCase (e.g., sqs_backlog_spike -> sqsBacklogSpike)
            scenario = scenario[0].lower() + scenario[1:] if scenario else scenario
            
            if method == 'POST':
                if 'sqs' in path.lower() and 'backlog' in path.lower():
                    return admin_handler.enable_sqs_backlog_spike(severity, user_id, user_display_name)
                elif 'lambda' in path.lower() and 'deployment' in path.lower():
                    return admin_handler.enable_lambda_failed_deployment(severity, user_id, user_display_name)
                elif 'rds' in path.lower() and 'index' in path.lower():
                    return admin_handler.enable_rds_index_drop(severity, user_id, user_display_name)
            
            elif method == 'DELETE':
                if 'sqs' in path.lower() and 'backlog' in path.lower():
                    return admin_handler.disable_sqs_backlog_spike(user_id)
                elif 'lambda' in path.lower() and 'deployment' in path.lower():
                    return admin_handler.disable_lambda_failed_deployment(user_id)
                elif 'rds' in path.lower() and 'index' in path.lower():
                    return admin_handler.disable_rds_index_drop(user_id)
        
        return {'success': False, 'message': f'Unknown admin route: {path}'}
    
    except Exception as e:
        logger.error(f"Error handling admin route {path}: {e}", exc_info=True)
        return {'success': False, 'error': str(e), 'message': f'Failed to handle admin route: {path}'}


def _handle_sqs_background_drip(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Background self-invocation handler that continuously sends 1-2 messages
    every 5 seconds to the SQS queue while the sqsBacklogSpike scenario is enabled.
    Each invocation runs for ~100 seconds then re-invokes itself.
    """
    import time as _time

    scenarios = check_failure_scenarios()
    sqs_status = scenarios.get('sqsBacklogSpike', {})
    if not sqs_status.get('enabled'):
        logger.info("SQS background drip: scenario no longer enabled, stopping.")
        return {'stopped': True, 'reason': 'scenario_disabled'}

    iteration = event.get('_iteration', 0)
    queue_url = os.environ.get('NOTIFICATION_QUEUE_URL', '')
    if not queue_url:
        return {'stopped': True, 'reason': 'no_queue_url'}

    logger.info(f"SQS background drip: iteration {iteration}, sending messages...")
    sqs = boto3.client('sqs')
    messages_sent = 0

    start_wall = _time.time()
    msg_index = iteration * 1000  # offset to avoid ID collisions
    # Run for ~100 seconds, sending 1-2 messages every 5 seconds
    while (_time.time() - start_wall) < 100:
        try:
            count = random.choice([1, 2])
            entries = []
            for i in range(count):
                msg_index += 1
                entries.append({
                    'Id': str(msg_index),
                    'MessageBody': json.dumps({
                        'type': 'account_update',
                        'accountId': f'acc-{msg_index:04d}',
                        'timestamp': _time.strftime('%Y-%m-%dT%H:%M:%SZ', _time.gmtime()),
                        'field': 'industry_id',
                        'updatedBy': 'crm-sync-service',
                    })
                })
            sqs.send_message_batch(QueueUrl=queue_url, Entries=entries)
            messages_sent += count
        except Exception as e:
            logger.debug(f"SQS drip send error: {e}")
        _time.sleep(5)

    logger.info(f"SQS background drip: sent {messages_sent} messages in iteration {iteration}")

    # Re-check and re-invoke if still enabled
    scenarios = check_failure_scenarios()
    sqs_status = scenarios.get('sqsBacklogSpike', {})
    if sqs_status.get('enabled'):
        try:
            function_name = os.environ.get('AWS_LAMBDA_FUNCTION_NAME', '')
            if function_name:
                _lambda = boto3.client('lambda')
                _lambda.invoke(
                    FunctionName=function_name,
                    InvocationType='Event',
                    Payload=json.dumps({
                        '_sqsBackgroundDrip': True,
                        '_iteration': iteration + 1
                    })
                )
                logger.info(f"SQS background drip: scheduled iteration {iteration + 1}")
        except Exception as e:
            logger.error(f"Failed to re-invoke for SQS background drip: {e}")
    else:
        logger.info("SQS background drip: scenario disabled, not re-invoking.")

    return {'messagesSent': messages_sent, 'iteration': iteration}


def _handle_rds_background_queries(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Background self-invocation handler that continuously runs heavy queries
    against RDS while the rdsIndexDrop scenario is enabled.
    Each invocation runs queries for ~100 seconds then re-invokes itself.
    """
    import time as _time

    # Check if scenario is still enabled
    scenarios = check_failure_scenarios()
    rds_status = scenarios.get('rdsIndexDrop', {})
    if not rds_status.get('enabled'):
        logger.info("RDS background queries: scenario no longer enabled, stopping.")
        return {'stopped': True, 'reason': 'scenario_disabled'}

    iteration = event.get('_iteration', 0)
    logger.info(f"RDS background queries: iteration {iteration}, running heavy queries...")

    queries_run = 0
    total_time_ms = 0

    try:
        from db_connection import get_database_connection, return_database_connection
        conn = get_database_connection()
        if not conn:
            logger.warning("RDS background queries: no DB connection available")
            return {'stopped': True, 'reason': 'no_connection'}

        try:
            cursor = conn.cursor()
            # Aggressive queries: cross joins, full scans, sorts, aggregations
            heavy_queries = [
                "SELECT * FROM opportunities WHERE stage = 'Qualified'",
                "SELECT * FROM accounts WHERE industry_id = 'Technology'",
                "SELECT * FROM opportunities ORDER BY amount DESC",
                "SELECT * FROM accounts ORDER BY name",
                "SELECT a.*, COUNT(o.id) as opp_count FROM accounts a LEFT JOIN opportunities o ON a.id = o.account_id GROUP BY a.id",
                "SELECT o.*, a.name FROM opportunities o LEFT JOIN accounts a ON o.account_id = a.id",
                "SELECT a.id, a.name, SUM(o.amount) FROM accounts a CROSS JOIN opportunities o GROUP BY a.id, a.name",
                "SELECT DISTINCT o1.stage, o2.stage FROM opportunities o1, opportunities o2 WHERE o1.owner_id = o2.owner_id",
                "SELECT o1.id, o2.id, o1.amount + o2.amount FROM opportunities o1 CROSS JOIN opportunities o2 WHERE o1.id != o2.id",
                "SELECT a1.name, a2.name FROM accounts a1 CROSS JOIN accounts a2 WHERE a1.industry_id = a2.industry_id AND a1.id != a2.id",
                "SELECT * FROM opportunities o1 WHERE amount > (SELECT AVG(amount) FROM opportunities o2 WHERE o2.stage = o1.stage)",
                "SELECT a.*, (SELECT COUNT(*) FROM opportunities o WHERE o.account_id = a.id) as cnt, (SELECT SUM(amount) FROM opportunities o WHERE o.account_id = a.id) as total FROM accounts a",
            ]

            start_wall = _time.time()
            # Run for ~100 seconds to maximize CPU pressure, leave 20s headroom
            slow_query_count = 0
            timeout_count = 0
            while (_time.time() - start_wall) < 100:
                query = heavy_queries[queries_run % len(heavy_queries)]
                try:
                    q_start = _time.time()
                    cursor.execute(query)
                    cursor.fetchall()
                    elapsed_ms = (_time.time() - q_start) * 1000
                    queries_run += 1
                    total_time_ms += elapsed_ms

                    # Emit realistic application-level logs based on query latency
                    if elapsed_ms > 5000:
                        timeout_count += 1
                        admin_handler.log_failure_error(
                            'rdsIndexDrop',
                            'QueryTimeout',
                            f"ERROR: Query execution exceeded 5000ms threshold ({elapsed_ms:.0f}ms). "
                            f"Connection returned to pool. Client received HTTP 504 Gateway Timeout.",
                            {
                                'service': 'Amazon RDS',
                                'queryLatencyMs': round(elapsed_ms, 1),
                                'threshold': 5000,
                                'table': query.split('FROM ')[1].split(' ')[0] if 'FROM ' in query else 'unknown',
                                'queryPlan': 'Seq Scan (no usable index)',
                                'connectionPool': 'active=5/5, idle=0, waiting=3',
                                'httpStatus': 504,
                            }
                        )
                    elif elapsed_ms > 2000:
                        slow_query_count += 1
                        if slow_query_count % 5 == 1:  # Log every 5th to avoid flooding
                            admin_handler.log_failure_error(
                                'rdsIndexDrop',
                                'SlowQuery',
                                f"WARN: Slow query detected — {elapsed_ms:.0f}ms (threshold: 2000ms). "
                                f"Sequential scan on table without index. "
                                f"Affected endpoint: GET /opportunities or GET /accounts.",
                                {
                                    'service': 'Amazon RDS',
                                    'queryLatencyMs': round(elapsed_ms, 1),
                                    'threshold': 2000,
                                    'table': query.split('FROM ')[1].split(' ')[0] if 'FROM ' in query else 'unknown',
                                    'queryPlan': 'Seq Scan (missing index)',
                                    'rowsScanned': 'full table',
                                    'impact': 'API response time degraded',
                                }
                            )
                    elif elapsed_ms > 500:
                        slow_query_count += 1
                        if slow_query_count % 15 == 1:  # Log less frequently for moderate slowness
                            admin_handler.log_failure_error(
                                'rdsIndexDrop',
                                'HighLatency',
                                f"WARN: Query latency elevated — {elapsed_ms:.0f}ms (baseline: <50ms). "
                                f"Database CPU utilization increasing. Connection pool pressure building.",
                                {
                                    'service': 'Amazon RDS',
                                    'queryLatencyMs': round(elapsed_ms, 1),
                                    'baselineLatencyMs': 50,
                                    'degradationFactor': f"{elapsed_ms / 50:.0f}x baseline",
                                    'impact': 'User-facing latency increased',
                                }
                            )
                except Exception as qe:
                    logger.debug(f"RDS background query error: {qe}")
                    queries_run += 1

            cursor.close()
        finally:
            return_database_connection(conn)
    except Exception as e:
        logger.error(f"RDS background queries error: {e}")

    avg_ms = total_time_ms / queries_run if queries_run > 0 else 0
    logger.info(f"RDS background queries: ran {queries_run} queries, avg {avg_ms:.0f}ms")

    # Re-check if still enabled before re-invoking
    scenarios = check_failure_scenarios()
    rds_status = scenarios.get('rdsIndexDrop', {})
    if rds_status.get('enabled'):
        try:
            function_name = os.environ.get('AWS_LAMBDA_FUNCTION_NAME', '')
            if function_name:
                _lambda = boto3.client('lambda')
                _lambda.invoke(
                    FunctionName=function_name,
                    InvocationType='Event',
                    Payload=json.dumps({
                        '_rdsBackgroundQueries': True,
                        '_iteration': iteration + 1
                    })
                )
                logger.info(f"RDS background queries: scheduled iteration {iteration + 1}")
        except Exception as e:
            logger.error(f"Failed to re-invoke for RDS background queries: {e}")
    else:
        logger.info("RDS background queries: scenario disabled, not re-invoking.")

    return {'queriesRun': queries_run, 'avgMs': round(avg_ms, 1), 'iteration': iteration}


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Main Lambda handler entry point for API Gateway requests.
    
    This function:
    1. Parses the API Gateway event to determine route and operation
    2. Validates the route
    3. Checks for enabled failure scenarios and injects failures
    4. Establishes database connection
    5. Invokes the appropriate entity handler
    6. Enhances response with S3 image URLs
    7. Applies CORS headers
    8. Handles exceptions and formats error responses
    
    Args:
        event: API Gateway event dictionary
        context: Lambda context object
        
    Returns:
        API Gateway response dictionary with statusCode, headers, and body
        
    Requirements: 1.1, 1.2, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 9.1, 10.1
    """
    request_id = context.aws_request_id if context else "unknown"
    logger.info(f"Processing request {request_id}: {event.get('httpMethod')} {event.get('path')}")
    
    try:
        # Handle background RDS query self-invocation
        if event.get('_rdsBackgroundQueries'):
            return _handle_rds_background_queries(event, context)
        
        # Handle background SQS message drip self-invocation
        if event.get('_sqsBackgroundDrip'):
            return _handle_sqs_background_drip(event, context)
        
        # Handle CORS preflight requests
        if event.get('httpMethod') == 'OPTIONS':
            return process_cors(event)
        
        # Parse API Gateway event to extract route information
        route_info = parse_api_gateway_event(event)
        
        # Validate route
        validate_route(route_info)
        
        # Handle admin routes separately (no database connection needed)
        if route_info.resource_type == 'admin':
            result = handle_admin_route(route_info, event)
            response = {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps(result, default=str)
            }
            return process_cors(event, response)

        # Handle slack routes separately (no database connection needed)
        if route_info.resource_type == 'slack':
            from handlers.slack_handler import handle_slack_route
            result = handle_slack_route(route_info, event)
            response = {
                'statusCode': result.get('statusCode', 200),
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps(result.get('body', result), default=str)
            }
            return process_cors(event, response)
        
        # Get operation type
        operation = get_operation_type(route_info)
        
        # Check for enabled failure scenarios and inject failures for CRM operations
        scenarios = check_failure_scenarios()
        if scenarios:
            inject_failure_if_enabled(route_info, operation, scenarios)
        
        # Get database connection
        connection = get_database_connection()
        
        try:
            # Start timing for search operations
            start_time = time.time()
            
            # Route to appropriate handler and execute operation
            result = execute_operation(connection, route_info, operation)
            
            # Calculate and publish query latency metrics
            elapsed_time = (time.time() - start_time) * 1000  # Convert to milliseconds
            
            # Publish QueryLatency metric for ALL database operations
            try:
                cloudwatch.put_metric_data(
                    Namespace='CRM/Database',
                    MetricData=[
                        {
                            'MetricName': 'QueryLatency',
                            'Value': elapsed_time,
                            'Unit': 'Milliseconds',
                            'Dimensions': [
                                {'Name': 'Resource', 'Value': route_info.resource_type},
                                {'Name': 'Operation', 'Value': operation}
                            ]
                        }
                    ]
                )
            except Exception as e:
                logger.warning(f"Failed to publish QueryLatency metric: {str(e)}")
            
            # Publish SearchLatency metric for search operations
            is_search_operation = (
                route_info.resource_type == 'opportunities' and 
                (route_info.query_params.get('search') or 
                 route_info.query_params.get('q') or 
                 route_info.path.endswith('/search'))
            )
            if is_search_operation:
                try:
                    cloudwatch.put_metric_data(
                        Namespace='CRM/Database',
                        MetricData=[
                            {
                                'MetricName': 'SearchLatency',
                                'Value': elapsed_time,
                                'Unit': 'Milliseconds',
                                'Dimensions': [
                                    {'Name': 'QueryType', 'Value': 'FullTextSearch'},
                                    {'Name': 'Resource', 'Value': 'opportunities'}
                                ]
                            }
                        ]
                    )
                    logger.info(f"Published SearchLatency metric: {elapsed_time:.2f}ms")
                except Exception as e:
                    logger.warning(f"Failed to publish SearchLatency metric: {str(e)}")
            
            # Format successful response
            response = format_success_response(result, route_info, operation)
        finally:
            # Return database connection to pool
            return_database_connection(connection)
        
        # Apply CORS headers
        response = process_cors(event, response)
        
        logger.info(f"Request {request_id} completed successfully with status {response['statusCode']}")
        return response
        
    except ValueError as e:
        # Validation errors (400)
        logger.warning(f"Validation error in request {request_id}: {str(e)}")
        response = handle_validation_error(str(e))
        return process_cors(event, response)
        
    except Exception as e:
        # Check if it's a custom error message from handlers
        error_str = str(e)
        
        # Not found errors (404)
        if "not found" in error_str.lower():
            resource_type = route_info.resource_type if 'route_info' in locals() else "Resource"
            resource_id = route_info.resource_id if 'route_info' in locals() else "unknown"
            response = handle_not_found_error(resource_type.capitalize(), resource_id)
            return process_cors(event, response)
        
        # Conflict errors (409)
        if "cannot delete" in error_str.lower() or "already exists" in error_str.lower():
            response = handle_conflict_error(error_str)
            return process_cors(event, response)
        
        # Database errors (500)
        if "database" in error_str.lower() or "failed to" in error_str.lower():
            response = parse_database_error(e)
            return process_cors(event, response)
        
        # Generic server error (500)
        logger.error(f"Unexpected error in request {request_id}: {str(e)}", exc_info=True)
        response = handle_server_error(e, request_id)
        return process_cors(event, response)


def execute_operation(connection, route_info, operation: str) -> Any:
    """
    Execute the appropriate CRUD operation based on route information.
    
    Args:
        connection: Database connection object
        route_info: Parsed route information
        operation: Operation type ('list', 'get', 'create', 'update', 'delete')
        
    Returns:
        Operation result (record, list of records, or boolean)
        
    Raises:
        ValueError: If resource type or operation is not supported
    """
    resource_type = route_info.resource_type
    resource_id = route_info.resource_id
    query_params = route_info.query_params
    body = route_info.body
    
    logger.info(f"Executing {operation} operation on {resource_type}")
    
    # Route to accounts handler
    if resource_type == 'accounts':
        if operation == 'list':
            return accounts_handler.list_accounts(connection)
        elif operation == 'get':
            result = accounts_handler.get_account(connection, resource_id)
            if result is None:
                raise ValueError(f"Account with id {resource_id} not found")
            return result
        elif operation == 'create':
            return accounts_handler.create_account(connection, body)
        elif operation == 'update':
            result = accounts_handler.update_account(connection, resource_id, body)
            if result is None:
                raise ValueError(f"Account with id {resource_id} not found")
            return result
        elif operation == 'delete':
            success = accounts_handler.delete_account(connection, resource_id)
            if not success:
                raise ValueError(f"Account with id {resource_id} not found")
            return None
    
    # Route to opportunities handler
    elif resource_type == 'opportunities':
        account_id = query_params.get('accountId')
        search_query = query_params.get('search') or query_params.get('q')  # Support both 'search' and 'q' parameters
        
        # Check if this is a search endpoint (/opportunities/search)
        is_search_endpoint = route_info.path.endswith('/search')
        
        if operation == 'list' or is_search_endpoint:
            # If search query is provided, perform search instead of list
            if search_query:
                return opportunities_handler.search_opportunities(connection, search_query, account_id)
            else:
                return opportunities_handler.list_opportunities(connection, account_id)
        elif operation == 'get':
            result = opportunities_handler.get_opportunity(connection, resource_id)
            if result is None:
                raise ValueError(f"Opportunity with id {resource_id} not found")
            return result
        elif operation == 'create':
            return opportunities_handler.create_opportunity(connection, body)
        elif operation == 'update':
            result = opportunities_handler.update_opportunity(connection, resource_id, body)
            if result is None:
                raise ValueError(f"Opportunity with id {resource_id} not found")
            return result
        elif operation == 'delete':
            success = opportunities_handler.delete_opportunity(connection, resource_id)
            if not success:
                raise ValueError(f"Opportunity with id {resource_id} not found")
            return None
    
    # Route to team members handler
    elif resource_type == 'team-members':
        if operation == 'list':
            return team_members_handler.list_team_members(connection)
        elif operation == 'get':
            result = team_members_handler.get_team_member(connection, resource_id)
            if result is None:
                raise ValueError(f"Team member with id {resource_id} not found")
            return result
        elif operation == 'create':
            return team_members_handler.create_team_member(connection, body)
        elif operation == 'update':
            result = team_members_handler.update_team_member(connection, resource_id, body)
            if result is None:
                raise ValueError(f"Team member with id {resource_id} not found")
            return result
        elif operation == 'delete':
            success = team_members_handler.delete_team_member(connection, resource_id)
            if not success:
                raise ValueError(f"Team member with id {resource_id} not found")
            return None
    
    # Route to industries handler
    elif resource_type == 'industries':
        if operation == 'list':
            return industries_handler.list_industries(connection)
        elif operation == 'get':
            result = industries_handler.get_industry(connection, resource_id)
            if result is None:
                raise ValueError(f"Industry with id {resource_id} not found")
            return result
        else:
            raise ValueError(f"Industries resource only supports GET operations")
    
    # Route to admin handler (no database connection needed)
    elif resource_type == 'admin':
        return None  # Admin routes handled separately
    
    else:
        raise ValueError(f"Unsupported resource type: {resource_type}")


def format_success_response(result: Any, route_info, operation: str) -> Dict[str, Any]:
    """
    Format successful operation result into API Gateway response.
    
    Args:
        result: Operation result (record, list of records, or None for delete)
        route_info: Parsed route information
        operation: Operation type
        
    Returns:
        API Gateway response dictionary
    """
    resource_type = route_info.resource_type
    
    # Determine status code based on operation
    if operation == 'create':
        status_code = 201
    elif operation == 'delete':
        status_code = 204
    else:
        status_code = 200
    
    # For delete operations, return empty response
    if operation == 'delete':
        return {
            'statusCode': status_code,
            'headers': {
                'Content-Type': 'application/json'
            },
            'body': ''
        }
    
    # Enhance result with S3 image URLs
    entity_type_map = {
        'accounts': 'account',
        'opportunities': 'opportunity',
        'team-members': 'team_member',
        'industries': 'industry'
    }
    entity_type = entity_type_map.get(resource_type, resource_type)
    
    enhanced_result = enhance_with_images(result, entity_type)
    
    # Format response body
    response = {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json'
        },
        'body': json.dumps(enhanced_result)
    }
    
    return response
