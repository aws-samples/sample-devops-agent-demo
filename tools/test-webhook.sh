#!/bin/bash
# Test script for AWS DevOps Agent generic webhook (HMAC auth)
# Usage: ./tools/test-webhook.sh <WEBHOOK_URL> <WEBHOOK_SECRET>

WEBHOOK_URL="${1:?Usage: $0 <WEBHOOK_URL> <WEBHOOK_SECRET>}"
SECRET="${2:?Usage: $0 <WEBHOOK_URL> <WEBHOOK_SECRET>}"

TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%S.000Z)
INCIDENT_ID="test-rds-$(date +%s)"

PAYLOAD=$(cat <<EOF
{"eventType":"incident","incidentId":"${INCIDENT_ID}","action":"created","priority":"HIGH","title":"[Test] High RDS Query Latency","description":"RDS instance test-cluster-instance-1 in us-east-1 showing elevated query latency. Detected via Datadog monitor. Indexes may have been dropped on opportunities and accounts tables.","timestamp":"${TIMESTAMP}","service":"Amazon RDS","data":{"awsAccountId":"123456789012","awsRegion":"us-east-1","rdsInstanceIdentifier":"test-cluster-instance-1","detectionMethod":"Datadog RDS Proxy query response latency monitor"}}
EOF
)

# Generate HMAC-SHA256 signature
SIGNATURE=$(printf '%s' "${TIMESTAMP}:${PAYLOAD}" | openssl dgst -sha256 -hmac "${SECRET}" -binary | base64)

echo "=== Testing DevOps Agent Webhook ==="
echo "URL: ${WEBHOOK_URL}"
echo "Timestamp: ${TIMESTAMP}"
echo "Incident ID: ${INCIDENT_ID}"
echo "Signature: ${SIGNATURE}"
echo ""

curl -v -X POST "${WEBHOOK_URL}" \
  -H "Content-Type: application/json" \
  -H "x-amzn-event-timestamp: ${TIMESTAMP}" \
  -H "x-amzn-event-signature: ${SIGNATURE}" \
  -d "${PAYLOAD}"

echo ""
echo "=== Done ==="
