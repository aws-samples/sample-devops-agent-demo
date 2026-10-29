# AWS DevOps Agent — AnyCompany CRM Demo Script

## Persona

Marcus is a DevOps engineering lead at a mid-size SaaS company. With years of experience managing cloud-native infrastructure on AWS, he understands that operational incidents are inevitable — what matters is how fast you detect, diagnose, and resolve them. However, coordinating on-call rotations, manually triaging alerts at 2 AM, correlating metrics across dozens of dashboards, and writing post-incident reports is exhausting, inconsistent, and pulls engineers away from building. His team spends more time firefighting than improving.

## Use Case Scenario

Marcus's company recently adopted AWS DevOps Agent to automate incident investigation and response across their applications. To evaluate the agent's effectiveness, his team built AnyCompany CRM — a full-stack CRM application on AWS backed by real production-grade infrastructure: Lambda functions, API Gateway, RDS PostgreSQL, SQS queues, and CloudFront. The application intentionally includes a Failure Simulator that can inject real infrastructure failures — SQS message backlog spikes, broken Lambda deployments, and dropped database indexes — into the live environment.

The CRM serves as a realistic incident response testbed where the team can observe how the DevOps Agent detects failures through webhook-triggered alerts, autonomously investigates root causes by correlating metrics from CloudWatch, and generates actionable mitigation plans — all without human intervention.

## Solution Details

The AWS DevOps Agent automates the full incident response lifecycle — from detection through investigation to mitigation. Here is how it works with the AnyCompany CRM demo:

### 1. Infrastructure and Integrations Setup

The team deploys the AnyCompany CRM using AWS CDK, which provisions the full application stack:

- **Frontend:** React 18 + TypeScript application hosted on Amazon S3 and served via Amazon CloudFront, using AWS Cloudscape Design System for the UI and Amazon Cognito for authentication.
- **Backend:** Amazon API Gateway + AWS Lambda (Python) for the REST API, Amazon RDS PostgreSQL with RDS Proxy for the database, Amazon SQS for asynchronous message processing, and Amazon VPC with private subnets for network isolation.
- **Security:** AWS WAF protects the API and frontend, and all data is encrypted at rest and in transit.
- **DevOps Agent Agentspace:** The CDK stack automatically creates an AWS DevOps Agent agentspace named "crm-app" with an IAM operator role, along with a webhook secret stored in AWS Secrets Manager for secure alert ingestion.

After deployment, the team configures three third-party integrations in the DevOps Agent console:

- **Amazon CloudWatch** — for observability (metrics, alarms, and logs from the CRM infrastructure).
- **GitHub** — for code context (commit history, pull requests, and recent deployments).
- **Slack** — for team communication (investigation updates and mitigation plans posted to a dedicated channel).

### 2. Failure Scenario Demonstrations

The CRM includes an interactive Failure Simulator (the "Cross View Dashboard") that injects real AWS infrastructure failures. Each scenario modifies live resources in the AWS account and triggers a webhook payload to the DevOps Agent:

- **SQS Message Backlog Spike:** Floods the SQS queue with 100 messages immediately, then sustains a drip of 1–2 messages every 5 seconds for 10 minutes. This simulates a consumer backlog that delays asynchronous CRM workflows — opportunity stage-change notifications, lead assignment events, and automated follow-up emails all queue indefinitely. The DevOps Agent receives a webhook with the queue ARN, message count, and detection timestamp.

- **Lambda Failed Deployment:** Deploys intentionally broken code to the CRM's REST API Lambda function, causing all invocations to fail. This renders the entire CRM non-functional — sales reps cannot view their pipeline, managers cannot pull reports, and no deal updates can be saved. The DevOps Agent receives a webhook with the function ARN, error type, and deployment metadata.

- **RDS Index Drop:** Drops critical PostgreSQL indexes from the opportunities and accounts tables, forcing full table scans on every query. This spikes both read latency and CPU utilization — pages that loaded in 100ms now take 5–10 seconds. The DevOps Agent receives a webhook with the RDS instance identifier, dropped index names, affected tables, and the detection method.

Each scenario runs for 10 minutes with a visible countdown timer, then automatically reverts (restoring indexes, redeploying healthy code, or draining the queue). Real-time metrics — SQS queue depth, Lambda error rate, and RDS response time — are displayed on the dashboard with radial gauges, SVG sparklines, and threshold indicators.

### 3. Autonomous Investigation

When a failure scenario is enabled, the Failure Simulator sends a signed webhook payload (HMAC-verified via the Secrets Manager secret) to the DevOps Agent. The agent then:

- **Acknowledges the alert** and identifies the affected AWS resources (Lambda function, RDS instance, or SQS queue).
- **Gathers data** from multiple sources — pulling CloudWatch metrics, checking RDS Performance Insights, reviewing recent deployments, and analyzing correlated traces and anomalies.
- **Correlates timing** between the infrastructure change and the observed degradation to pinpoint the root cause.
- **Generates a mitigation plan** with specific, actionable steps — SQL commands to recreate dropped indexes, rollback instructions for the broken Lambda deployment, or consumer scaling recommendations for the SQS backlog.
- **Posts updates** to the configured Slack channel throughout the investigation, keeping the team informed in real time.

The entire investigation is logged in an immutable agent journal visible in the DevOps Agent Operator Portal, providing full transparency into every step the agent took and every data source it consulted.

### 4. Operator Portal and Observability

The DevOps Agent Operator Portal serves as the central hub for monitoring investigations:

- **Investigation Timeline:** Every investigation shows the agent's reasoning chain, the tools it invoked, the data it gathered, and the final mitigation plan.
- **Multi-Source Correlation:** The agent pulls data from CloudWatch and GitHub to build a comprehensive view of each incident.
- **Historical Tracking:** Past investigations are preserved, making it easy to compare incidents, verify fixes, and detect recurring patterns.

## Demo Flow

The demo follows a two-step guided walkthrough built into the CRM application:

**Step 1 — Explore and Enable Failures:**
The presenter navigates the CRM application (Accounts, Pipeline, My Opportunities, Team Performance) to establish that it is a fully functional application backed by real AWS infrastructure. Then, the presenter opens the Failure Simulator and enables one of the three failure scenarios. The dashboard shows real-time metrics updating as the infrastructure degrades.

**Step 2 — Watch the Agent:**
The presenter switches to the DevOps Agent Operator Portal (accessible via the CRM's guided flow with pre-configured credentials). A new investigation appears, triggered by the webhook. The audience watches the agent autonomously triage the incident — gathering data, identifying root cause, and producing a mitigation plan — all within seconds, with no human intervention.

After the demonstration, the presenter disables the failure scenario, and the system automatically restores to a healthy state.

## Benefits

**Reduced Mean Time to Resolution (MTTR):** The agent begins investigating the moment an alert fires — whether at 2 AM or during peak hours — eliminating the delay of paging an on-call engineer, context-switching, and manually correlating dashboards.

**Autonomous Root Cause Analysis:** Instead of an engineer spending 30–60 minutes manually checking CloudWatch, querying logs, and reviewing recent deployments, the agent performs multi-source correlation automatically and delivers a specific diagnosis.

**Actionable Mitigation Plans:** Every investigation produces concrete remediation steps — not just a description of the problem, but the exact commands, configurations, or rollback procedures needed to resolve it.

**Full Lifecycle Transparency:** The immutable agent journal provides a complete audit trail of every investigation, enabling post-incident review, pattern analysis, and continuous improvement without manual documentation.

**Unified Tool Integration:** The agent securely integrates with existing observability tools (CloudWatch), code repositories (GitHub), and communication platforms (Slack), working within the team's existing workflow rather than requiring new tooling.

**Proactive Pattern Recognition:** By analyzing patterns across incidents, the agent helps teams shift from reactive firefighting to proactive prevention — identifying recurring failure modes before they escalate.

## Conclusion

With AWS DevOps Agent, Marcus's team can continuously monitor and respond to operational incidents across their applications — detecting failures in real time, investigating autonomously across multiple data sources, and delivering actionable mitigation plans without requiring a human on-call engineer. The AnyCompany CRM demo showcases this full incident response lifecycle, demonstrating how the agent handles real AWS infrastructure failures — from SQS backlog spikes to broken Lambda deployments to degraded database performance — and provides the guidance teams need to resolve them quickly. This is always-on incident response that reduces MTTR and lets engineering teams focus on building, not firefighting.
