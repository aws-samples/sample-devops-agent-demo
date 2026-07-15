"""
Error handling module for CRM API Gateway Lambda proxy.

Provides consistent error response formatting and handling for various error types:
- Validation errors (400)
- Not found errors (404)
- Conflict errors (409)
- Database/server errors (500)
"""

import json
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def format_error_response(
    status_code: int,
    error_code: str,
    message: str,
    details: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Format a consistent error response for API Gateway.
    
    Args:
        status_code: HTTP status code (400, 404, 409, 500, etc.)
        error_code: Machine-readable error code (e.g., 'VALIDATION_ERROR')
        message: Human-readable error message
        details: Optional dictionary with additional error context
        
    Returns:
        API Gateway response dictionary with statusCode, headers, and body
        
    Requirements: 9.1, 9.2, 9.3, 9.4
    """
    error_body = {
        "error": {
            "code": error_code,
            "message": message
        }
    }
    
    if details:
        error_body["error"]["details"] = details
    
    # Log error with appropriate level
    if status_code >= 500:
        logger.error(f"Server error: {error_code} - {message}", extra={"details": details})
    elif status_code >= 400:
        logger.warning(f"Client error: {error_code} - {message}", extra={"details": details})
    
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",  # Will be overridden by CORS handler
            "Access-Control-Allow-Credentials": "true"
        },
        "body": json.dumps(error_body)
    }


def handle_validation_error(message: str, field: Optional[str] = None, details: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Handle validation errors with 400 status and field-specific messages.
    
    Args:
        message: Human-readable validation error message
        field: Optional field name that failed validation
        details: Optional additional validation error details
        
    Returns:
        API Gateway response dictionary
        
    Requirements: 9.1
    """
    error_details = details or {}
    if field:
        error_details["field"] = field
    
    return format_error_response(
        status_code=400,
        error_code="VALIDATION_ERROR",
        message=message,
        details=error_details if error_details else None
    )


def handle_not_found_error(resource_type: str, resource_id: str) -> Dict[str, Any]:
    """
    Handle not found errors with 404 status and descriptive messages.
    
    Args:
        resource_type: Type of resource (e.g., 'Account', 'Opportunity')
        resource_id: ID of the resource that was not found
        
    Returns:
        API Gateway response dictionary
        
    Requirements: 9.2
    """
    message = f"{resource_type} with id {resource_id} not found"
    
    return format_error_response(
        status_code=404,
        error_code="NOT_FOUND",
        message=message,
        details={"resourceType": resource_type, "resourceId": resource_id}
    )


def handle_conflict_error(message: str, conflict_type: Optional[str] = None, details: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Handle conflict errors (foreign key violations) with 409 status.
    
    Args:
        message: Human-readable conflict error message
        conflict_type: Optional type of conflict (e.g., 'FOREIGN_KEY_VIOLATION', 'UNIQUE_CONSTRAINT')
        details: Optional additional conflict details
        
    Returns:
        API Gateway response dictionary
        
    Requirements: 9.3
    """
    error_details = details or {}
    if conflict_type:
        error_details["conflictType"] = conflict_type
    
    return format_error_response(
        status_code=409,
        error_code="CONFLICT",
        message=message,
        details=error_details if error_details else None
    )


def handle_database_error(original_error: Exception, request_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Handle database errors with 500 status without exposing internal details.
    
    Args:
        original_error: The original exception that occurred
        request_id: Optional request ID for tracking
        
    Returns:
        API Gateway response dictionary
        
    Requirements: 9.4
    """
    # Log the full error for debugging
    logger.error(
        f"Database error occurred: {str(original_error)}",
        exc_info=True,
        extra={"requestId": request_id}
    )
    
    # Return generic message to client (no internal details)
    details = {}
    if request_id:
        details["requestId"] = request_id
    
    return format_error_response(
        status_code=500,
        error_code="DATABASE_ERROR",
        message="An internal database error occurred. Please try again later.",
        details=details if details else None
    )


def handle_server_error(original_error: Exception, request_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Handle general server errors with 500 status without exposing internal details.
    
    Args:
        original_error: The original exception that occurred
        request_id: Optional request ID for tracking
        
    Returns:
        API Gateway response dictionary
        
    Requirements: 9.4
    """
    # Log the full error for debugging
    logger.error(
        f"Server error occurred: {str(original_error)}",
        exc_info=True,
        extra={"requestId": request_id}
    )
    
    # Return generic message to client (no internal details)
    details = {}
    if request_id:
        details["requestId"] = request_id
    
    return format_error_response(
        status_code=500,
        error_code="INTERNAL_SERVER_ERROR",
        message="An internal server error occurred. Please try again later.",
        details=details if details else None
    )


def parse_database_error(error: Exception) -> Dict[str, Any]:
    """
    Parse database errors to determine specific error type and return appropriate response.
    
    Args:
        error: Database exception
        
    Returns:
        API Gateway response dictionary
    """
    error_str = str(error).lower()
    
    # Foreign key violation
    if "foreign key" in error_str or "violates foreign key constraint" in error_str:
        if "account" in error_str:
            message = "Cannot delete account because it has associated opportunities"
            conflict_type = "FOREIGN_KEY_VIOLATION"
        elif "team_member" in error_str or "owner" in error_str:
            message = "Cannot delete team member because they own accounts or opportunities"
            conflict_type = "FOREIGN_KEY_VIOLATION"
        else:
            message = "Cannot perform operation due to existing relationships"
            conflict_type = "FOREIGN_KEY_VIOLATION"
        
        return handle_conflict_error(message, conflict_type)
    
    # Unique constraint violation
    if "unique" in error_str or "duplicate" in error_str:
        if "email" in error_str:
            message = "A team member with this email already exists"
            conflict_type = "UNIQUE_CONSTRAINT"
        else:
            message = "A record with this value already exists"
            conflict_type = "UNIQUE_CONSTRAINT"
        
        return handle_conflict_error(message, conflict_type)
    
    # Not null violation
    if "not null" in error_str or "null value" in error_str:
        message = "Required field is missing"
        return handle_validation_error(message)
    
    # Default to generic database error
    return handle_database_error(error)
