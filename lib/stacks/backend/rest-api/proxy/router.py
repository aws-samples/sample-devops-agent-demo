"""
Request routing and parsing module for API Gateway events.
Handles route parsing, parameter extraction, and request routing to appropriate entity handlers.
"""

import json
import logging
import re
from typing import Dict, Any, Optional, Tuple

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)


class RouteInfo:
    """
    Container for parsed route information from API Gateway event.
    """
    def __init__(
        self,
        resource_type: str,
        http_method: str,
        resource_id: Optional[str] = None,
        query_params: Optional[Dict[str, str]] = None,
        body: Optional[Dict[str, Any]] = None,
        path: Optional[str] = None
    ):
        self.resource_type = resource_type
        self.http_method = http_method
        self.resource_id = resource_id
        self.query_params = query_params or {}
        self.body = body or {}
        self.path = path or ""
    
    def __repr__(self):
        return (f"RouteInfo(resource_type={self.resource_type}, "
                f"http_method={self.http_method}, "
                f"resource_id={self.resource_id}, "
                f"query_params={self.query_params})")


def parse_api_gateway_event(event: Dict[str, Any]) -> RouteInfo:
    """
    Parse API Gateway event to extract routing information.
    
    Extracts:
    - HTTP method (GET, POST, PUT, DELETE)
    - Resource path and type (accounts, opportunities, team-members, industries)
    - Path parameters (entity ID)
    - Query parameters (filters like accountId)
    - Request body (JSON payload)
    
    Args:
        event: API Gateway event dictionary
    
    Returns:
        RouteInfo: Parsed route information
    
    Raises:
        ValueError: If the event cannot be parsed or route is invalid
    
    Example event paths:
        - GET /accounts -> list all accounts
        - GET /accounts/123 -> get account with ID 123
        - POST /accounts -> create new account
        - PUT /accounts/123 -> update account with ID 123
        - DELETE /accounts/123 -> delete account with ID 123
        - GET /opportunities?accountId=123 -> list opportunities filtered by account
    """
    try:
        # Extract HTTP method
        http_method = event.get('httpMethod', '').upper()
        if not http_method:
            raise ValueError("HTTP method not found in event")
        
        # Extract path
        path = event.get('path', '')
        if not path:
            raise ValueError("Path not found in event")
        
        logger.info(f"Parsing route: {http_method} {path}")
        
        # Extract resource type and ID from path
        resource_type, resource_id = _parse_path(path)
        
        # Extract query parameters
        query_params = _extract_query_parameters(event)
        
        # Extract and parse request body
        body = _parse_request_body(event)
        
        route_info = RouteInfo(
            resource_type=resource_type,
            http_method=http_method,
            resource_id=resource_id,
            query_params=query_params,
            body=body,
            path=path
        )
        
        logger.info(f"Parsed route: {route_info}")
        return route_info
        
    except Exception as e:
        logger.error(f"Failed to parse API Gateway event: {str(e)}")
        raise ValueError(f"Failed to parse API Gateway event: {str(e)}")


def _parse_path(path: str) -> Tuple[str, Optional[str]]:
    """
    Parse the path to extract resource type and optional resource ID.
    
    Supported paths:
        - /accounts -> (accounts, None)
        - /accounts/123 -> (accounts, 123)
        - /opportunities -> (opportunities, None)
        - /opportunities/456 -> (opportunities, 456)
        - /team-members -> (team-members, None)
        - /team-members/789 -> (team-members, 789)
        - /industries -> (industries, None)
        - /industries/tech -> (industries, tech)
    
    Args:
        path: URL path from API Gateway event
    
    Returns:
        Tuple of (resource_type, resource_id)
    
    Raises:
        ValueError: If path format is invalid or resource type is not supported
    """
    # Remove leading/trailing slashes and split
    path = path.strip('/')
    parts = path.split('/')
    
    if len(parts) == 0 or not parts[0]:
        raise ValueError("Invalid path: empty or root path")
    
    # First part is the resource type
    resource_type = parts[0]
    
    # Validate resource type
    valid_resources = ['accounts', 'opportunities', 'team-members', 'industries', 'admin', 'metrics']
    if resource_type not in valid_resources:
        raise ValueError(f"Invalid resource type: {resource_type}. "
                        f"Must be one of: {', '.join(valid_resources)}")
    
    # Second part (if exists) is the resource ID or special operation
    resource_id = None
    if len(parts) > 1:
        second_part = parts[1]
        if not second_part:
            raise ValueError("Invalid path: resource ID is empty")
        
        # Handle special operations like /opportunities/search
        if second_part == 'search':
            # For search operations, we don't set resource_id
            # The search logic will be handled by query parameters
            resource_id = None
        else:
            resource_id = second_part
    
    # Validate no extra path segments (except for admin routes which can have more)
    if len(parts) > 2 and resource_type != 'admin':
        raise ValueError(f"Invalid path: too many segments. Expected format: /{resource_type} or /{resource_type}/{{id}} or /{resource_type}/search")
    
    return resource_type, resource_id


def _extract_query_parameters(event: Dict[str, Any]) -> Dict[str, str]:
    """
    Extract query string parameters from API Gateway event.
    
    Args:
        event: API Gateway event dictionary
    
    Returns:
        Dictionary of query parameters (empty dict if none)
    
    Example:
        Event with queryStringParameters: {"accountId": "123", "status": "active"}
        Returns: {"accountId": "123", "status": "active"}
    """
    query_params = event.get('queryStringParameters') or {}
    
    # API Gateway may return None for queryStringParameters if no params present
    if query_params is None:
        query_params = {}
    
    logger.info(f"Extracted query parameters: {query_params}")
    return query_params


def _parse_request_body(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Parse and validate JSON request body from API Gateway event.
    
    Args:
        event: API Gateway event dictionary
    
    Returns:
        Parsed JSON body as dictionary (empty dict if no body)
    
    Raises:
        ValueError: If body is present but not valid JSON
    """
    body_str = event.get('body')
    
    # No body is valid for GET and DELETE requests
    if not body_str:
        return {}
    
    # Handle base64 encoded body (if API Gateway is configured that way)
    is_base64 = event.get('isBase64Encoded', False)
    if is_base64:
        import base64
        body_str = base64.b64decode(body_str).decode('utf-8')
    
    # Parse JSON
    try:
        body = json.loads(body_str)
        logger.info(f"Parsed request body with {len(body)} fields")
        return body
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse JSON body: {str(e)}")
        raise ValueError(f"Invalid JSON in request body: {str(e)}")


def route_request(route_info: RouteInfo) -> str:
    """
    Determine which entity handler should process the request.
    
    Args:
        route_info: Parsed route information
    
    Returns:
        Handler name (e.g., 'accounts', 'opportunities', 'team-members', 'industries')
    
    Raises:
        ValueError: If resource type is not supported
    """
    resource_type = route_info.resource_type
    
    # Map resource types to handler names
    handler_map = {
        'accounts': 'accounts',
        'opportunities': 'opportunities',
        'team-members': 'team-members',
        'industries': 'industries',
        'admin': 'admin',
        'metrics': 'admin'
    }
    
    handler = handler_map.get(resource_type)
    if not handler:
        raise ValueError(f"No handler found for resource type: {resource_type}")
    
    logger.info(f"Routing to handler: {handler}")
    return handler


def validate_route(route_info: RouteInfo) -> None:
    """
    Validate that the route is valid for the given HTTP method and resource type.
    
    Validation rules:
    - GET requests can be with or without resource ID
    - POST requests must not have resource ID (creating new resource)
    - PUT requests must have resource ID (updating existing resource)
    - DELETE requests must have resource ID (deleting existing resource)
    - Industries only support GET operations (read-only)
    - Admin routes have custom validation
    
    Args:
        route_info: Parsed route information
    
    Raises:
        ValueError: If the route is invalid for the HTTP method
    """
    method = route_info.http_method
    resource_type = route_info.resource_type
    resource_id = route_info.resource_id
    
    # Admin routes have custom validation - skip standard validation
    if resource_type in ('admin',):
        logger.info(f"Route validation passed for {resource_type} route: {method} {route_info.path}")
        return
    
    # Industries are read-only
    if resource_type == 'industries' and method not in ['GET', 'OPTIONS']:
        raise ValueError(f"Industries resource only supports GET operations, got {method}")
    
    # POST should not have resource ID (creating new resource)
    if method == 'POST' and resource_id is not None:
        raise ValueError(f"POST requests should not include resource ID in path")
    
    # PUT and DELETE must have resource ID
    if method in ['PUT', 'DELETE'] and resource_id is None:
        raise ValueError(f"{method} requests must include resource ID in path")
    
    # GET can be with or without ID (list all or get single)
    # No validation needed for GET
    
    logger.info(f"Route validation passed for {method} {resource_type}")


def get_operation_type(route_info: RouteInfo) -> str:
    """
    Determine the CRUD operation type based on HTTP method and resource ID.
    
    Args:
        route_info: Parsed route information
    
    Returns:
        Operation type: 'list', 'get', 'create', 'update', or 'delete'
    """
    method = route_info.http_method
    has_id = route_info.resource_id is not None
    
    operation_map = {
        ('GET', False): 'list',      # GET /accounts
        ('GET', True): 'get',         # GET /accounts/123
        ('POST', False): 'create',    # POST /accounts
        ('PUT', True): 'update',      # PUT /accounts/123
        ('DELETE', True): 'delete',   # DELETE /accounts/123
    }
    
    operation = operation_map.get((method, has_id))
    if not operation:
        raise ValueError(f"Invalid combination: {method} with {'ID' if has_id else 'no ID'}")
    
    logger.info(f"Operation type: {operation}")
    return operation
