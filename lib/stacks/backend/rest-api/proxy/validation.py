"""
Validation module for CRM API request data.
Validates required fields, data types, and enum values for all entity types.
"""

import re
from typing import Dict, Any, List, Optional


# Define allowed enum values based on database schema
HEALTH_STATUS_VALUES = ['Green', 'Yellow', 'Red']
OPPORTUNITY_STAGE_VALUES = ['Launched', 'Qualified', 'Proof of Concept', 'Negotiation', 'Closed Won', 'Closed Lost']
FORECAST_CATEGORY_VALUES = ['Pipeline', 'Best Case', 'Commit', 'Closed']

# Email validation regex pattern
EMAIL_PATTERN = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')


class ValidationError(Exception):
    """Custom exception for validation errors with field-specific details."""
    
    def __init__(self, message: str, field: Optional[str] = None):
        self.message = message
        self.field = field
        super().__init__(self.message)


def validate_account(data: Dict[str, Any], is_update: bool = False) -> None:
    """
    Validate account data against schema requirements.
    
    Args:
        data: Account data in API format (camelCase)
        is_update: If True, required fields are optional (partial update)
    
    Raises:
        ValidationError: If validation fails with field-specific details
    """
    # Required fields for creation
    required_fields = ['name', 'domain', 'industry', 'annualRevenue', 'employeeCount', 
                      'ownerId', 'healthStatus', 'healthScore']
    
    if not is_update:
        for field in required_fields:
            if field not in data or data[field] is None:
                raise ValidationError(f"Missing required field: {field}", field=field)
    
    # Validate name
    if 'name' in data:
        if not isinstance(data['name'], str) or not data['name'].strip():
            raise ValidationError("Field 'name' must be a non-empty string", field='name')
        if len(data['name']) > 255:
            raise ValidationError("Field 'name' must not exceed 255 characters", field='name')
    
    # Validate domain
    if 'domain' in data:
        if not isinstance(data['domain'], str) or not data['domain'].strip():
            raise ValidationError("Field 'domain' must be a non-empty string", field='domain')
        if len(data['domain']) > 255:
            raise ValidationError("Field 'domain' must not exceed 255 characters", field='domain')
    
    # Validate industry (industry_id)
    if 'industry' in data:
        if not isinstance(data['industry'], str) or not data['industry'].strip():
            raise ValidationError("Field 'industry' must be a non-empty string", field='industry')
    
    # Validate annualRevenue
    if 'annualRevenue' in data:
        if not isinstance(data['annualRevenue'], (int, float)):
            raise ValidationError("Field 'annualRevenue' must be a number", field='annualRevenue')
        if data['annualRevenue'] < 0:
            raise ValidationError("Field 'annualRevenue' must be non-negative", field='annualRevenue')
    
    # Validate employeeCount
    if 'employeeCount' in data:
        if not isinstance(data['employeeCount'], int):
            raise ValidationError("Field 'employeeCount' must be an integer", field='employeeCount')
        if data['employeeCount'] < 0:
            raise ValidationError("Field 'employeeCount' must be non-negative", field='employeeCount')
    
    # Validate ownerId
    if 'ownerId' in data:
        if not isinstance(data['ownerId'], str) or not data['ownerId'].strip():
            raise ValidationError("Field 'ownerId' must be a non-empty string", field='ownerId')
    
    # Validate healthStatus enum
    if 'healthStatus' in data:
        if data['healthStatus'] not in HEALTH_STATUS_VALUES:
            raise ValidationError(
                f"Field 'healthStatus' must be one of: {', '.join(HEALTH_STATUS_VALUES)}",
                field='healthStatus'
            )
    
    # Validate healthScore
    if 'healthScore' in data:
        if not isinstance(data['healthScore'], int):
            raise ValidationError("Field 'healthScore' must be an integer", field='healthScore')
        if not (0 <= data['healthScore'] <= 100):
            raise ValidationError("Field 'healthScore' must be between 0 and 100", field='healthScore')
    
    # Validate optional fields if present
    if 'ownerName' in data and data['ownerName'] is not None:
        if not isinstance(data['ownerName'], str):
            raise ValidationError("Field 'ownerName' must be a string", field='ownerName')
        if len(data['ownerName']) > 255:
            raise ValidationError("Field 'ownerName' must not exceed 255 characters", field='ownerName')
    
    if 'opportunityCount' in data and data['opportunityCount'] is not None:
        if not isinstance(data['opportunityCount'], int):
            raise ValidationError("Field 'opportunityCount' must be an integer", field='opportunityCount')
        if data['opportunityCount'] < 0:
            raise ValidationError("Field 'opportunityCount' must be non-negative", field='opportunityCount')
    
    if 'totalOpportunityValue' in data and data['totalOpportunityValue'] is not None:
        if not isinstance(data['totalOpportunityValue'], (int, float)):
            raise ValidationError("Field 'totalOpportunityValue' must be a number", field='totalOpportunityValue')
        if data['totalOpportunityValue'] < 0:
            raise ValidationError("Field 'totalOpportunityValue' must be non-negative", field='totalOpportunityValue')
    
    if 'logoUrl' in data and data['logoUrl'] is not None:
        if not isinstance(data['logoUrl'], str):
            raise ValidationError("Field 'logoUrl' must be a string", field='logoUrl')


def validate_opportunity(data: Dict[str, Any], is_update: bool = False) -> None:
    """
    Validate opportunity data against schema requirements.
    
    Args:
        data: Opportunity data in API format (camelCase)
        is_update: If True, required fields are optional (partial update)
    
    Raises:
        ValidationError: If validation fails with field-specific details
    """
    # Required fields for creation
    required_fields = ['name', 'accountId', 'amount', 'closeDate', 'stage', 
                      'forecastCategory', 'ownerId', 'probability']
    
    if not is_update:
        for field in required_fields:
            if field not in data or data[field] is None:
                raise ValidationError(f"Missing required field: {field}", field=field)
    
    # Validate name
    if 'name' in data:
        if not isinstance(data['name'], str) or not data['name'].strip():
            raise ValidationError("Field 'name' must be a non-empty string", field='name')
        if len(data['name']) > 255:
            raise ValidationError("Field 'name' must not exceed 255 characters", field='name')
    
    # Validate accountId (foreign key)
    if 'accountId' in data:
        if not isinstance(data['accountId'], str) or not data['accountId'].strip():
            raise ValidationError("Field 'accountId' must be a non-empty string", field='accountId')
    
    # Validate amount
    if 'amount' in data:
        if not isinstance(data['amount'], (int, float)):
            raise ValidationError("Field 'amount' must be a number", field='amount')
        if data['amount'] < 0:
            raise ValidationError("Field 'amount' must be non-negative", field='amount')
    
    # Validate closeDate (ISO 8601 date string)
    if 'closeDate' in data:
        if not isinstance(data['closeDate'], str) or not data['closeDate'].strip():
            raise ValidationError("Field 'closeDate' must be a non-empty string in ISO 8601 format", field='closeDate')
        # Basic ISO date format validation (YYYY-MM-DD)
        if not re.match(r'^\d{4}-\d{2}-\d{2}', data['closeDate']):
            raise ValidationError("Field 'closeDate' must be in ISO 8601 date format (YYYY-MM-DD)", field='closeDate')
    
    # Validate stage enum
    if 'stage' in data:
        if data['stage'] not in OPPORTUNITY_STAGE_VALUES:
            raise ValidationError(
                f"Field 'stage' must be one of: {', '.join(OPPORTUNITY_STAGE_VALUES)}",
                field='stage'
            )
    
    # Validate forecastCategory enum
    if 'forecastCategory' in data:
        if data['forecastCategory'] not in FORECAST_CATEGORY_VALUES:
            raise ValidationError(
                f"Field 'forecastCategory' must be one of: {', '.join(FORECAST_CATEGORY_VALUES)}",
                field='forecastCategory'
            )
    
    # Validate ownerId (foreign key)
    if 'ownerId' in data:
        if not isinstance(data['ownerId'], str) or not data['ownerId'].strip():
            raise ValidationError("Field 'ownerId' must be a non-empty string", field='ownerId')
    
    # Validate probability
    if 'probability' in data:
        if not isinstance(data['probability'], int):
            raise ValidationError("Field 'probability' must be an integer", field='probability')
        if not (0 <= data['probability'] <= 100):
            raise ValidationError("Field 'probability' must be between 0 and 100", field='probability')
    
    # Validate optional fields if present
    if 'accountName' in data and data['accountName'] is not None:
        if not isinstance(data['accountName'], str):
            raise ValidationError("Field 'accountName' must be a string", field='accountName')
        if len(data['accountName']) > 255:
            raise ValidationError("Field 'accountName' must not exceed 255 characters", field='accountName')
    
    if 'nextStep' in data and data['nextStep'] is not None:
        if not isinstance(data['nextStep'], str):
            raise ValidationError("Field 'nextStep' must be a string", field='nextStep')
    
    if 'recentActivity' in data and data['recentActivity'] is not None:
        if not isinstance(data['recentActivity'], str):
            raise ValidationError("Field 'recentActivity' must be a string", field='recentActivity')
    
    if 'ownerName' in data and data['ownerName'] is not None:
        if not isinstance(data['ownerName'], str):
            raise ValidationError("Field 'ownerName' must be a string", field='ownerName')
        if len(data['ownerName']) > 255:
            raise ValidationError("Field 'ownerName' must not exceed 255 characters", field='ownerName')


def validate_team_member(data: Dict[str, Any], is_update: bool = False) -> None:
    """
    Validate team member data against schema requirements.
    
    Args:
        data: Team member data in API format (camelCase)
        is_update: If True, required fields are optional (partial update)
    
    Raises:
        ValidationError: If validation fails with field-specific details
    """
    # Required fields for creation
    required_fields = ['name', 'email', 'role', 'quota']
    
    if not is_update:
        for field in required_fields:
            if field not in data or data[field] is None:
                raise ValidationError(f"Missing required field: {field}", field=field)
    
    # Validate name
    if 'name' in data:
        if not isinstance(data['name'], str) or not data['name'].strip():
            raise ValidationError("Field 'name' must be a non-empty string", field='name')
        if len(data['name']) > 255:
            raise ValidationError("Field 'name' must not exceed 255 characters", field='name')
    
    # Validate email format
    if 'email' in data:
        if not isinstance(data['email'], str) or not data['email'].strip():
            raise ValidationError("Field 'email' must be a non-empty string", field='email')
        if len(data['email']) > 255:
            raise ValidationError("Field 'email' must not exceed 255 characters", field='email')
        if not EMAIL_PATTERN.match(data['email']):
            raise ValidationError("Field 'email' must be a valid email address", field='email')
    
    # Validate role
    if 'role' in data:
        if not isinstance(data['role'], str) or not data['role'].strip():
            raise ValidationError("Field 'role' must be a non-empty string", field='role')
        if len(data['role']) > 100:
            raise ValidationError("Field 'role' must not exceed 100 characters", field='role')
    
    # Validate quota
    if 'quota' in data:
        if not isinstance(data['quota'], (int, float)):
            raise ValidationError("Field 'quota' must be a number", field='quota')
        if data['quota'] < 0:
            raise ValidationError("Field 'quota' must be non-negative", field='quota')
    
    # Validate optional fields if present
    if 'pipelineValue' in data and data['pipelineValue'] is not None:
        if not isinstance(data['pipelineValue'], (int, float)):
            raise ValidationError("Field 'pipelineValue' must be a number", field='pipelineValue')
        if data['pipelineValue'] < 0:
            raise ValidationError("Field 'pipelineValue' must be non-negative", field='pipelineValue')
    
    if 'closedWonValue' in data and data['closedWonValue'] is not None:
        if not isinstance(data['closedWonValue'], (int, float)):
            raise ValidationError("Field 'closedWonValue' must be a number", field='closedWonValue')
        if data['closedWonValue'] < 0:
            raise ValidationError("Field 'closedWonValue' must be non-negative", field='closedWonValue')
    
    if 'quotaAttainment' in data and data['quotaAttainment'] is not None:
        if not isinstance(data['quotaAttainment'], (int, float)):
            raise ValidationError("Field 'quotaAttainment' must be a number", field='quotaAttainment')
        if data['quotaAttainment'] < 0:
            raise ValidationError("Field 'quotaAttainment' must be non-negative", field='quotaAttainment')
    
    if 'winRate' in data and data['winRate'] is not None:
        if not isinstance(data['winRate'], (int, float)):
            raise ValidationError("Field 'winRate' must be a number", field='winRate')
        if not (0 <= data['winRate'] <= 100):
            raise ValidationError("Field 'winRate' must be between 0 and 100", field='winRate')
    
    if 'opportunityCount' in data and data['opportunityCount'] is not None:
        if not isinstance(data['opportunityCount'], int):
            raise ValidationError("Field 'opportunityCount' must be an integer", field='opportunityCount')
        if data['opportunityCount'] < 0:
            raise ValidationError("Field 'opportunityCount' must be non-negative", field='opportunityCount')
    
    if 'avatarUrl' in data and data['avatarUrl'] is not None:
        if not isinstance(data['avatarUrl'], str):
            raise ValidationError("Field 'avatarUrl' must be a string", field='avatarUrl')
