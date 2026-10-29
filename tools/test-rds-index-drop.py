#!/usr/bin/env python3
"""
Test script for RDS Index Drop failure scenario.

This script tests that the RDS Index Drop feature actually drops and recreates
database indexes, causing authentic performance degradation.

Usage:
    # Set your API endpoint (from CDK output)
    export API_ENDPOINT="https://xxx.execute-api.us-east-1.amazonaws.com/prod"
    
    # Run the test
    python tools/test-rds-index-drop.py

Requirements:
    pip install requests
"""

import os
import sys
import time
import json
import requests
from typing import Dict, Any, Optional


# Configuration
API_ENDPOINT = os.environ.get('API_ENDPOINT', '').rstrip('/')
# For authenticated requests, you'd need to add auth headers
AUTH_TOKEN = os.environ.get('AUTH_TOKEN', '')


def make_request(method: str, path: str, data: Optional[Dict] = None) -> Dict[str, Any]:
    """Make an API request."""
    url = f"{API_ENDPOINT}{path}"
    headers = {'Content-Type': 'application/json'}
    
    if AUTH_TOKEN:
        headers['Authorization'] = f'Bearer {AUTH_TOKEN}'
    
    try:
        if method == 'GET':
            response = requests.get(url, headers=headers, timeout=30)
        elif method == 'POST':
            response = requests.post(url, headers=headers, json=data, timeout=30)
        elif method == 'DELETE':
            response = requests.delete(url, headers=headers, timeout=30)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        return {
            'status_code': response.status_code,
            'data': response.json() if response.text else {},
            'elapsed_ms': response.elapsed.total_seconds() * 1000
        }
    except requests.exceptions.RequestException as e:
        return {'error': str(e), 'status_code': 0}


def measure_query_latency(num_requests: int = 3) -> Dict[str, float]:
    """Measure average latency for database queries."""
    latencies = []
    
    for i in range(num_requests):
        # Query opportunities (uses indexes on owner_id, stage)
        result = make_request('GET', '/opportunities')
        if 'error' not in result:
            latencies.append(result['elapsed_ms'])
        time.sleep(0.5)  # nosemgrep: arbitrary-sleep  # nosec - Rate limiting between sequential API requests
    
    if not latencies:
        return {'avg': 0, 'min': 0, 'max': 0}
    
    return {
        'avg': sum(latencies) / len(latencies),
        'min': min(latencies),
        'max': max(latencies)
    }


def get_system_status() -> Dict[str, Any]:
    """Get current system status including failure scenarios."""
    result = make_request('GET', '/admin/system-status')
    return result.get('data', {})


def enable_rds_index_drop(severity: str = 'moderate') -> Dict[str, Any]:
    """Enable RDS index drop (actually drops indexes)."""
    result = make_request('POST', '/admin/failures/rds-index-drop', {'severity': severity})
    return result


def disable_rds_index_drop() -> Dict[str, Any]:
    """Disable RDS index drop (recreates indexes)."""
    result = make_request('DELETE', '/admin/failures/rds-index-drop')
    return result


def print_header(text: str):
    """Print a formatted header."""
    print(f"\n{'='*60}")
    print(f"  {text}")
    print(f"{'='*60}")


def print_result(label: str, value: Any):
    """Print a formatted result."""
    print(f"  {label}: {value}")


def run_test():
    """Run the RDS index drop test."""
    if not API_ENDPOINT:
        print("ERROR: API_ENDPOINT environment variable not set")
        print("Usage: export API_ENDPOINT='https://xxx.execute-api.us-east-1.amazonaws.com/prod'")
        sys.exit(1)
    
    print_header("RDS Index Drop Test")
    print(f"  API Endpoint: {API_ENDPOINT}")
    
    # Step 1: Check initial system status
    print_header("Step 1: Check Initial System Status")
    status = get_system_status()
    rds_status = status.get('scenarios', {}).get('rdsIndexDrop', {})
    print_result("RDS Index Drop enabled", rds_status.get('enabled', False))
    
    # Step 2: Measure baseline latency (with indexes)
    print_header("Step 2: Measure Baseline Latency (with indexes)")
    baseline = measure_query_latency(3)
    print_result("Average latency", f"{baseline['avg']:.2f}ms")
    print_result("Min latency", f"{baseline['min']:.2f}ms")
    print_result("Max latency", f"{baseline['max']:.2f}ms")
    
    # Step 3: Enable RDS index drop (actually drops indexes)
    print_header("Step 3: Enable RDS Index Drop")
    enable_result = enable_rds_index_drop('moderate')
    print_result("Status code", enable_result.get('status_code'))
    print_result("Response", json.dumps(enable_result.get('data', {}), indent=2))
    
    if enable_result.get('status_code') != 200:
        print("\nWARNING: Failed to enable RDS index drop")
        print("This might be due to authentication or the API not being deployed")
    
    # Wait for indexes to be dropped
    print("\n  Waiting 2 seconds for index drop to complete...")
    time.sleep(2)  # nosemgrep: arbitrary-sleep  # nosec - Intentional delay for index DDL to propagate before measuring latency
    
    # Step 4: Measure latency without indexes
    print_header("Step 4: Measure Latency Without Indexes")
    degraded = measure_query_latency(3)
    print_result("Average latency", f"{degraded['avg']:.2f}ms")
    print_result("Min latency", f"{degraded['min']:.2f}ms")
    print_result("Max latency", f"{degraded['max']:.2f}ms")
    
    # Step 5: Disable RDS index drop (recreates indexes)
    print_header("Step 5: Disable RDS Index Drop (Recreate Indexes)")
    disable_result = disable_rds_index_drop()
    print_result("Status code", disable_result.get('status_code'))
    print_result("Response", json.dumps(disable_result.get('data', {}), indent=2))
    
    # Wait for indexes to be recreated
    print("\n  Waiting 2 seconds for index recreation to complete...")
    time.sleep(2)  # nosemgrep: arbitrary-sleep  # nosec - Intentional delay for index DDL to propagate before measuring latency
    
    # Step 6: Measure restored latency
    print_header("Step 6: Measure Restored Latency (with indexes)")
    restored = measure_query_latency(3)
    print_result("Average latency", f"{restored['avg']:.2f}ms")
    print_result("Min latency", f"{restored['min']:.2f}ms")
    print_result("Max latency", f"{restored['max']:.2f}ms")
    
    # Step 7: Summary
    print_header("Test Summary")
    print_result("Baseline avg latency", f"{baseline['avg']:.2f}ms")
    print_result("Degraded avg latency", f"{degraded['avg']:.2f}ms")
    print_result("Restored avg latency", f"{restored['avg']:.2f}ms")
    
    if degraded['avg'] > 0 and baseline['avg'] > 0:
        degradation_factor = degraded['avg'] / baseline['avg']
        print_result("Degradation factor", f"{degradation_factor:.2f}x slower")
        
        if degradation_factor > 1.5:
            print("\n  ✓ SUCCESS: Index drop caused measurable performance degradation")
        else:
            print("\n  ⚠ WARNING: Performance degradation was minimal")
            print("    This could be due to small dataset size or query caching")
    else:
        print("\n  ⚠ Could not calculate degradation factor")
    
    print("\n" + "="*60)


if __name__ == '__main__':
    run_test()
