# SuperAgents Video Demo Script 

## CloudSmith, Hobbes, and BigWeaver

## **Total Duration:** 3 minutes
**Format:** Brief intro (30s) + Three independent 50-second segments
**Demo Environment:** TechTalk - Same platform, different agent perspectives

* * *

## SCENARIO OPTIONS

## Choose one scenario for your demo. All three follow the same script structure with context-specific details.

### **SCENARIO 1: AnyCompany Events - Conference Platform**

* **Product:** AnyCompany Events - a trade conference platform serving 10,000 attendees across 50 conferences annually
* **Architecture:** Microservices with different teams maintaining components in different repos
* **New Feature:** Attendee networking capabilities - allowing attendees to connect with speakers and each other
* **Repos Affected:** web app, admin dashboard, user service, notification service, analytics, shared libraries
* **How the feature spans repos:**
    * Web app: Networking UI and connection interface
    * Admin dashboard: Moderation tools for connections
    * User service: Connection APIs and relationship management
    * Notification service: Connection request notifications
    * Analytics: Network activity tracking
    * Shared libraries: Connection data models
* **Performance Issue:** Session search latency (8s → 400ms after optimization)
* **Security Vulnerabilities:** IDOR in connections, command injection in message search, JWT vulnerabilities

### **SCENARIO 2: AnyCompany CRM - Enterprise CRM**

* **Product:** AnyCompany CRM - an enterprise CRM managing 50,000 sales reps across 200 enterprise customers
* **Architecture:** Multiple repositories with microservices for different business domains (sales, marketing, support, analytics)
* **New Feature:** AI-powered lead scoring - automatically scoring and prioritizing leads for sales teams
* **Repos Affected:** web frontend, API gateway, lead service, email service, analytics engine, shared UI components
* **How the feature spans repos:**
    * Web frontend: Lead score display and filtering UI
    * API gateway: Score endpoints and rate limiting
    * Lead service: Scoring algorithm and lead ranking logic
    * Email service: Automated follow-up triggers based on scores
    * Analytics engine: Score performance tracking
    * Shared UI components: Score visualization widgets
* **Performance Issue:** Lead dashboard loading time (12s → 600ms after caching optimization)
* **Security Vulnerabilities:** SQL injection in lead filters, broken access control on customer data, API rate limit bypass

### **SCENARIO 3: AnyCompany Portal - Team Productivity Portal**

* **Product:** AnyCompany Portal - a web-based team productivity platform with 100,000 daily active users across 500 companies
* **Architecture:** Microservices architecture with separate services for different productivity features
* **New Feature:** Smart task assignment - AI-powered workload balancing and skill matching
* **Repos Affected:** web frontend, task service, user service, notification service, analytics engine, shared API library
* **How the feature spans repos:**
    * Web frontend: Task assignment UI and workload visualization
    * Task service: Assignment algorithm and workload calculation
    * User service: Skills and availability management
    * Notification service: Assignment alerts and reminders
    * Analytics engine: Workload predictions and capacity tracking
    * Shared API library: Task assignment data models
* **Performance Issue:** Dashboard loading time (6s → 300ms after query optimization)
* **Security Vulnerabilities:** IDOR in task assignments, stored XSS in task descriptions, broken access control on team data

* * *

## VIDEO 1: BigWeaver - Enterprise-Scale Development (50 seconds)

### Script Template (adapt based on chosen scenario):

**Voiceover:** "Meet **[PRODUCT_NAME]**. <Provide some details on the app and how the code is structured.>  The product team wants to add **[NEW_FEATURE]**. They create an Ticket in Jira describing the requirements and assign it to BigWeaver."
**Visual:** [PRODUCT_NAME] logo and dashboard → Jira ticket being assigned to BW

**Voiceover:** "BigWeaver reviews the request, asks clarifying questions, then finds API specs from Confluence and analyzes the codebase." Managing the context of the entire organization’s codebase
**Visual:** Short Jira exchange between dev and BW → Confluence docs being accessed

**Voiceover:** "BW determines it needs to make changes across 3 repositories: **[REPO_LIST]**. BW saves time analyzing and locating target repos across a large set of repositories. It applies the latest coding standards, learning from previous implementations to maximize code quality and consistency."
**Visual:** GitHub organization view with animation connecting the 3 targeted repos

**Voiceover:** "BigWeaver shares its execution plan in Jira and starts work. The team gets real-time updates in Slack whenever they need them."
**Visual:** Execution plan posted to Jira → Concurrent tasks starting in Gaia interface → Slack progress update
**Voiceover:** "BigWeaver is asynchronously implementing changes, building test cases, and validating its own work across all repos simultaneously."
**Visual:** GitHub branches being created in parallel → Tasks checking off in Gaia → Test suites running
**Voiceover:** "The result? **[FEATURE_COMPONENTS]**. All happening in parallel across repos. Three GitHub pull requests, 47 files changed, all tests passing. BigWeaver updates Jira, posts to Slack, and notifies the team. Ready to review. This isn't code completion - this is enterprise-scale feature development."
**Visual:** BigWeaver updates Jira tickets → Slack notification → 3 GitHub PRs ~~with all checks passing ✓~~


* * *

### Scenario-Specific Scripts:

**AnyCompany Events Version:**
"Meet AnyCompany Events - a conference platform serving thousands of global events.  It uses a microservices architecture with different development teams maintaining components in separate repos.  The product team wants to add attendee networking capabilities, allowing attendees to connect with presenters and other attendees.  This is a feature that touches on multiple aspects of the platform.

They create an ticket in Jira and assign a task to BigWeaver. BW reviews the request, pulls API specs from Confluence, and determines the feature needs changes across 3 repositories: web app for the UI, admin dashboard for moderation, user service for connection APIs, notification service for alerts, analytics for tracking, and shared libraries for data models. It applies the latest coding standards, learning from previous implementations. BigWeaver shares its execution plan and starts work. We see updates in Gaia and a team member also asks BW in Slack for a status update. BigWeaver is asynchronously implementing the networking feature across all repos, building test cases, and validating its work. Three GitHub pull requests, 47 files changed, all tests passing. Three repos, all coordinated. Ready to review. This isn't code completion - this is enterprise-scale feature development."

#### **AnyCompany CRM Version:**

#### "Meet AnyCompany CRM - an enterprise CRM managing 50,000 sales reps. The product team wants to add AI-powered lead scoring. They create an ticket in Jira and assign a task to BigWeaver. BW reviews the request, pulls API specs from Confluence, and determines the feature needs changes across 3 repositories: web frontend for score display, API gateway for endpoints, lead service for the scoring algorithm, email service for automated follow-ups, analytics engine for model training, and shared UI components for score widgets. It applies the latest coding standards, learning from previous implementations. BigWeaver shares its execution plan and starts work. The team gets real-time updates in Slack. BigWeaver is asynchronously implementing the lead scoring feature across all repos, building test cases, and validating its work. Six GitHub pull requests, 52 files changed, all tests passing. Six repos, all coordinated. Ready to review. This isn't code completion - this is enterprise-scale feature development."

#### **AnyCompany Portal Version:**

#### "Meet AnyCompany Portal - a team productivity platform with 100,000 daily active users. The product team wants to add smart task assignment with AI-powered workload balancing. They create an ticket in Jira and assign a task to BigWeaver. BW reviews the request, pulls API specs from Confluence, and determines the feature needs changes across 3 repositories: web frontend for the assignment UI, task service for the algorithm, user service for skills management, notification service for alerts, analytics engine for predictions, and shared API library for data models. It applies the latest coding standards, learning from previous implementations. BigWeaver shares its execution plan and starts work. The team gets real-time updates in Slack. BigWeaver is asynchronously implementing the task assignment feature across all repos, building test cases, and validating its work. Six GitHub pull requests, 48 files changed, all tests passing. Six repos, all coordinated. Ready to review. This isn't code completion - this is enterprise-scale feature development."

### Visuals (adapt component names per scenario):

* **1:20-1:25:** BigWeaver reading from Jira task + Confluence docs
* **1:25-1:45:** 6-panel split screen showing concurrent work across repos
* **1:45-1:55:** Progress visualization:
    * 3 repos updating simultaneously
    * File change counters incrementing
    * Test suites running in parallel
* **1:55-2:10:** Integration actions + GitHub PR reveal:
    * 3 GitHub PRs created with detailed descriptions
    * Jira tickets: "In Review" status
    * Slack: "#engineering - [Feature] PRs ready for review"
    * All checks passing ✓

### Timing: 1:20 - 2:10

* * *

## VIDEO 2: Hobbes - AI-Powered Penetration Testing (50 seconds)

**Summary:** We will show how we turned an infrequent and costly exercise into a regular and low-cost part of the development process.   We want to highlight:
 - how easy it is to get started (Just give it an endpoint + credentials)
 - how autonomous it operates (visualize all of the things happening invisibly under the hood)
 - how it thinks like a security engineer (developing series of linked exploits, techniques, or vulnerabilities that it chains together to progressively gain deeper access to a target system or network)
 - how it not only provides findings, but gives you the remediation code to fix the problem, speeding up your security process and improving the overall security posture.  
 - how it closes the loop with BW to implement the recommended changes *(maybe?)*.

**Voiceover:** AnyCompany’s security team has traditionally relied on an external company to support their penetration testing.  The cost and coordination have limited the frequency they can run them.  Hobbes changes that by making it simple for organizations to turn PenTests into a regular aspect of security posture.
**Visual:** We show a user navigating to the Hobbes PenTest page.

**Voiceover:** Getting started is as simple as providing the endpoint for the site, credentials, and a link to the source code *<validate?>* 
**Visual:** Shows the user configuring and launching the PenTest 

*<need to validate this step.  Is this realistic of how Hobbes works?>*
**Voiceover:** Hobbes autonomously explores the assets, understanding the code, and the design patterns, building a plan for  the testing.
**Visual:** This is an animation that will simulate how Hobbes is accessing the data from different systems (I’m thinking showing GitHub access, Confluence for design docs *<I think we can share these with it>,* the website itself, etc.

**Voiceover:** Unlike static security scanning packages, Hobbes thinks like a security engineer, linking exploits, techniques, or vulnerabilities to progressively gain deeper access to a target system or network.
**Visual:** This will be an animation to show some chain-of-thought style reasoning of how Hobbes works.  *<we may be able to pull some visuals from the Hobbes interface as it share its reasoning>* 




### Script Template:

**Voiceover:** "Meanwhile, a developer submits a PR for **[HUMAN_FEATURE]**. Hobbes automatically triggers on the PR, deploying it to a test environment. Traditional scanners would flag 52 issues - mostly noise. Hobbes? It's an AI agent that thinks like a security expert. It discovers the **[COMPONENT]** endpoints, tests authentication flows, and actively exploits vulnerabilities. Finding one: **[VULN_1]**. Finding two: **[VULN_2]**. Finding three: **[VULN_3]**. Hobbes blocks the PR, creates Jira security tickets for each finding, documents the exploits in Confluence, and alerts the developer in Slack with severity levels. The developer fixes the issues and updates the PR. Hobbes re-runs the test. All vulnerabilities patched. PR approved. Updates Jira, posts to Slack: 'Security verified.' Security issues caught before production, no manual pen-testing needed.“
* * *

### Scenario-Specific Scripts:

#### **AnyCompany Events Version:**

#### "Meanwhile, a developer submits a PR adding speaker profile pages. Hobbes automatically triggers on the PR to perform a security review. Traditional scanners would flag 52 issues - mostly noise. Hobbes? It's an AI agent that thinks like a security expert.  When ready,  Hobbes can set out to perform Pen testing in a secure test sandbox environment. It discovers the new profile endpoints, tests authentication flows, and actively exploits vulnerabilities. Finding one: Insecure Direct Object Reference - accessing other speakers' private contact info by manipulating IDs. Finding two: Stored XSS in speaker bios - injecting malicious scripts that execute when profiles are viewed. Finding three: Path traversal - accessing arbitrary files on the server through profile image uploads. Hobbes blocks the PR, ~~creates Jira security tickets for each finding,~~ ~~documents the exploits in Confluence~~, and alerts the developer in Slack with severity levels. The developer fixes the issues and updates the PR. Hobbes re-runs the test. All vulnerabilities patched. PR approved. Posts to Slack: 'Security verified.' Security issues caught before production, no manual pen-testing needed.“

#### **AnyCompany CRM Version:**

#### "Meanwhile, a developer submits a PR adding custom report generation. Hobbes automatically triggers on the PR to perform a security review. Traditional scanners would flag 58 issues - mostly noise. Hobbes? It's an AI agent that thinks like a security expert.  When ready,  Hobbes can set out to perform Pen testing in a secure test sandbox environment. It discovers the new report endpoints, tests authentication flows, and actively exploits vulnerabilities. Finding one: SQL Injection in report filters - extracting customer data from other accounts. Finding two: Broken access control - sales reps generating reports for leads outside their territory. Finding three: Server-Side Request Forgery - making the server access internal resources through report URLs. Hobbes blocks the PR and alerts the developer in Slack with severity levels. The developer fixes the issues and updates the PR. Hobbes re-runs the test. All vulnerabilities patched. PR approved. Updates Jira, posts to Slack: 'Security verified.' Security issues caught before production, no manual pen-testing needed.“

#### **AnyCompany Portal Version:**

#### "Meanwhile, a developer submits a PR adding file attachments to tasks. Hobbes automatically triggers on the PR to perform a security review. Traditional scanners would flag 50 issues - mostly noise. Hobbes? It's an AI agent that thinks like a security expert.  When ready,  Hobbes can set out to perform Pen testing in a secure test sandbox environment. It discovers the new file upload endpoints, tests authentication flows, and actively exploits vulnerabilities. Finding one: Unrestricted file upload - uploading executable files that can be run on the server. Finding two: Path traversal - overwriting system files through manipulated file paths. Finding three: Broken access control - accessing file attachments from other companies' tasks. Hobbes blocks the PR, creates Jira security tickets for each finding, documents the exploits in Confluence, and alerts the developer in Slack with severity levels. The developer fixes the issues and updates the PR. Hobbes re-runs the test. All vulnerabilities patched. PR approved. Updates Jira, posts to Slack: 'Security verified.' Security issues caught before production, no manual pen-testing needed.“

### Visuals:

* **2:10-2:20:** Hobbes dashboard showing autonomous testing in progress (PLANNING → TESTING → TESTED)
* **2:20-2:35:** Split screen comparison:
    * Traditional scanner: 52 findings (static analysis, false positives)
    * Hobbes: 3 critical findings (active exploitation, real vulnerabilities)
* **2:35-2:50:** Three vulnerability demonstrations with integrations:
    * Finding 1 → Jira ticket "SEC-101: Critical [vulnerability type]"
    * Finding 2 → Confluence doc with PoC
    * Finding 3 → Slack alert "#security-critical"
* **2:50-3:00:** Integration loop completion:
    * PR blocked with security findings
    * Developer fixes issues, updates PR
    * Hobbes re-tests: All exploits blocked ✓
    * PR approved and merged
    * Jira: All tickets resolved
    * Slack: "✓ Security verification complete"

### Timing: 2:10 - 3:00

* * *

## VIDEO 3: CloudSmith - Infrastructure Intelligence (50 seconds)

### Script Template:

### **Voiceover:** "**[TRIGGER_EVENT]**. **[PRODUCT_NAME]**'s **[COMPONENT]** is slowing down - **[PROBLEM_DESCRIPTION]**. The on-call engineer gets paged, but CloudSmith is already working. It's analyzed CloudWatch metrics, **[DATA_SOURCE]** - everything. The diagnosis? **[ROOT_CAUSE]**. CloudSmith's recommendation: **[SOLUTION]**. Impact: **[IMPROVEMENT]**. CloudSmith creates a Jira ticket with the full analysis, posts the architecture diagram to Confluence, and sends a Slack alert to the team. The implementation plan is ready before the engineer finishes their coffee."

* * *

### Scenario-Specific Scripts:

#### **Scenario 1 — Lambda Errors (Use Case):**

#### "Quarter-end rush hits. AnyCompany CRM goes completely dark — sales reps can't view their pipeline, managers can't pull reports, and no deal updates are saving. As 5xx errors spike across the board, the on-call engineer gets paged, but AWS DevOps Agent is already investigating. It correlates CloudWatch Lambda error metrics, Datadog traces showing invocation failures, and recent GitHub commits to the REST API function. The diagnosis: a broken code deployment to the CRM's Lambda function is causing every invocation to fail with a runtime error. The agent recommends rolling back to the last working deployment, validates the function ARN and runtime configuration, and generates the exact rollback commands."

#### **Scenario 1 — Lambda Errors (Business Impact):**

#### "Impact: Lambda error rate dropped from 100% to zero and the CRM fully recovered once the broken deployment was rolled back. AWS DevOps Agent posts the full investigation — root cause, affected resources, and rollback steps — to the team's Slack channel in real time. For a sales team managing $10M+ in quarterly pipeline, even 1 hour of CRM downtime during business hours means missed follow-ups and lost revenue. The mitigation plan was ready before the engineer finished their coffee."

#### **Scenario 2 — RDS Slow Queries (Use Case):**

#### "Peak sales hours. AnyCompany CRM's dashboards are crawling — account pages that loaded in 100ms now take 5-10 seconds, pipeline filters time out, and the Team Performance dashboard is unusable. Sales reps are stuck staring at loading spinners. The on-call engineer gets paged, but AWS DevOps Agent is already investigating. It correlates CloudWatch RDS read latency spikes, Datadog query performance traces, CPU utilization surges, and recent GitHub activity. The diagnosis: critical PostgreSQL indexes on the opportunities and accounts tables were dropped, forcing full table scans on every query. The agent recommends recreating the specific indexes, provides the exact SQL commands, and identifies the affected tables and columns."

#### **Scenario 2 — RDS Slow Queries (Business Impact):**

#### "Impact: Query latency dropped from 5-10 seconds back to under 50ms and CPU utilization returned to baseline once the indexes were recreated. AWS DevOps Agent posts the full root cause analysis and remediation SQL to the team's Slack channel. If 50 reps each lose 15 minutes per day to slow CRM performance, that's 12.5 hours of lost selling time daily — directly impacting quota attainment and forecast accuracy. The mitigation plan with exact SQL commands was ready before the engineer finished their coffee."

#### **Scenario 3 — SQS Message Backlog (Use Case):**

#### "Monday morning hits. AnyCompany CRM's async workflows silently stall — opportunity stage-change notifications stop arriving, lead assignments pile up, and automated follow-up emails to prospects queue indefinitely. Sales reps don't realize hot leads are going cold. The on-call engineer gets paged, but AWS DevOps Agent is already investigating. It correlates CloudWatch SQS queue depth metrics, Datadog consumer lag traces, and message age patterns. The diagnosis: the SQS queue backing the CRM's event pipeline is overwhelmed with a sustained message backlog exceeding the alarm threshold. The agent recommends scaling consumers, identifies the queue ARN and current depth, and outlines steps to drain the backlog safely."

#### **Scenario 3 — SQS Message Backlog (Business Impact):**

#### "Impact: Queue depth dropped from critical levels back to zero and async workflows fully resumed once consumers were scaled and the backlog drained. AWS DevOps Agent posts the investigation timeline and remediation steps to the team's Slack channel. A 30-minute SQS delay during peak hours could impact dozens of active deals — if a $500K opportunity moves to 'Decision' stage but the notification never reaches the assigned rep, the competitor closes first. The mitigation plan was ready before the engineer finished their coffee."

### Visuals:

* **0:30-0:35:** Phone alert + AWS DevOps Agent Operator Portal investigating
* **0:35-0:45:** Fast-paced analysis visualization:
    * CloudWatch metrics showing Lambda errors / RDS latency spikes / SQS queue depth
    * Datadog traces showing correlated failures
    * GitHub commits showing recent code changes
* **0:45-1:05:** Investigation timeline:
    * Agent correlating multiple data sources (CloudWatch, Datadog, GitHub)
    * Root cause identified with supporting evidence
    * Mitigation plan generated with specific commands
* **1:05-1:20:** Integration actions + Results:
    * Slack notification posted with full investigation summary
    * Confluence page updated with architecture diagrams
    * Slack notification: "#engineering - Performance issue identified"
    * Results: [BEFORE] → [AFTER], load reduction

### Timing: 0:30 - 1:20

* * *

## TECHNICAL NOTES FOR PRODUCTION

### Demo Environment Setup (adapt per scenario):

### **AnyCompany Events:**

* Pre-populate with realistic conference data (45 sessions, 60 speakers)
* Stage networking feature components
* Prepare performance metrics showing 8s → 400ms improvement

**AnyCompany CRM:**

* Pre-populate with realistic CRM data (1000 leads, 50 sales reps)
* Stage lead scoring and automation components
* Prepare performance metrics showing 12s → 600ms improvement

**AnyCompany Portal:**

* Pre-populate with realistic tasks, teams, and user profiles
* Stage smart task assignment components
* Prepare performance metrics showing 6s → 300ms improvement

**All Scenarios:**

* Have CloudSmith analysis pre-run for smooth demo
* Stage BigWeaver PRs across 3 repos for quick reveal
* Prepare Hobbes findings in advance

### Visual Assets Needed:

* Agent logos (CloudSmith, BigWeaver, Hobbes)
* Product screenshots (before/after feature)
* Architecture diagrams (3-repo structure)
* Dashboard mockups with real metrics
* Code editor screens with syntax highlighting
* GitHub PR interface (3 simultaneous PRs)
* Performance comparison charts
* **Integration UI mockups:**
    * Jira tickets being created/updated
    * Confluence pages with architecture diagrams
    * Slack notifications in #engineering and #security-critical channels
    * GitHub PR descriptions with agent-generated content

* * *

## KEY MESSAGES TO EMPHASIZE

1. **CloudSmith:** Proactive infrastructure intelligence that identifies performance bottlenecks
2. **BigWeaver:** Autonomous code transformation across multiple repositories simultaneously
3. **Hobbes:** Security that thinks like an engineer, not a scanner
4. **Agent Integration:** The agents work together seamlessly across complex architectures
5. **Tool Integration:** Native integration with Jira, Confluence, GitHub, and Slack - agents work within your existing workflow
6. **Business Impact:** Real performance improvements and time reductions
7. **Developer Experience:** Focus on features, not infrastructure and security toil - agents handle the coordination

* * *

## QUICK REFERENCE: Scenario Comparison

|Element	|Oktank Events	|Oktank CRM	|Oktank Portal	|
|---	|---	|---	|---	|
|**Industry**	|Events/Conferences	|Sales/CRM	|Team Productivity	|
|---	|---	|---	|---	|
|**Scale**	|10K attendees	|50K sales reps	|100K DAU	|
|**Feature**	|Networking	|Lead Scoring	|Task Assignment	|
|**Perf Issue**	|8s → 400ms	|12s → 600ms	|6s → 300ms	|
|**Security 1**	|IDOR	|SQL Injection	|IDOR	|
|**Security 2**	|Command Injection	|Access Control	|Stored XSS	|
|**Security 3**	|JWT Vuln	|Rate Limit Bypass	|Access Control	|


