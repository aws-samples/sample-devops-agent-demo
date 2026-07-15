"""
CORS (Cross-Origin Resource Sharing) handling module for CRM API Gateway Lambda proxy.

Provides CORS validation and header management:
- Validates request origins against allowed origins list
- Adds appropriate CORS headers to all responses
- Handles preflight OPTIONS requests
- Allows credentials in cross-origin requests
- Returns 403 error for unauthorized origins

Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
"""

import json
import logging
import os
from typing import Dict, Any, List, Optional

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def get_allowed_origins() -> List[str]:
    """
    Retrieve allowed origins from environment variable.
    
    Returns:
        List of allowed origin URLs
        
    Requirements: 10.1
    """
    allowed_origins_str = os.environ.get('ALLOWED_ORIGINS', '["*"]')
    try:
        allowed_origins = json.loads(allowed_origins_str)
        if not isinstance(allowed_origins, list):
            logger.warning(f"ALLOWED_ORIGINS is not a list, defaulting to ['*']")
            return ["*"]
        return allowed_origins
    except json.JSONDecodeError:
        logger.warning(f"Failed to parse ALLOWED_ORIGINS, defaulting to ['*']")
        return ["*"]


def validate_origin(origin: Optional[str], allowed_origins: List[str]) -> bool:
    """
    Validate if the request origin is in the allowed origins list.
    
    Args:
        origin: The origin from the request headers
        allowed_origins: List of allowed origin URLs
        
    Returns:
        True if origin is allowed, False otherwise
        
    Requirements: 10.1
    """
    if not origin:
        # No origin header means same-origin request or non-browser client
        return True
    
    # Wildcard allows all origins
    if "*" in allowed_origins:
        return True
    
    # Check if origin is in allowed list
    return origin in allowed_origins


def get_cors_origin(origin: Optional[str], allowed_origins: List[str]) -> str:
    """
    Determine the appropriate CORS origin header value.
    
    Args:
        origin: The origin from the request headers
        allowed_origins: List of allowed origin URLs
        
    Returns:
        The origin to use in Access-Control-Allow-Origin header
        
    Requirements: 10.2
    """
    if not origin:
        # No origin header, use first allowed origin or wildcard
        return allowed_origins[0] if allowed_origins else "*"
    
    # Wildcard allows all origins
    if "*" in allowed_origins:
        return "*"
    
    # Return the specific origin if allowed
    if origin in allowed_origins:
        return origin
    
    # Default to first allowed origin if origin not allowed
    return allowed_origins[0] if allowed_origins else "*"


def add_cors_headers(response: Dict[str, Any], origin: Optional[str], allowed_origins: List[str]) -> Dict[str, Any]:
    """
    Add appropriate CORS headers to the response.
    
    Args:
        response: API Gateway response dictionary
        origin: The origin from the request headers
        allowed_origins: List of allowed origin URLs
        
    Returns:
        Response dictionary with CORS headers added
        
    Requirements: 10.2, 10.4
    """
    if "headers" not in response:
        response["headers"] = {}
    
    cors_origin = get_cors_origin(origin, allowed_origins)
    
    # Add CORS headers
    response["headers"]["Access-Control-Allow-Origin"] = cors_origin
    response["headers"]["Access-Control-Allow-Credentials"] = "true"
    response["headers"]["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response["headers"]["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token"
    response["headers"]["Access-Control-Max-Age"] = "3600"
    
    return response


def handle_preflight_request(origin: Optional[str], allowed_origins: List[str]) -> Dict[str, Any]:
    """
    Handle preflight OPTIONS requests for CORS.
    
    Args:
        origin: The origin from the request headers
        allowed_origins: List of allowed origin URLs
        
    Returns:
        API Gateway response dictionary for preflight request
        
    Requirements: 10.3
    """
    # Validate origin for preflight
    if not validate_origin(origin, allowed_origins):
        return create_forbidden_response(origin)
    
    cors_origin = get_cors_origin(origin, allowed_origins)
    
    response = {
        "statusCode": 200,
        "headers": {
            "Access-Control-Allow-Origin": cors_origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token",
            "Access-Control-Max-Age": "3600",
            "Content-Type": "application/json"
        },
        "body": json.dumps({"message": "CORS preflight successful"})
    }
    
    return response


def create_forbidden_response(origin: Optional[str]) -> Dict[str, Any]:
    """
    Create a 403 Forbidden response for unauthorized origins.
    
    Args:
        origin: The unauthorized origin
        
    Returns:
        API Gateway response dictionary with 403 status
        
    Requirements: 10.5
    """
    logger.warning(f"Unauthorized origin attempted access: {origin}")
    
    response = {
        "statusCode": 403,
        "headers": {
            "Content-Type": "application/json"
        },
        "body": json.dumps({
            "error": {
                "code": "FORBIDDEN",
                "message": "Origin not allowed",
                "details": {
                    "origin": origin
                }
            }
        })
    }
    
    return response


def process_cors(event: Dict[str, Any], response: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Main CORS processing function that handles both preflight and regular requests.
    
    Args:
        event: API Gateway event dictionary
        response: Optional response dictionary to add CORS headers to
        
    Returns:
        API Gateway response dictionary with CORS handling applied
        
    Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
    """
    # Get allowed origins from environment
    allowed_origins = get_allowed_origins()
    
    # Extract origin from request headers
    headers = event.get("headers", {})
    origin = headers.get("origin") or headers.get("Origin")
    
    # Get HTTP method
    http_method = event.get("httpMethod", "").upper()
    
    # Handle preflight OPTIONS request
    if http_method == "OPTIONS":
        return handle_preflight_request(origin, allowed_origins)
    
    # Validate origin for non-preflight requests
    if not validate_origin(origin, allowed_origins):
        return create_forbidden_response(origin)
    
    # Add CORS headers to existing response
    if response:
        return add_cors_headers(response, origin, allowed_origins)
    
    # If no response provided, return a default response with CORS headers
    default_response = {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json"
        },
        "body": json.dumps({"message": "OK"})
    }
    return add_cors_headers(default_response, origin, allowed_origins)
