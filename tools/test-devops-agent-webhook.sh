#!/bin/bash
# Test script for AWS DevOps Agent generic webhook (HMAC auth)
# Usage: ./test-devops-agent-webhook.sh <WEBHOOK_URL> <WEBHOOK_SECRET>

WEBHOOK_URL="${1:?Usage: $0 <WEBHOOK_URL> <WEBHOOK_SECRET>}"
SECRET="${2:?Usage: $0 <WEBHOOK_URL> <WEBHOOK_SECRET>}"

# Create payload
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%S.000Z)
INCIDENT_ID="test-rds-slow-$(date +%s)"

PAYLOAD=$(cat <<EOF
{
  "eventType": "incident",
  "incidentId": "$INCIDENT_ID",
  "action": "created",
  "priority": "HIGH",
  "title": "[CRM Demo] RDS Index Drop - Test",
  "description": "RDS read latency exceeded threshold. Database indexes were dropped causing full table scans on opportunities and accounts tables.",
  "timestamp": "$TIMESTAMP",
  "service": "Amazon RDS",
  "data": {
    "awsAccountId": "123456789012",
    "awsRegion": "us-east-1",
    "rdsInstanceIdentifier": "my-cluster-instance-1",
    "rdsClusterArn": "arn:aws:rds:us-east-1:123456789012:cluster:my-cluster",
    "databaseName": "crm_demo",
    "incidentTimestamp": "$TIMESTAMP",
    "detectionMethod": "Datadog aws.rds.cpuutilization monitor",
    "droppedIndexes": ["idx_opportunities_owner_id", "idx_opportunities_stage", "idx_accounts_owner_id", "idx_accounts_industry_id"],
    "affectedTables": ["opportunities", "accounts"]
  }
}
EOF
)

# Generate HMAC-SHA256 signature: sign "{timestamp}:{payload}" with secret
SIGNATURE=$(printf '%s' "${TIMESTAMP}:${PAYLOAD}" | openssl dgst -sha256 -hmac "$SECRET" -binary | base64)

echo "=== Sending webhook ==="
echo "URL: $WEBHOOK_URL"
echo "Timestamp: $TIMESTAMP"
echo "Incident ID: $INCIDENT_ID"
echo "Signature: $SIGNATURE"
echo ""

# Send webhook with HMAC auth
HTTP_CODE=$(curl -s -o /tmp/webhook_response.txt -w "%{http_code}" \
  -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "x-amzn-event-timestamp: $TIMESTAMP" \
  -H "x-amzn-event-signature: $SIGNATURE" \
  -d "$PAYLOAD")

echo "=== Response ==="
echo "HTTP Status: $HTTP_CODE"
echo "Body: $(cat /tmp/webhook_response.txt)"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Webhook sent successfully!"
else
  echo "❌ Webhook failed with status $HTTP_CODE"
  echo ""
  echo "Troubleshooting:"
  echo "  - 404: Check webhook URL is correct and credentials are valid"
  echo "  - 401/403: HMAC signature mismatch - verify the secret"
  echo "  - 400: Payload format issue - check JSON structure"
fi
