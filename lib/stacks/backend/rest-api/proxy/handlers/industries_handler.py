"""
Industries handler module for read operations on industry entities.
Handles database operations and field mapping between snake_case and camelCase.
"""

import logging
from typing import Dict, Any, List, Optional
import psycopg2
from psycopg2.extras import RealDictCursor

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)


def _map_industry_to_api_format(db_record: Dict[str, Any]) -> Dict[str, Any]:
    """
    Map database snake_case columns to camelCase API response fields.
    
    Args:
        db_record: Database record with snake_case column names
    
    Returns:
        Dictionary with camelCase field names for API response
    """
    return {
        'id': db_record.get('id'),
        'name': db_record.get('name'),
        'description': db_record.get('description'),
        'iconUrl': db_record.get('icon_url')
    }


def list_industries(connection) -> List[Dict[str, Any]]:
    """
    Query all industries from the database ordered by name.
    
    Args:
        connection: Database connection object
    
    Returns:
        List of industry dictionaries in API format
    
    Raises:
        Exception: If database query fails
    """
    try:
        logger.info("Listing all industries")
        
        cursor = connection.cursor(cursor_factory=RealDictCursor)
        
        query = """
            SELECT 
                id, name, description
            FROM industries
            ORDER BY name ASC
        """
        
        cursor.execute(query)
        records = cursor.fetchall()
        cursor.close()
        
        # Map to API format
        industries = [_map_industry_to_api_format(dict(record)) for record in records]
        
        logger.info(f"Retrieved {len(industries)} industries")
        return industries
        
    except psycopg2.Error as e:
        logger.error(f"Database error listing industries: {str(e)}")
        raise Exception(f"Failed to list industries: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error listing industries: {str(e)}")
        raise


def get_industry(connection, industry_id: str) -> Optional[Dict[str, Any]]:
    """
    Query a single industry by ID from the database.
    
    Args:
        connection: Database connection object
        industry_id: Industry ID to retrieve
    
    Returns:
        Industry dictionary in API format, or None if not found
    
    Raises:
        Exception: If database query fails
    """
    try:
        logger.info(f"Getting industry with ID: {industry_id}")
        
        cursor = connection.cursor(cursor_factory=RealDictCursor)
        
        query = """
            SELECT 
                id, name, description
            FROM industries
            WHERE id = %s
        """
        
        cursor.execute(query, (industry_id,))
        record = cursor.fetchone()
        cursor.close()
        
        if not record:
            logger.info(f"Industry not found: {industry_id}")
            return None
        
        # Map to API format
        industry = _map_industry_to_api_format(dict(record))
        
        logger.info(f"Retrieved industry: {industry_id}")
        return industry
        
    except psycopg2.Error as e:
        logger.error(f"Database error getting industry {industry_id}: {str(e)}")
        raise Exception(f"Failed to get industry: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error getting industry {industry_id}: {str(e)}")
        raise
