#!/usr/bin/env python3
"""
Unit test for RDS Index Drop functionality.

This test mocks the database connection to verify the index drop/recreate
SQL commands are executed correctly.

Usage:
    python tools/test-rds-index-drop-unit.py

Requirements:
    uv pip install boto3 psycopg2-binary
"""

import sys
import os
from unittest.mock import MagicMock, patch, call

# Add the proxy directory to the path for imports
PROXY_DIR = os.path.join(os.path.dirname(__file__), '..', 'lib', 'stacks', 'backend', 'rest-api', 'proxy')
HANDLERS_DIR = os.path.join(PROXY_DIR, 'handlers')
sys.path.insert(0, PROXY_DIR)
sys.path.insert(0, HANDLERS_DIR)


def test_index_definitions():
    """Test that index definitions are correct."""
    import admin_handler
    
    expected_indexes = [
        {'name': 'idx_opportunities_owner_id', 'table': 'opportunities', 'column': 'owner_id'},
        {'name': 'idx_opportunities_stage', 'table': 'opportunities', 'column': 'stage'},
        {'name': 'idx_accounts_owner_id', 'table': 'accounts', 'column': 'owner_id'},
        {'name': 'idx_accounts_industry_id', 'table': 'accounts', 'column': 'industry_id'},
    ]
    
    assert admin_handler.RDS_INDEXES == expected_indexes, f"Index definitions mismatch: {admin_handler.RDS_INDEXES}"
    print("✓ Index definitions are correct")


def test_drop_indexes():
    """Test that _drop_indexes executes correct SQL."""
    import admin_handler
    
    # Create mock connection and cursor
    mock_cursor = MagicMock()
    mock_connection = MagicMock()
    mock_connection.cursor.return_value = mock_cursor
    
    # Mock the db_connection module
    mock_return_conn = MagicMock()
    
    with patch.object(admin_handler, '_get_db_connection') as mock_get_conn:
        mock_get_conn.return_value = (mock_connection, mock_return_conn)
        
        result = admin_handler._drop_indexes()
    
    # Verify SQL commands were executed
    expected_calls = [
        call('DROP INDEX IF EXISTS idx_opportunities_owner_id'),
        call('DROP INDEX IF EXISTS idx_opportunities_stage'),
        call('DROP INDEX IF EXISTS idx_accounts_owner_id'),
        call('DROP INDEX IF EXISTS idx_accounts_industry_id'),
    ]
    
    mock_cursor.execute.assert_has_calls(expected_calls, any_order=False)
    mock_connection.commit.assert_called_once()
    mock_cursor.close.assert_called_once()
    mock_return_conn.assert_called_once_with(mock_connection)
    
    assert result['dropped'] == [
        'idx_opportunities_owner_id',
        'idx_opportunities_stage',
        'idx_accounts_owner_id',
        'idx_accounts_industry_id'
    ]
    assert result['errors'] == []
    
    print("✓ _drop_indexes executes correct DROP INDEX statements")


def test_recreate_indexes():
    """Test that _recreate_indexes executes correct SQL."""
    import admin_handler
    
    # Create mock connection and cursor
    mock_cursor = MagicMock()
    mock_connection = MagicMock()
    mock_connection.cursor.return_value = mock_cursor
    
    mock_return_conn = MagicMock()
    
    with patch.object(admin_handler, '_get_db_connection') as mock_get_conn:
        mock_get_conn.return_value = (mock_connection, mock_return_conn)
        
        result = admin_handler._recreate_indexes()
    
    # Verify SQL commands were executed
    expected_calls = [
        call('CREATE INDEX IF NOT EXISTS idx_opportunities_owner_id ON opportunities(owner_id)'),
        call('CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON opportunities(stage)'),
        call('CREATE INDEX IF NOT EXISTS idx_accounts_owner_id ON accounts(owner_id)'),
        call('CREATE INDEX IF NOT EXISTS idx_accounts_industry_id ON accounts(industry_id)'),
    ]
    
    mock_cursor.execute.assert_has_calls(expected_calls, any_order=False)
    mock_connection.commit.assert_called_once()
    mock_cursor.close.assert_called_once()
    mock_return_conn.assert_called_once_with(mock_connection)
    
    assert result['created'] == [
        'idx_opportunities_owner_id',
        'idx_opportunities_stage',
        'idx_accounts_owner_id',
        'idx_accounts_industry_id'
    ]
    assert result['errors'] == []
    
    print("✓ _recreate_indexes executes correct CREATE INDEX statements")


def test_drop_indexes_handles_errors():
    """Test that _drop_indexes handles individual index errors gracefully."""
    import admin_handler
    
    mock_cursor = MagicMock()
    mock_connection = MagicMock()
    mock_connection.cursor.return_value = mock_cursor
    
    # Make the second execute call fail
    mock_cursor.execute.side_effect = [
        None,  # First index succeeds
        Exception("Permission denied"),  # Second index fails
        None,  # Third index succeeds
        None,  # Fourth index succeeds
    ]
    
    mock_return_conn = MagicMock()
    
    with patch.object(admin_handler, '_get_db_connection') as mock_get_conn:
        mock_get_conn.return_value = (mock_connection, mock_return_conn)
        
        result = admin_handler._drop_indexes()
    
    # Should have dropped 3 indexes and recorded 1 error
    assert len(result['dropped']) == 3
    assert len(result['errors']) == 1
    assert result['errors'][0]['index'] == 'idx_opportunities_stage'
    assert 'Permission denied' in result['errors'][0]['error']
    
    print("✓ _drop_indexes handles individual index errors gracefully")


def test_enable_rds_index_drop_integration():
    """Test enable_rds_index_drop calls _drop_indexes and saves config."""
    import admin_handler
    
    mock_cursor = MagicMock()
    mock_connection = MagicMock()
    mock_connection.cursor.return_value = mock_cursor
    mock_return_conn = MagicMock()
    
    with patch.object(admin_handler, '_get_db_connection') as mock_get_conn, \
         patch.object(admin_handler, 'save_config') as mock_save_config, \
         patch.object(admin_handler, 'log_failure_error') as mock_log, \
         patch.object(admin_handler, 'notify_devops_agent') as mock_notify:
        
        mock_get_conn.return_value = (mock_connection, mock_return_conn)
        
        result = admin_handler.enable_rds_index_drop('moderate', 'test-user')
    
    assert result['success'] == True
    assert 'droppedIndexes' in result
    assert len(result['droppedIndexes']) == 4
    
    # Verify config was saved
    mock_save_config.assert_called_once()
    call_args = mock_save_config.call_args
    assert call_args[0][0] == 'rdsIndexDrop'
    assert call_args[0][1] == True
    
    print("✓ enable_rds_index_drop drops indexes and saves config")


def test_disable_rds_index_drop_integration():
    """Test disable_rds_index_drop calls _recreate_indexes and saves config."""
    import admin_handler
    
    mock_cursor = MagicMock()
    mock_connection = MagicMock()
    mock_connection.cursor.return_value = mock_cursor
    mock_return_conn = MagicMock()
    
    with patch.object(admin_handler, '_get_db_connection') as mock_get_conn, \
         patch.object(admin_handler, 'save_config') as mock_save_config, \
         patch.object(admin_handler, 'log_failure_error') as mock_log:
        
        mock_get_conn.return_value = (mock_connection, mock_return_conn)
        
        result = admin_handler.disable_rds_index_drop('test-user')
    
    assert result['success'] == True
    assert 'createdIndexes' in result
    assert len(result['createdIndexes']) == 4
    
    # Verify config was saved
    mock_save_config.assert_called_once()
    call_args = mock_save_config.call_args
    assert call_args[0][0] == 'rdsIndexDrop'
    assert call_args[0][1] == False
    
    print("✓ disable_rds_index_drop recreates indexes and saves config")


def run_all_tests():
    """Run all unit tests."""
    print("\n" + "="*60)
    print("  RDS Index Drop Unit Tests")
    print("="*60 + "\n")
    
    tests = [
        test_index_definitions,
        test_drop_indexes,
        test_recreate_indexes,
        test_drop_indexes_handles_errors,
        test_enable_rds_index_drop_integration,
        test_disable_rds_index_drop_integration,
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            test()
            passed += 1
        except Exception as e:
            print(f"✗ {test.__name__} FAILED: {e}")
            failed += 1
    
    print("\n" + "="*60)
    print(f"  Results: {passed} passed, {failed} failed")
    print("="*60 + "\n")
    
    return failed == 0


if __name__ == '__main__':
    success = run_all_tests()
    sys.exit(0 if success else 1)
