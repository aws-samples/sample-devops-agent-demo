# AnyCompany CRM — Demo Preparation Guide

## Overview

This document outlines the demo preparation checklist for the AnyCompany CRM platform. The platform serves as a demo environment for showcasing **AWS DevOps Agent** — an autonomous incident response system that investigates failures, identifies root causes, and generates mitigation plans in real time.

## Demo Narrative

**Key Message**: "This CRM runs on real AWS infrastructure. We inject real failures and watch the AWS DevOps Agent autonomously investigate, diagnose, and mitigate them."

### What the Platform Provides
- Complete sales opportunity pipeline management
- Account health tracking and management
- Personal opportunity views for sales reps
- Team performance dashboards
- Failure Simulator (Cross View Dashboard) for injecting real AWS infrastructure failures
- Real-time metrics monitoring (SQS queue depth, Lambda error rate, RDS response time)
- Integration with AWS DevOps Agent for automated incident response

### Failure Scenarios Available
1. **SQS Message Backlog Spike** — Floods the SQS queue with 150 messages, overwhelming consumers
2. **Lambda Failed Deployment** — Deploys broken Lambda code causing invocation failures
3. **RDS Index Drop** — Drops database indexes causing full table scans and CPU spikes

## Pre-Demo Checklist

### Environment Setup
- [ ] CDK stacks deployed successfully (`npm run kit -- deploy dev --all`)
- [ ] Webhook secret configured in Secrets Manager
- [ ] AWS DevOps Agent agentspace "crm-app" created and accessible
- [ ] 3P integrations configured (GitHub, Slack) — see main README
- [ ] CloudFront URL accessible and CRM loads correctly
- [ ] No console errors in browser dev tools

### AWS DevOps Agent Setup
- [ ] Agentspace is active and monitoring the account
- [ ] Operator Portal is accessible (using the IdC credentials you configured)
- [ ] Webhook endpoint is configured and receiving alerts
- [ ] CloudWatch alarms are configured and forwarding alerts
- [ ] Slack channel `#devops-agent` is receiving notifications

### Data Verification
- [ ] Mock CRM data is seeded (accounts, opportunities, team members)
- [ ] All CRM pages load with data
- [ ] Failure Simulator shows "All Systems Normal" (no active scenarios)
- [ ] Metrics are refreshing (auto-refresh 5s)

### Feature Testing
- [ ] All CRM page filters and search work correctly
- [ ] Failure Simulator toggles enable/disable scenarios
- [ ] Real-time metrics update when scenarios are active
- [ ] 10-minute auto-expiry timer works for active scenarios
- [ ] DevOps Agent Portal shows investigations when failures are triggered

## Demo Flow

### Step 1: Overview (~1 minute)
Walk through the Use Case page to set context.

**Talking Points:**
- "This is a fully functional CRM application running on real AWS infrastructure — Lambda, API Gateway, RDS PostgreSQL, SQS, and CloudFront."
- "We're going to inject real infrastructure failures and watch the AWS DevOps Agent autonomously investigate and respond."

### Step 2: Explore the CRM & Enable a Failure (~2 minutes)
Navigate through the CRM pages, then open the Failure Simulator.

**Demo Actions:**
1. Click through Accounts, Pipeline, My Opportunities, Team Performance
2. Open the Failure Simulator
3. Review the three failure scenarios and their descriptions
4. Enable one scenario (recommended: **Lambda Failed Deployment** for most visible impact)
5. Point out the real-time metrics updating

**Talking Points:**
- "Each scenario injects a real AWS infrastructure failure — this isn't simulated data."
- "The Lambda scenario deploys broken code, causing every API call to fail."
- "Watch the error rate metric spike in real time."

### Step 3: Watch the Agent (~3 minutes)
Open the DevOps Agent Operator Portal to observe the investigation.

**Demo Actions:**
1. Open the DevOps Agent Portal (using the IdC credentials you configured)
2. Watch the investigation appear and progress through stages
3. Walk through: resource mapping → investigation → root cause → mitigation plan

**Talking Points:**
- "The agent detected the failure automatically via the CloudWatch alarm webhook."
- "It's now mapping affected resources, analyzing logs, and identifying the root cause."
- "Here's the mitigation plan — the agent identified the broken deployment and recommends a rollback."

### Wrap-Up (~30 seconds)
- Disable the failure scenario (or let the 10-minute timer expire)
- Show metrics returning to normal
- Summarize: autonomous detection, investigation, root cause analysis, and mitigation — all without human intervention

## Troubleshooting

### Failure scenario won't enable
- Check the REST API Lambda logs in CloudWatch
- Verify the proxy Lambda has VPC and RDS connectivity
- Ensure the webhook secret is set in Secrets Manager

### DevOps Agent not investigating
- Verify the webhook URL is configured in `cdk.json` context (`devOpsAgentWebhookUrl`)
- Check that the webhook secret matches between Secrets Manager and the agent configuration
- Confirm the agentspace association is active

### Metrics not updating
- Check that the AppSync GraphQL subscriptions are connected
- Verify the metrics Lambda is running (check CloudWatch logs)
- Ensure the browser has WebSocket connectivity

## Post-Demo Cleanup

1. Disable all active failure scenarios in the Failure Simulator
2. Verify metrics return to normal ("All Systems Normal")
3. Optionally destroy stacks if no longer needed: `npm run kit -- destroy dev --all`

---

Last Updated: 2025-03-20
