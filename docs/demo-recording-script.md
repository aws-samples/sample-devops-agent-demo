# AWS DevOps Agent Demo — Recording Script

## Opening (30 seconds)

"Welcome. Today I'm going to walk you through the AWS DevOps Agent — a frontier agent that autonomously investigates and resolves operational incidents. We've built a CRM demo environment that lets us inject real AWS infrastructure failures and watch the agent respond in real time. Let me show you how it works."

---

## Step 1: View Investigations (1-2 minutes)

**Action:** Open the DevOps Agent Operator Portal

**Talking Points:**
- "First, let's look at the DevOps Agent Operator Portal. This is where all investigations live — past and present."
- "Each investigation shows the agent's reasoning, the tools it used, the data it gathered, and the mitigation plan it produced."
- "The agent integrates with CloudWatch and other observability tools to pull metrics, logs, and traces during an investigation."
- "Notice the agent journal  — every step is logged and immutable. This gives you full transparency into what the agent did and why."
- "Right now things look healthy. Let's go break something."

---

## Step 2: Test Failure Simulator (2-3 minutes)

**Action:** Navigate to the CRM app → Cross View Dashboard

**Talking Points:**
- "This is our CRM application — a fully functional sales pipeline tool backed by real AWS infrastructure: Lambda, API Gateway, RDS PostgreSQL, SQS, and CloudFront."
- "The Cross View Dashboard is our control center. It has three main sections:"
  - "**Failure Scenarios** at the top — three real infrastructure failures we can inject"
  - "**Recent Events** — a live stream of what's happening in the system"
  - "**Scenario Monitoring** — real-time metrics for SQS queue depth, Lambda error rate, and RDS response time"
- "We have three failure scenarios available:"
  - "**SQS Backlog Spike** — floods the SQS queue with 150 messages, simulating a consumer backlog"
  - "**Lambda Failed Deployment** — deploys broken code to a Lambda function, causing all invocations to fail"
  - "**RDS Slow Queries** — drops database indexes, forcing full table scans on every query"
- "These aren't mocked failures. They're real infrastructure changes happening in this AWS account right now."

---

## Step 3: Enable Failure (2-3 minutes)

**Action:** Enable the RDS Slow Queries scenario (or whichever you choose)

### Option A: RDS Slow Queries
**Talking Points:**
- "Let's enable the RDS Slow Queries scenario. Watch what happens."
- "The simulator just dropped four critical PostgreSQL indexes from our database — on the opportunities and accounts tables."
- "You can see in the failure events log: 'IndexDropped' — those are real indexes being removed."
- "Now look at the Scenario Monitoring section — the RDS Response Time metric is climbing. These are real query measurements, not simulated values."
- "Without indexes, every query does a full table scan across 50,000 opportunity records. What used to take 5ms now takes hundreds of milliseconds."
- "If I navigate to the Accounts or Pipeline page, you'll notice the loading time is significantly slower — that's the real impact of missing indexes."
- "Behind the scenes, the simulator also sent a webhook payload to the DevOps Agent with all the incident context — the RDS instance identifier, AWS account and region, which indexes were dropped, affected tables, and the detection method."


---

## Step 4: Watch the Agent (3-5 minutes)

**Action:** Switch back to the DevOps Agent Operator Portal to watch the investigation

**Talking Points:**
- "Now let's switch to the DevOps Agent portal. A new investigation should be starting — triggered by the webhook we just sent."
- "Watch the agent's journal as it works through the incident:"
  - "First, it acknowledges the alert and identifies the affected resources"
  - "Then it starts gathering data — pulling CloudWatch metrics, checking RDS performance insights, looking at recent deployments"
  - "It correlates the timing of the index drop with the latency spike"
  - "It identifies the root cause: missing database indexes causing full table scans"
  - "Finally, it produces a mitigation plan with specific SQL commands to recreate the indexes"
- "The entire investigation happened autonomously — no human intervention required."
- "Notice the agent also pulled data from CloudWatch, giving it a comprehensive view of the incident."
- "This is what autonomous incident response looks like — from alert to root cause to mitigation plan, all in under 60 seconds."

---

## Closing (30 seconds)

**Action:** Disable the failure scenario to restore the system

**Talking Points:**
- "Let me disable the scenario to restore normal operations."
- "The simulator is now recreating the indexes — you can see the RDS response time dropping back to normal."
- "To recap: we injected a real infrastructure failure, the DevOps Agent detected it, investigated autonomously, and delivered a mitigation plan — all without a human on-call engineer."
- "This is the AWS DevOps Agent — always-on incident response that reduces MTTR and lets your team focus on building, not firefighting."

---

## Tips for Recording

- **Pacing:** Pause briefly after enabling a failure to let the metrics update visually before narrating
- **Screen focus:** Keep the Cross View Dashboard visible when enabling failures, then switch to the Agent Portal for the investigation
- **Fallback:** If the agent takes longer than expected, fill time by exploring the CRM pages to show the real impact of the failure
- **Clean state:** Before recording, make sure all failure scenarios are disabled and the system is healthy
- **Browser console:** Keep the browser console closed during recording to avoid showing CORS or network errors
