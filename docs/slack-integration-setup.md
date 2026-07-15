# Slack Integration Setup

This guide covers setting up the Slack bot that allows users to join the `#devops-agent` channel directly from the CRM Cross View Dashboard.

## Prerequisites

- Admin access to the Amazon Sandbox Slack workspace
- AWS CLI configured with access to the target account

## 1. Create a Slack App

1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Name it `devopsagent` (or similar)
4. Select your Amazon Sandbox workspace
5. Click "Create App"

## 2. Configure Bot Token Scopes

1. In the app settings, go to **OAuth & Permissions** (left sidebar)
2. Scroll to **Bot Token Scopes**
3. Add the following scopes:
   - `channels:manage` — invite users to public channels
   - `channels:join` — allow the bot to join channels
   - `channels:read` — read channel info
   - `users:read` — look up users
   - `users:read.email` — look up users by email

## 3. Set Redirect URL

1. Still on **OAuth & Permissions**, scroll to **Redirect URLs**
2. Add your CloudFront URL, e.g.: `https://d1tmoe9yvu1m9i.cloudfront.net/usecase`
3. Click "Save URLs"

## 4. Install the App to Workspace

1. Go to **Install App** in the left sidebar
2. Click "Install to Workspace"
3. On Enterprise Grid (Amazon Sandbox), this may require admin approval
4. If you see "Request to Workspace Install Submitted", go to workspace admin settings → Manage Apps → approve the pending request
5. After approval, go back to **Install App** and click "Install to Workspace" again
6. Approve the OAuth consent screen
7. Copy the **Bot User OAuth Token** (`xoxb-...`) from the OAuth & Permissions page

## 5. Store the Bot Token in AWS Secrets Manager

```bash
aws secretsmanager create-secret \
  --name "devops-agent/slack-bot-token" \
  --secret-string "xoxb-YOUR-TOKEN-HERE" \
  --region us-east-1
```

If the secret already exists and you need to update it (e.g., after reinstalling the app):

```bash
aws secretsmanager update-secret \
  --secret-id "devops-agent/slack-bot-token" \
  --secret-string "xoxb-YOUR-NEW-TOKEN-HERE" \
  --region us-east-1
```

## 6. Update the Channel ID (if needed)

The channel ID is hardcoded in `lib/stacks/backend/rest-api/proxy/handlers/slack_handler.py`:

```python
SLACK_CHANNEL_ID = 'C0AMVH85MB3'
```

To find a channel ID: open Slack, right-click the channel name → "View channel details" → the ID is at the bottom of the details panel.

## 7. Deploy

```bash
npx cdk deploy "dev/devops-agent-backend" "dev/devops-agent-frontendDeployment" --require-approval never
```

Then invalidate CloudFront:

```bash
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

## How It Works

1. User clicks "Join Channel" on the Cross View Dashboard
2. Frontend sends `POST /slack/join-channel` to the REST API
3. Backend extracts the user's email from the Cognito/Midway JWT
4. Backend calls Slack `users.lookupByEmail` to find the Slack user ID
5. Backend calls Slack `conversations.join` to ensure the bot is in the channel
6. Backend calls Slack `conversations.invite` to add the user
7. If the user is already in the channel, a friendly message is returned

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `missing_scope` | Bot token missing required scopes | Add scopes in OAuth & Permissions, reinstall app |
| `not_in_channel` | Bot not in the target channel | Add `channels:join` scope, or manually add the bot to the channel |
| `users_not_found` | Email not found in Slack workspace | Verify the user's Cognito email matches their Slack email |
| `channel_not_found` | Wrong channel ID | Update `SLACK_CHANNEL_ID` in slack_handler.py |
| `invalid_auth` | Token expired or revoked | Reinstall the app and update the token in Secrets Manager |
