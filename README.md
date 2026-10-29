# AnyCompany CRM - AWS DevOps Agent Service Demo

> **A demo application for showcasing AWS Agent services**

## Overview

This is a demo application designed to highlight the functionality of AWS Agent services. It uses a fictitious CRM scenario (AnyCompany CRM) as a vehicle to demonstrate various AWS capabilities. This is not a real CRM system.

### Purpose

This application serves as a demonstration environment for:
- AWS Agent services and capabilities
- Serverless architecture patterns
- AWS service integrations
- Modern web application development on AWS

## Quick Links

- � **[Detailed Documentation](./README.demo.md)** - Complete CRM documentation
- 🎯 **[Setup Guide](./lib/stacks/frontend/app/DEMO-PREPARATION.md)** - Deployment checklist and guide
- 🖼️ **[CRM Assets](./tools/README-crm-assets.md)** - Mock data and images are included and seeded on deployment

## GitHub Integration Branch

The `crm-app-only-gh` branch contains the version of this codebase that is pushed to GitHub and integrated with the AWS DevOps Agent. This branch has all failure simulator code stripped out — the admin handler, simulator UI components, and related infrastructure are removed so that only the core CRM application code remains. To integrate with the DevOps Agent, duplicate the contents of this branch into your own GitHub repository and connect that repo in the agentspace (see [Connect GitHub](#post-deployment-connect-github-optional)).

This separation is intentional: when the DevOps Agent investigates an incident, it has access to the GitHub repository for code context. If the failure simulator code were present in the repo, the agent could discover it during investigation and identify the issue as an intentional simulation rather than a genuine production problem. By keeping the simulator code out of the GitHub-connected branch, the agent performs a clean, realistic investigation — analyzing logs, metrics, IAM policies, and deployment history without any hints that the failure was orchestrated.

## Features

### Pipeline Dashboard
- Track sample opportunities across sales stages
- Basic metrics and filtering
- Search and sort functionality

### Account Management
- View sample customer accounts
- Industry categorization
- Basic account details

### Personal Pipeline
- Individual sales rep views
- Sample quota tracking
- Performance metrics

### Team Performance
- Team-wide analytics
- Individual rep performance
- Basic reporting


## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.9+
- Docker
- AWS CDK CLI
- AWS Account with appropriate permissions

### Pre-Deployment: AWS DevOps Agent Setup

Before deploying the CDK stacks, you need to set up the AWS DevOps Agent service, create a webhook, and create an IdC user. These are one-time steps.

#### 1. Create an AWS DevOps Agent agentspace

1. Open the [DevOps Agent console](https://us-east-1.console.aws.amazon.com/aidevops/home?region=us-east-1)
2. Click **Create agent space**
3. Name it `crm-app` and complete the setup wizard (create the required IAM roles when prompted)
4. Associate your AWS account with the agentspace

#### 2. Create a webhook in the agentspace

1. In your `crm-app` agentspace → **Capabilities** tab → **Webhook** section → **Configure**
2. Click **Generate webhook** — this creates an HMAC key pair
3. Copy both the **webhook endpoint URL** and the **HMAC secret** — save them for later (you won't be able to retrieve the secret again)

#### 3. Create an IAM Identity Center (IdC) group and user

The DevOps Agent operator portal authenticates via IdC. You need to create a group (used during agentspace setup) and a user.

1. In the AWS Console, navigate to **IAM Identity Center** → **Groups** → **Create group**
2. Name the group (e.g., `DevOpsAgentOperators`) — you will select this group when configuring the agentspace operator app
3. Navigate to **IAM Identity Center** → **Users** → **Add user**
4. Set the username to `aws_user`, fill in your email address, and select **Send an email to the user with password setup instructions**
5. Add the user to the group you created in step 2, then complete the user creation
6. Open the setup email and follow the link to set a strong password of your choosing
7. Save the username (`aws_user`) and the password you chose for the next step

> **Note:** Set the `idcUsername` and `idcPassword` values in `cdk.json` to match the IdC user you created. The CRM app's Step 2 page displays them with copy buttons so demo viewers can log into the operator portal. **Do not commit a real password to source control** — use your own value locally.

> When setting up the agentspace operator app (step 1), select this IdC group to grant portal access.

#### 4. Update `cdk.json`

Open `cdk.json` and update the following values in the `context` section:

```json
{
    "context": {
        "accounts": {
            "dev": {
                "number": "YOUR_AWS_ACCOUNT_ID",
                "region": "us-east-1"
            }
        },
        "devOpsAgentWebhookUrl": "YOUR_WEBHOOK_URL_FROM_STEP_2",
        "devOpsAgentPortalUrl": "YOUR_OPERATOR_PORTAL_URL",
        "idcUsername": "aws_user",
        "idcPassword": "[IDC_PASSWORD]"
    }
}
```

- `accounts.dev.number` — your AWS account ID
- `devOpsAgentWebhookUrl` — the webhook endpoint URL from step 2
- `devOpsAgentPortalUrl` — the operator portal web app URL, found in the agentspace **Access summary** section (e.g., `https://<id>.aidevops.global.app.aws/authorizer/login`)
- `idcUsername` / `idcPassword` — the IdC credentials from step 3 (displayed on the CRM app's Step 2 page with copy buttons)

### Deploy

```bash
# 1. Clone and install
git clone [repository-url]
cd [repository-name]
npm install

# 2. Deploy to AWS using kit CLI
npm run kit
# Select your account, then choose "Deploy CDK Stack(s)"

# Or deploy all stacks directly
npm run kit -- deploy dev --all

# 3. Access the application
# Open CloudFormation console → Find frontend stack → Click CloudFront URL
```

### Post-Deployment: Store the webhook HMAC secret

After the first deployment, a Secrets Manager secret named `dev-devops-agent-webhookSecret` is created automatically. Store the HMAC secret from pre-deployment step 2:

```bash
aws secretsmanager put-secret-value \
  --secret-id dev-devops-agent-webhookSecret \
  --secret-string "YOUR_HMAC_SECRET_FROM_PRE_DEPLOYMENT_STEP_2"
```

This is the only post-deployment step. The failure simulator uses this secret to sign webhook payloads sent to the DevOps Agent.

### Post-Deployment: Connect GitHub (optional)

Integrate a GitHub repository with the DevOps Agent so it can correlate deployments, review recent commits, and identify code changes during investigations. Use the `crm-app-only-gh` branch — it has the failure simulator code stripped out so the agent investigates incidents without discovering the simulation.

1. Create a new GitHub repository in your own account/organization
2. Push the `crm-app-only-gh` branch contents to it:
   ```bash
   git checkout crm-app-only-gh
   git remote add github https://github.com/YOUR_ORG/YOUR_REPO.git
   git push github crm-app-only-gh:main
   ```
3. In the [DevOps Agent console](https://us-east-1.console.aws.amazon.com/aidevops/home?region=us-east-1), select your `crm-app` agentspace
4. Go to **Integrations** → **Add Integration** → **GitHub**
5. Authorize the AWS DevOps Agent GitHub App for your organization
6. Select the repository you created in step 1

### AWS Account Setup — External Access Considerations

Third-party integrations require IAM roles that grant external access to your AWS account. Creating IAM roles with external trust policies can have security implications and may be subject to your organization's security policies.

**Recommendation:** Deploy the demo infrastructure in a dedicated, non-production account and follow your organization's security guidance for creating IAM roles that grant external access. Review any trust policies with your security team before enabling third-party integrations.


## Architecture

![AnyCompany CRM — AWS DevOps Agent Architecture](docs/DevopsAgentDiagram.png)

### Architecture Workflow

AWS DevOps Agent integrates with your observability tools, CI/CD pipelines, and communication channels to provide autonomous incident response.

1. User accesses app via CloudFront, protected by AWS WAF
2. CloudFront serves the React frontend from S3 origin
3. Cognito authenticates the user and issues a JWT token
4. API Gateway validates the JWT and routes REST requests
5. Proxy Lambda handles API logic and invokes backend services
6. RDS Proxy manages connections to PostgreSQL inside the VPC
7. Admin triggers failure scenarios (SQS backlog, Lambda deploy, RDS index)
8. AppSync streams real-time failure events to the frontend via WebSocket
9. Lambda signs an HMAC webhook using Secrets Manager
10. DevOps Agent receives the webhook, investigates, performs RCA, and generates a mitigation plan
11. Failure logs stream through CloudWatch → Firehose → S3 for analysis

### Technology Stack

**Frontend:**
- React 18 + TypeScript
- Vite build tool
- AWS Cloudscape Design System
- React Router v6
- AWS Amplify for backend integration

**Backend:**
- Amazon S3 + CloudFront for hosting
- Amazon Cognito for authentication
- API Gateway + Lambda for REST API
- Amazon RDS PostgreSQL with RDS Proxy
- Amazon VPC with private subnets
- AWS WAF for security

### Project Structure

```
├── lib/stacks/
│   ├── frontend/              # Frontend hosting and React app
│   │   └── app/              # CRM application
│   │       ├── src/pages/CRM/    # CRM pages and components
│   │       └── README-CRM.md
│   └── backend/              # Backend services
│       ├── constructs/
│       │   └── auth.ts       # Cognito authentication
│       ├── rest-api/         # API Gateway REST API
│       ├── database.ts       # RDS PostgreSQL database
│       ├── networking.ts     # VPC configuration
│       └── storage/          # S3 storage
├── tools/                    # Image generation scripts
│   ├── generate-crm-assets.sh
│   └── README-crm-assets.md
└── docs/                     # Documentation
    └── kit/                  # Starter kit docs
```

## Fictitious Data

The application includes generated fictitious data for demo purposes:

- **50,000 Mock Opportunities**: Randomly generated for demonstration
- **75 Fictitious Accounts**: Sample company data
- **12 Demo Users**: Simulated sales reps and managers

**Note**: All data is completely fictitious and generated for demonstration purposes only.


## Future Enhancements

### Performance Targets
- ✅ Page load: < 2 seconds
- ✅ Filter response: < 500ms
- ✅ Search response: < 300ms (debounced)
- ✅ Table sorting: Instant

### Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+


## Pricing Estimation

| AWS Service | Monthly Cost (Estimated) |
|-------------|-------------------------|
| Amazon S3 | $5 - $20 |
| Amazon CloudFront | $10 - $50 |
| AWS WAF | $10 - $30 |
| Amazon Cognito | $0 - $10 (first 50K MAU free) |
| Amazon API Gateway | $5 - $20 |
| Amazon RDS PostgreSQL | $50 - $150 |
| **Total** | **$120 - $380/month** |

*Use [AWS Pricing Calculator](https://calculator.aws/) for detailed estimates.*

## Documentation

### Main Documentation
- **[Detailed README](./README.demo.md)** - Complete CRM documentation
- **[CRM Application](./lib/stacks/frontend/app/README-CRM.md)** - Frontend app docs
- **[Image Generation](./tools/README-crm-assets.md)** - Asset generation guide

### Starter Kit Documentation
- **[Machine Setup](./docs/kit/machine-setup.md)** - Developer machine setup
- **[Demo Creation](./docs/kit/demo-creation.md)** - Creating new demos
- **[Demo Setup](./docs/kit/demo-setup.md)** - Setting up existing demos
- **[Design Documentation](./docs/kit/design.md)** - Starter kit architecture

## Troubleshooting

### Build Errors
```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Deployment Issues
```bash
# Check AWS credentials
aws sts get-caller-identity

# Bootstrap CDK (first time only)
npm run kit -- bootstrap dev

# Deploy with kit CLI
npm run kit -- deploy dev --all
```

### Frontend Issues
```bash
# Clear Vite cache
rm -rf lib/stacks/frontend/app/node_modules/.vite

# Rebuild
npm run -w frontend build
```


## Clean-up

To remove all AWS resources:

```bash
# Delete all stacks using kit CLI
npm run kit
# Select your account, then choose "Destroy CDK Stack(s)"

# Or use CDK directly
npm run cdk destroy "*/**"
```

**Note**: S3 buckets may need to be emptied before deletion.

## Support

For questions about this demo application:
1. Review the documentation in this repository
2. Contact your AWS support team

## Note

This is a demo application for showcasing AWS Agent services. It is not intended for production use or as a real CRM system.
- Replace mock data with real API calls
- Add comprehensive authentication
- Implement data persistence
- Add error handling and logging
- Implement rate limiting
- Add monitoring and alerting

## License

[Apache License Version 2.0](/LICENSE)
