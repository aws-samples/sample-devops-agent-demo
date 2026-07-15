#!/usr/bin/env python3
"""
Unit test for Lambda Failed Deployment functionality.

This test mocks the Lambda client to verify the code update
operations are executed correctly.

Usage:
    python tools/test-lambda-failed-deployment-unit.py

Requirements:
    uv pip install boto3
"""

import sys
import os
from unittest.mock import MagicMock, patch, ANY

# Add the proxy directory to the path for imports
PROXY_DIR = os.path.join(os.path.dirname(__file__), '..', 'lib', 'stacks', 'backend', 'rest-api', 'proxy')
HANDLERS_DIR = os.path.join(PROXY_DIR, 'handlers')
sys.path.insert(0, PROXY_DIR)
sys.path.insert(0, HANDLERS_DIR)


def test_broken_code_definition():
    """Test that broken Lambda code is defined correctly."""
    import admin_handler
    
    assert 'TypeError' in admin_handler.BROKEN_LAMBDA_CODE or 'undefined' in admin_handler.BROKEN_LAMBDA_CODE
    assert 'exports.handler' in admin_handler.BROKEN_LAMBDA_CODE
    print("✓ Broken Lambda code definition is correct")


def test_working_code_definition():
    """Test that working Lambda code is defined correctly."""
    import admin_handler
    
    assert 'exports.handler' in admin_handler.WORKING_LAMBDA_CODE
    assert 'Success' in admin_handler.WORKING_LAMBDA_CODE
    assert 'statusCode' in admin_handler.WORKING_LAMBDA_CODE
    print("✓ Working Lambda code definition is correct")


def test_update_lambda_code():
    """Test that _update_lambda_code creates zip and calls update_function_code."""
    import admin_handler
    
    mock_response = {
        'FunctionName': 'test-function',
        'LastModified': '2025-02-04T12:00:00.000+0000',
        'CodeSize': 500,
        'Version': '$LATEST',
    }
    
    with patch.object(admin_handler, 'lambda_client') as mock_lambda, \
         patch.object(admin_handler, 'TARGET_LAMBDA_ARN', 'arn:aws:lambda:us-east-1:123456789:function:test-function'):
        
        mock_lambda.update_function_code.return_value = mock_response
        
        result = admin_handler._update_lambda_code('test code')
    
    assert result['success'] == True
    assert result['functionName'] == 'test-function'
    assert result['codeSize'] == 500
    
    # Verify update_function_code was called with ZipFile
    mock_lambda.update_function_code.assert_called_once()
    call_kwargs = mock_lambda.update_function_code.call_args[1]
    assert call_kwargs['FunctionName'] == 'test-function'
    assert 'ZipFile' in call_kwargs
    
    print("✓ _update_lambda_code creates zip and calls update_function_code")


def test_update_lambda_code_no_arn():
    """Test that _update_lambda_code returns error when TARGET_LAMBDA_ARN is not set."""
    import admin_handler
    
    with patch.object(admin_handler, 'TARGET_LAMBDA_ARN', ''):
        result = admin_handler._update_lambda_code('test code')
    
    assert result['success'] == False
    assert 'not configured' in result['error']
    
    print("✓ _update_lambda_code handles missing TARGET_LAMBDA_ARN")


def test_enable_lambda_failed_deployment():
    """Test enable_lambda_failed_deployment updates code and saves config."""
    import admin_handler
    
    mock_update_result = {
        'success': True,
        'functionName': 'test-function',
        'lastModified': '2025-02-04T12:00:00.000+0000',
        'codeSize': 500,
    }
    
    with patch.object(admin_handler, '_update_lambda_code') as mock_update, \
         patch.object(admin_handler, 'save_config') as mock_save_config, \
         patch.object(admin_handler, 'log_failure_error') as mock_log, \
         patch.object(admin_handler, 'notify_devops_agent') as mock_notify, \
         patch.object(admin_handler, 'TARGET_LAMBDA_ARN', 'arn:aws:lambda:us-east-1:123456789:function:test-function'):
        
        mock_update.return_value = mock_update_result
        
        result = admin_handler.enable_lambda_failed_deployment('moderate', 'test-user')
    
    assert result['success'] == True
    assert 'test-function' in result['message']
    assert result['functionName'] == 'test-function'
    
    # Verify _update_lambda_code was called with broken code
    mock_update.assert_called_once()
    call_args = mock_update.call_args[0]
    assert 'undefined' in call_args[0] or 'TypeError' in call_args[0]
    
    # Verify config was saved
    mock_save_config.assert_called_once()
    save_call_args = mock_save_config.call_args[0]
    assert save_call_args[0] == 'lambdaFailedDeployment'
    assert save_call_args[1] == True
    
    print("✓ enable_lambda_failed_deployment updates code and saves config")


def test_disable_lambda_failed_deployment():
    """Test disable_lambda_failed_deployment restores code and saves config."""
    import admin_handler
    
    mock_update_result = {
        'success': True,
        'functionName': 'test-function',
        'lastModified': '2025-02-04T12:00:00.000+0000',
        'codeSize': 400,
    }
    
    with patch.object(admin_handler, '_update_lambda_code') as mock_update, \
         patch.object(admin_handler, 'save_config') as mock_save_config, \
         patch.object(admin_handler, 'log_failure_error') as mock_log, \
         patch.object(admin_handler, 'TARGET_LAMBDA_ARN', 'arn:aws:lambda:us-east-1:123456789:function:test-function'):
        
        mock_update.return_value = mock_update_result
        
        result = admin_handler.disable_lambda_failed_deployment('test-user')
    
    assert result['success'] == True
    assert 'restored' in result['message'].lower() or 'test-function' in result['message']
    
    # Verify _update_lambda_code was called with working code
    mock_update.assert_called_once()
    call_args = mock_update.call_args[0]
    assert 'Success' in call_args[0]
    
    # Verify config was saved
    mock_save_config.assert_called_once()
    save_call_args = mock_save_config.call_args[0]
    assert save_call_args[0] == 'lambdaFailedDeployment'
    assert save_call_args[1] == False
    
    print("✓ disable_lambda_failed_deployment restores code and saves config")


def test_enable_lambda_failed_deployment_no_arn():
    """Test enable_lambda_failed_deployment returns error when TARGET_LAMBDA_ARN is not set."""
    import admin_handler
    
    with patch.object(admin_handler, 'TARGET_LAMBDA_ARN', ''):
        result = admin_handler.enable_lambda_failed_deployment('moderate', 'test-user')
    
    assert result['success'] == False
    assert 'not configured' in result['message']
    
    print("✓ enable_lambda_failed_deployment handles missing TARGET_LAMBDA_ARN")


def test_enable_lambda_failed_deployment_update_failure():
    """Test enable_lambda_failed_deployment handles update failures gracefully."""
    import admin_handler
    
    mock_update_result = {
        'success': False,
        'error': 'AccessDeniedException: User is not authorized',
    }
    
    with patch.object(admin_handler, '_update_lambda_code') as mock_update, \
         patch.object(admin_handler, 'TARGET_LAMBDA_ARN', 'arn:aws:lambda:us-east-1:123456789:function:test-function'):
        
        mock_update.return_value = mock_update_result
        
        result = admin_handler.enable_lambda_failed_deployment('moderate', 'test-user')
    
    assert result['success'] == False
    assert 'Failed to update' in result['message']
    
    print("✓ enable_lambda_failed_deployment handles update failures gracefully")


def run_all_tests():
    """Run all unit tests."""
    print("\n" + "="*60)
    print("  Lambda Failed Deployment Unit Tests")
    print("="*60 + "\n")
    
    tests = [
        test_broken_code_definition,
        test_working_code_definition,
        test_update_lambda_code,
        test_update_lambda_code_no_arn,
        test_enable_lambda_failed_deployment,
        test_disable_lambda_failed_deployment,
        test_enable_lambda_failed_deployment_no_arn,
        test_enable_lambda_failed_deployment_update_failure,
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
