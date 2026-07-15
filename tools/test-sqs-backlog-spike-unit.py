#!/usr/bin/env python3
"""
Unit test for SQS Message Backlog Spike functionality.

This test mocks the SQS client to verify the message sending
and queue purging operations are executed correctly.

Usage:
    python tools/test-sqs-backlog-spike-unit.py

Requirements:
    uv pip install boto3
"""

import sys
import os
from unittest.mock import MagicMock, patch

# Add the proxy directory to the path for imports
PROXY_DIR = os.path.join(os.path.dirname(__file__), '..', 'lib', 'stacks', 'backend', 'rest-api', 'proxy')
HANDLERS_DIR = os.path.join(PROXY_DIR, 'handlers')
sys.path.insert(0, PROXY_DIR)
sys.path.insert(0, HANDLERS_DIR)


def test_enable_sqs_backlog_spike_sends_messages():
    """Test that enable_sqs_backlog_spike sends messages in batches."""
    import admin_handler
    
    mock_response = {
        'Successful': [{'Id': str(i)} for i in range(10)],
        'Failed': []
    }
    
    with patch.object(admin_handler, 'sqs_client') as mock_sqs, \
         patch.object(admin_handler, 'NOTIFICATION_QUEUE_URL', 'https://sqs.us-east-1.amazonaws.com/123456789/test-queue'), \
         patch.object(admin_handler, 'save_config') as mock_save_config, \
         patch.object(admin_handler, 'log_failure_error') as mock_log, \
         patch.object(admin_handler, 'notify_devops_agent') as mock_notify:
        
        mock_sqs.send_message_batch.return_value = mock_response
        
        result = admin_handler.enable_sqs_backlog_spike('low', 'test-user')
    
    assert result['success'] == True
    assert result['messagesSent'] > 0
    assert 'flooded' in result['message'].lower() or 'backlog' in result['message'].lower()
    
    # Verify send_message_batch was called
    assert mock_sqs.send_message_batch.call_count > 0
    
    print("✓ enable_sqs_backlog_spike sends messages in batches")


def test_enable_sqs_backlog_spike_severity_message_counts():
    """Test that different severities send different message counts."""
    import admin_handler
    
    mock_response = {
        'Successful': [{'Id': str(i)} for i in range(10)],
        'Failed': []
    }
    
    severity_expected = {
        'severe': 500,
        'high': 300,
        'moderate': 150,
        'light': 75,
        'low': 25
    }
    
    for severity, expected_count in severity_expected.items():
        with patch.object(admin_handler, 'sqs_client') as mock_sqs, \
             patch.object(admin_handler, 'NOTIFICATION_QUEUE_URL', 'https://sqs.us-east-1.amazonaws.com/123456789/test-queue'), \
             patch.object(admin_handler, 'save_config') as mock_save_config, \
             patch.object(admin_handler, 'log_failure_error') as mock_log, \
             patch.object(admin_handler, 'notify_devops_agent') as mock_notify:
            
            mock_sqs.send_message_batch.return_value = mock_response
            
            result = admin_handler.enable_sqs_backlog_spike(severity, 'test-user')
            
            # Calculate expected batch count (10 messages per batch)
            expected_batches = (expected_count + 9) // 10
            actual_batches = mock_sqs.send_message_batch.call_count
            
            assert actual_batches == expected_batches, f"Severity {severity}: expected {expected_batches} batches, got {actual_batches}"
    
    print("✓ enable_sqs_backlog_spike sends correct message counts per severity")


def test_enable_sqs_backlog_spike_no_queue_url():
    """Test that enable_sqs_backlog_spike returns error when NOTIFICATION_QUEUE_URL is not set."""
    import admin_handler
    
    with patch.object(admin_handler, 'NOTIFICATION_QUEUE_URL', ''):
        result = admin_handler.enable_sqs_backlog_spike('moderate', 'test-user')
    
    assert result['success'] == False
    assert 'not configured' in result['message']
    
    print("✓ enable_sqs_backlog_spike handles missing NOTIFICATION_QUEUE_URL")


def test_enable_sqs_backlog_spike_saves_config():
    """Test that enable_sqs_backlog_spike saves config after sending messages."""
    import admin_handler
    
    mock_response = {
        'Successful': [{'Id': str(i)} for i in range(10)],
        'Failed': []
    }
    
    with patch.object(admin_handler, 'sqs_client') as mock_sqs, \
         patch.object(admin_handler, 'NOTIFICATION_QUEUE_URL', 'https://sqs.us-east-1.amazonaws.com/123456789/test-queue'), \
         patch.object(admin_handler, 'save_config') as mock_save_config, \
         patch.object(admin_handler, 'log_failure_error') as mock_log, \
         patch.object(admin_handler, 'notify_devops_agent') as mock_notify:
        
        mock_sqs.send_message_batch.return_value = mock_response
        
        result = admin_handler.enable_sqs_backlog_spike('moderate', 'test-user')
    
    # Verify config was saved
    mock_save_config.assert_called_once()
    save_call_args = mock_save_config.call_args[0]
    assert save_call_args[0] == 'sqsBacklogSpike'
    assert save_call_args[1] == True
    assert save_call_args[2] == 'moderate'
    
    print("✓ enable_sqs_backlog_spike saves config after sending messages")


def test_enable_sqs_backlog_spike_logs_event():
    """Test that enable_sqs_backlog_spike logs the failure event."""
    import admin_handler
    
    mock_response = {
        'Successful': [{'Id': str(i)} for i in range(10)],
        'Failed': []
    }
    
    with patch.object(admin_handler, 'sqs_client') as mock_sqs, \
         patch.object(admin_handler, 'NOTIFICATION_QUEUE_URL', 'https://sqs.us-east-1.amazonaws.com/123456789/test-queue'), \
         patch.object(admin_handler, 'save_config') as mock_save_config, \
         patch.object(admin_handler, 'log_failure_error') as mock_log, \
         patch.object(admin_handler, 'notify_devops_agent') as mock_notify:
        
        mock_sqs.send_message_batch.return_value = mock_response
        
        result = admin_handler.enable_sqs_backlog_spike('moderate', 'test-user')
    
    # Verify log_failure_error was called
    mock_log.assert_called_once()
    log_call_args = mock_log.call_args[0]
    assert log_call_args[0] == 'sqsBacklogSpike'
    assert log_call_args[1] == 'BacklogCreated'
    
    print("✓ enable_sqs_backlog_spike logs the failure event")


def test_disable_sqs_backlog_spike_purges_queue():
    """Test that disable_sqs_backlog_spike purges the queue."""
    import admin_handler
    
    with patch.object(admin_handler, 'sqs_client') as mock_sqs, \
         patch.object(admin_handler, 'NOTIFICATION_QUEUE_URL', 'https://sqs.us-east-1.amazonaws.com/123456789/test-queue'), \
         patch.object(admin_handler, 'save_config') as mock_save_config, \
         patch.object(admin_handler, 'log_failure_error') as mock_log:
        
        result = admin_handler.disable_sqs_backlog_spike('test-user')
    
    assert result['success'] == True
    assert 'purged' in result['message'].lower() or 'cleared' in result['message'].lower()
    
    # Verify purge_queue was called
    mock_sqs.purge_queue.assert_called_once_with(
        QueueUrl='https://sqs.us-east-1.amazonaws.com/123456789/test-queue'
    )
    
    print("✓ disable_sqs_backlog_spike purges the queue")


def test_disable_sqs_backlog_spike_saves_config():
    """Test that disable_sqs_backlog_spike saves config after purging."""
    import admin_handler
    
    with patch.object(admin_handler, 'sqs_client') as mock_sqs, \
         patch.object(admin_handler, 'NOTIFICATION_QUEUE_URL', 'https://sqs.us-east-1.amazonaws.com/123456789/test-queue'), \
         patch.object(admin_handler, 'save_config') as mock_save_config, \
         patch.object(admin_handler, 'log_failure_error') as mock_log:
        
        result = admin_handler.disable_sqs_backlog_spike('test-user')
    
    # Verify config was saved
    mock_save_config.assert_called_once()
    save_call_args = mock_save_config.call_args[0]
    assert save_call_args[0] == 'sqsBacklogSpike'
    assert save_call_args[1] == False
    
    print("✓ disable_sqs_backlog_spike saves config after purging")


def test_disable_sqs_backlog_spike_no_queue_url():
    """Test that disable_sqs_backlog_spike returns error when NOTIFICATION_QUEUE_URL is not set."""
    import admin_handler
    
    with patch.object(admin_handler, 'NOTIFICATION_QUEUE_URL', ''):
        result = admin_handler.disable_sqs_backlog_spike('test-user')
    
    assert result['success'] == False
    assert 'not configured' in result['message']
    
    print("✓ disable_sqs_backlog_spike handles missing NOTIFICATION_QUEUE_URL")


def run_all_tests():
    """Run all unit tests."""
    print("\n" + "="*60)
    print("  SQS Message Backlog Spike Unit Tests")
    print("="*60 + "\n")
    
    tests = [
        test_enable_sqs_backlog_spike_sends_messages,
        test_enable_sqs_backlog_spike_severity_message_counts,
        test_enable_sqs_backlog_spike_no_queue_url,
        test_enable_sqs_backlog_spike_saves_config,
        test_enable_sqs_backlog_spike_logs_event,
        test_disable_sqs_backlog_spike_purges_queue,
        test_disable_sqs_backlog_spike_saves_config,
        test_disable_sqs_backlog_spike_no_queue_url,
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            test()
            passed += 1
        except Exception as e:
            print(f"✗ {test.__name__} FAILED: {e}")
            import traceback
            traceback.print_exc()
            failed += 1
    
    print("\n" + "="*60)
    print(f"  Results: {passed} passed, {failed} failed")
    print("="*60 + "\n")
    
    return failed == 0


if __name__ == '__main__':
    success = run_all_tests()
    sys.exit(0 if success else 1)
