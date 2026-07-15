"""
Database connection module for RDS Postgres integration.
Handles connection pooling, credential retrieval, and connection reuse across Lambda invocations.
"""

import os
import json
import logging
from typing import Optional
import boto3
import psycopg2
from psycopg2 import pool
from botocore.exceptions import ClientError

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Global connection pool (persists across Lambda invocations)
_connection_pool: Optional[psycopg2.pool.SimpleConnectionPool] = None
_db_credentials: Optional[dict] = None


def _get_database_credentials() -> dict:
    """
    Retrieve database credentials from AWS Secrets Manager.
    Caches credentials in memory for reuse across invocations.
    
    Returns:
        dict: Database credentials containing username, password, host, port, dbname
    
    Raises:
        Exception: If credentials cannot be retrieved from Secrets Manager
    """
    global _db_credentials
    
    # Return cached credentials if available
    if _db_credentials is not None:
        logger.info("Using cached database credentials")
        return _db_credentials
    
    secret_arn = os.environ.get('DATABASE_SECRET_ARN')
    if not secret_arn:
        raise ValueError("DATABASE_SECRET_ARN environment variable not set")
    
    logger.info(f"Retrieving database credentials from Secrets Manager: {secret_arn}")
    
    try:
        # Create Secrets Manager client
        session = boto3.session.Session()
        client = session.client(service_name='secretsmanager')
        
        # Retrieve secret value
        response = client.get_secret_value(SecretId=secret_arn)
        
        # Parse secret string
        secret_string = response['SecretString']
        secret_dict = json.loads(secret_string)
        
        # Extract credentials
        database_proxy_endpoint = os.environ.get('DATABASE_PROXY_ENDPOINT')
        database_name = os.environ.get('DATABASE_NAME')
        
        if not database_proxy_endpoint or not database_name:
            raise ValueError("DATABASE_PROXY_ENDPOINT or DATABASE_NAME environment variable not set")
        
        _db_credentials = {
            'username': secret_dict.get('username'),
            'password': secret_dict.get('password'),
            'host': database_proxy_endpoint,
            'port': secret_dict.get('port', 5432),
            'dbname': database_name
        }
        
        logger.info(f"Successfully retrieved credentials for database: {database_name}")
        return _db_credentials
        
    except ClientError as e:
        logger.error(f"Failed to retrieve database credentials: {str(e)}")
        raise Exception(f"Failed to retrieve database credentials: {str(e)}")
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse secret JSON: {str(e)}")
        raise Exception(f"Failed to parse secret JSON: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error retrieving credentials: {str(e)}")
        raise


def _initialize_connection_pool() -> psycopg2.pool.SimpleConnectionPool:
    """
    Initialize the database connection pool.
    Creates a pool with min 1 and max 5 connections.
    
    Returns:
        SimpleConnectionPool: Initialized connection pool
    
    Raises:
        Exception: If connection pool cannot be created
    """
    global _connection_pool
    
    # Return existing pool if available
    if _connection_pool is not None:
        logger.info("Using existing connection pool")
        return _connection_pool
    
    logger.info("Initializing new connection pool")
    
    try:
        # Get database credentials
        credentials = _get_database_credentials()
        
        # Create connection pool
        _connection_pool = psycopg2.pool.SimpleConnectionPool(
            minconn=1,
            maxconn=5,
            user=credentials['username'],
            password=credentials['password'],
            host=credentials['host'],
            port=credentials['port'],
            database=credentials['dbname'],
            connect_timeout=10
        )
        
        logger.info("Connection pool initialized successfully")
        return _connection_pool
        
    except psycopg2.Error as e:
        logger.error(f"Failed to create connection pool: {str(e)}")
        raise Exception(f"Failed to create connection pool: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error initializing connection pool: {str(e)}")
        raise


def get_database_connection():
    """
    Get a database connection from the connection pool.
    Implements connection pooling and reuse across Lambda invocations.
    
    This function should be called to obtain a connection for database operations.
    The connection is retrieved from a pool that persists across Lambda invocations,
    providing better performance and resource utilization.
    
    Returns:
        psycopg2.connection: Database connection object
    
    Raises:
        Exception: If connection cannot be obtained from the pool
    
    Example:
        conn = get_database_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM accounts")
            results = cursor.fetchall()
        finally:
            return_database_connection(conn)
    """
    try:
        # Initialize pool if needed
        pool = _initialize_connection_pool()
        
        # Get connection from pool
        connection = pool.getconn()
        
        if connection is None:
            raise Exception("Failed to get connection from pool")
        
        # Test connection is alive
        try:
            cursor = connection.cursor()
            cursor.execute("SELECT 1")
            cursor.close()
        except psycopg2.Error:
            # Connection is dead, close it and get a new one
            logger.warning("Connection test failed, getting new connection")
            pool.putconn(connection, close=True)
            connection = pool.getconn()
        
        logger.info("Database connection obtained successfully")
        return connection
        
    except Exception as e:
        logger.error(f"Failed to get database connection: {str(e)}")
        raise Exception(f"Failed to get database connection: {str(e)}")


def return_database_connection(connection) -> None:
    """
    Return a database connection to the pool.
    Should be called after database operations are complete.
    
    Args:
        connection: Database connection to return to the pool
    """
    global _connection_pool
    
    if _connection_pool is not None and connection is not None:
        try:
            _connection_pool.putconn(connection)
            logger.info("Database connection returned to pool")
        except Exception as e:
            logger.error(f"Failed to return connection to pool: {str(e)}")


def close_all_connections() -> None:
    """
    Close all connections in the pool.
    Should be called during Lambda shutdown or for cleanup.
    """
    global _connection_pool
    
    if _connection_pool is not None:
        try:
            _connection_pool.closeall()
            _connection_pool = None
            logger.info("All database connections closed")
        except Exception as e:
            logger.error(f"Failed to close connections: {str(e)}")
