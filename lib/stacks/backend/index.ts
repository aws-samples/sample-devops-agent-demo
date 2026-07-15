import { RemovalPolicy, StackProps, Stage } from "aws-cdk-lib";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { NagSuppressions } from "cdk-nag";
import { Construct } from "constructs";
import { CommonStack } from "../../common/constructs/stack";
import { Auth } from "./constructs/auth";
import { Database } from "./database";
import { Networking } from "./networking";
import { RestApi } from "./rest-api";
import { Storage } from "./storage";

interface BackendProps extends StackProps {
    urls: string[];
    devOpsAgentWebhookUrl?: string;
    githubPat?: string;
    githubRepo?: string;
}

export class Backend extends CommonStack {
    public readonly environmentVariables: Record<string, string>;

    constructor(scope: Construct, id: string, props: BackendProps) {
        super(scope, id, props);

        const { urls } = props;

        const networking = new Networking(this, "networking");

        const auth = new Auth(this, "auth", {
            urls,
        });

        const storage = new Storage(this, "storage", {
            urls,
        });
        storage.storageBucket.grantReadWrite(auth.identityPool.authenticatedRole);

        // CRM Database
        const database = new Database(this, "database", {
            vpc: networking.vpc,
            securityGroup: networking.securityGroup,
            imagesBucket: storage.storageBucket,
        });

        // DevOps Agent webhook secret stored in Secrets Manager
        const webhookSecret = new Secret(this, "devOpsAgentWebhookSecret", {
            secretName: `${Stage.of(this)?.stageName || "dev"}-devops-agent-webhookSecret`,
            description: "HMAC secret for AWS DevOps Agent webhook signatures",
            removalPolicy: RemovalPolicy.DESTROY,
        });
        NagSuppressions.addResourceSuppressions(webhookSecret, [
            {
                id: "AwsSolutions-SMG4",
                reason: "Webhook HMAC secret is shared with an external service (AWS DevOps Agent) and cannot be auto-rotated without breaking the integration.",
            },
        ]);
        NagSuppressions.addResourceSuppressions(webhookSecret, [
            {
                id: "AwsSolutions-SMG4",
                reason: "Webhook HMAC secret is shared with external AWS DevOps Agent service. Automatic rotation would break webhook signature verification as both sides must use the same secret.",
            },
        ]);

        // GitHub integration — SSM parameters for PAT and repo
        // These parameters must be pre-created in SSM Parameter Store:
        //   /workshop/crm/github-pat  (SecureString) — GitHub Personal Access Token
        //   /workshop/crm/github-repo (String) — Repository in owner/repo format
        // Create them manually or via CLI before first deploy:
        //   aws ssm put-parameter --name "/workshop/crm/github-pat" --value "YOUR_PAT" --type "SecureString"
        //   aws ssm put-parameter --name "/workshop/crm/github-repo" --value "owner/repo" --type "String"

        const restApi = new RestApi(this, "restApi", {
            urls,
            userPool: auth.userPool,
            regionalWebAclArn: auth.regionalWebAclArn,
            vpc: networking.vpc,
            securityGroup: networking.securityGroup,
            databaseProxyEndpoint: database.proxyEndpoint,
            databaseName: database.databaseName,
            databaseSecret: database.databaseSecret,
            crmImagesBucket: storage.storageBucket,
            rdsPostgresLogGroup: database.postgresLogGroup,
            devOpsAgentWebhookUrl: props.devOpsAgentWebhookUrl,
            devOpsAgentWebhookSecretArn: webhookSecret.secretArn,
            devOpsAgentWebhookSecret: webhookSecret,
        });
        NagSuppressions.addStackSuppressions(this, [
            {
                id: "AwsSolutions-IAM4",
                reason: "Lambda functions require managed policies to interface with the vpc.",
            },
        ]);

        this.environmentVariables = {
            VITE_REGION: this.region!,
            VITE_STAGE: Stage.of(this)?.stageName || "unknown",
            VITE_BUILD_TIMESTAMP: new Date().toISOString(),
            VITE_BUILD_VERSION: process.env.npm_package_version || "0.0.0",
            VITE_CALLBACK_URL: urls[0],
            VITE_USER_POOL_ID: auth.userPool.userPoolId,
            ...(auth.userPoolDomain && {
                VITE_USER_POOL_DOMAIN_URL: auth.userPoolDomain.baseUrl().replace("https://", ""),
            }),
            VITE_USER_POOL_CLIENT_ID: auth.userPoolClient.userPoolClientId,
            VITE_IDENTITY_POOL_ID: auth.identityPool.identityPoolId,
            VITE_REST_API_URL: restApi.restApi.url,
            VITE_STORAGE_BUCKET_NAME: storage.storageBucket.bucketName,
            VITE_APPSYNC_API_URL: restApi.realtimeApi.api.graphqlUrl,
            VITE_MIDWAY: this.node.tryGetContext("accounts")?.[Stage.of(this)?.stageName || ""]?.midway ? "true" : "false",
        };
    }
}
