import { aws_apigateway as apigateway, aws_iam, Duration, RemovalPolicy, Stack, Tags } from "aws-cdk-lib";
import {
    AuthorizationType,
    CognitoUserPoolsAuthorizer,
    Cors,
    GatewayResponse,
    LambdaIntegration,
    LogGroupLogDestination,
    MethodLoggingLevel,
    RequestValidator,
    ResponseType,
    AccessLogFormat,
    AccessLogField,
} from "aws-cdk-lib/aws-apigateway";
import { GraphqlApi } from "aws-cdk-lib/aws-appsync";
import { UserPool } from "aws-cdk-lib/aws-cognito";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";
import { SecurityGroup, SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";
import { Architecture, CfnEventSourceMapping, Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { CfnDeliveryStream } from "aws-cdk-lib/aws-kinesisfirehose";
import { LogGroup, ILogGroup, RetentionDays, CfnSubscriptionFilter } from "aws-cdk-lib/aws-logs";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { Topic } from "aws-cdk-lib/aws-sns";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { CfnWebACLAssociation } from "aws-cdk-lib/aws-wafv2";
import { NagSuppressions } from "cdk-nag";
import { Construct } from "constructs";
import * as path from "path";
import { CommonPythonFunction } from "../../../common/blueprints";
import { RealtimeApi } from "../constructs/realtime-api";

interface RestApiProps {
    urls: string[];
    vpc?: Vpc;
    securityGroup?: SecurityGroup;
    userPool: UserPool;
    regionalWebAclArn: string;
    // CRM database resources
    databaseProxyEndpoint?: string;
    databaseName?: string;
    databaseSecret?: Secret;
    crmImagesBucket?: Bucket;
    rdsPostgresLogGroup?: ILogGroup;
    // Real-time API for events streaming
    realtimeApi?: GraphqlApi;
    // DevOps Agent webhook configuration
    devOpsAgentWebhookUrl?: string;
    devOpsAgentWebhookSecretArn?: string;
    devOpsAgentWebhookSecret?: Secret;
}

export class RestApi extends Construct {
    public readonly restApi: apigateway.LambdaRestApi;
    public readonly realtimeApi: RealtimeApi;

    constructor(scope: Construct, id: string, props: RestApiProps) {
        super(scope, id);

        const { 
            urls, 
            vpc, 
            securityGroup, 
            userPool, 
            regionalWebAclArn,
            databaseProxyEndpoint,
            databaseName,
            databaseSecret,
            crmImagesBucket
        } = props;

        // Failure Simulator Infrastructure
        // DynamoDB table for storing failure scenario configuration
        const configTable = new Table(this, "configTable", {
            partitionKey: { name: "id", type: AttributeType.STRING },
            sortKey: { name: "sk", type: AttributeType.STRING },
            billingMode: BillingMode.PAY_PER_REQUEST,
            pointInTimeRecovery: true,
            removalPolicy: RemovalPolicy.DESTROY,
        });

        // CloudWatch Log Group for application error tracking
        const failureErrorsLogGroup = new LogGroup(this, "failureErrorsLogGroup", {
            logGroupName: "/crm-demo/application-errors",
            retention: RetentionDays.TWO_WEEKS,
            removalPolicy: RemovalPolicy.DESTROY,
        });
        Tags.of(failureErrorsLogGroup).add("env", "dev");
        Tags.of(failureErrorsLogGroup).add("service", "crm-demo");
        Tags.of(failureErrorsLogGroup).add("component", "error-tracking");

        // S3 bucket for Firehose delivery destination
        const firehoseDestinationBucket = new Bucket(this, "firehoseDestinationBucket", {
            removalPolicy: RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            enforceSSL: true,
        });
        NagSuppressions.addResourceSuppressions(
            firehoseDestinationBucket,
            [
                {
                    id: "AwsSolutions-S1",
                    reason: "Access logs not required for Firehose destination bucket in demo.",
                },
            ],
            true
        );

        // IAM role for Firehose to write to S3
        const firehoseRole = new aws_iam.Role(this, "firehoseRole", {
            assumedBy: new aws_iam.ServicePrincipal("firehose.amazonaws.com"),
        });
        firehoseDestinationBucket.grantReadWrite(firehoseRole);

        // Kinesis Firehose delivery stream
        const firehoseStream = new CfnDeliveryStream(this, "failureLogsFirehose", {
            deliveryStreamName: "crm-application-logs-stream",
            deliveryStreamType: "DirectPut",
            s3DestinationConfiguration: {
                bucketArn: firehoseDestinationBucket.bucketArn,
                roleArn: firehoseRole.roleArn,
                prefix: "application-logs/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/",
                errorOutputPrefix: "application-logs-errors/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/!{firehose:error-output-type}/",
                bufferingHints: {
                    intervalInSeconds: 60,
                    sizeInMBs: 5,
                },
                compressionFormat: "GZIP",
            },
        });
        NagSuppressions.addResourceSuppressions(
            firehoseStream,
            [
                {
                    id: "AwsSolutions-KDF1",
                    reason: "Server-side encryption not required for demo Firehose stream.",
                },
            ],
            true
        );

        // IAM role for CloudWatch Logs to write to Firehose
        const logsToFirehoseRole = new aws_iam.Role(this, "logsToFirehoseRole", {
            assumedBy: new aws_iam.ServicePrincipal("logs.amazonaws.com"),
        });
        const logsToFirehosePolicy = new aws_iam.Policy(this, "logsToFirehosePolicy", {
            statements: [
                new aws_iam.PolicyStatement({
                    effect: aws_iam.Effect.ALLOW,
                    actions: ["firehose:PutRecord", "firehose:PutRecordBatch"],
                    resources: [firehoseStream.attrArn],
                }),
            ],
        });
        logsToFirehoseRole.attachInlinePolicy(logsToFirehosePolicy);

        // CloudWatch Logs subscription filter to send logs to Firehose
        const subscriptionFilter = new CfnSubscriptionFilter(this, "failureLogsSubscription", {
            logGroupName: failureErrorsLogGroup.logGroupName,
            filterPattern: "", // Empty pattern matches all log events
            destinationArn: firehoseStream.attrArn,
            roleArn: logsToFirehoseRole.roleArn,
        });
        // Ensure the policy is created before the subscription filter
        subscriptionFilter.node.addDependency(logsToFirehosePolicy);

        // AppSync API for real-time event streaming
        const realtimeApi = new RealtimeApi(this, "realtimeApi", {
            userPool,
        });
        this.realtimeApi = realtimeApi;

        // SNS topic for notification failure scenarios
        const notificationTopic = new Topic(this, "notificationTopic", {
            displayName: "CRM Notification Topic",
            enforceSSL: true,
        });

        // Dead-letter queue for the notification queue
        const notificationDlq = new Queue(this, "notificationDlq", {
            retentionPeriod: Duration.days(14),
            enforceSSL: true,
        });

        // SQS queue for queue permission failure scenarios
        const notificationQueue = new Queue(this, "notificationQueue", {
            retentionPeriod: Duration.days(1),
            enforceSSL: true,
            visibilityTimeout: Duration.seconds(60),
            deadLetterQueue: {
                queue: notificationDlq,
                maxReceiveCount: 15,
            },
        });
        // Tags for CloudWatch monitoring
        Tags.of(notificationQueue).add("env", "dev");
        Tags.of(notificationQueue).add("service", "crm-demo");
        Tags.of(notificationQueue).add("component", "notification-queue");
        Tags.of(notificationQueue).add("monitor", "sqs-backlog");

        // Queue consumer Lambda - processes messages from the notification queue
        // Handles async CRM events: stage changes, account updates, lead assignments
        const queueConsumerFunction = new NodejsFunction(this, "queueConsumerFunction", {
            entry: path.join(__dirname, "queue-consumer", "index.ts"),
            handler: "handler",
            runtime: Runtime.NODEJS_22_X,
            architecture: Architecture.ARM_64,
            timeout: Duration.seconds(30),
        });

        // Grant SQS permissions explicitly so the event source mapping can be created.
        // The deny policy below will override these at runtime — this is the failure scenario.
        notificationQueue.grantConsumeMessages(queueConsumerFunction);

        // Create event source mapping via L1 construct to control dependency ordering.
        // Lambda validates SQS permissions at creation time, so the allow grant must exist
        // before the mapping is created, and the deny policy must come after.
        const eventSourceMapping = new CfnEventSourceMapping(this, "queueConsumerEventSource", {
            functionName: queueConsumerFunction.functionName,
            eventSourceArn: notificationQueue.queueArn,
            batchSize: 10,
            maximumBatchingWindowInSeconds: 5,
            functionResponseTypes: ["ReportBatchItemFailures"],
            enabled: true,
        });
        // Ensure the allow policy is created before the mapping
        eventSourceMapping.node.addDependency(queueConsumerFunction.role!);

        // Tags for CloudWatch monitoring
        Tags.of(queueConsumerFunction).add("env", "dev");
        Tags.of(queueConsumerFunction).add("service", "crm-demo");
        Tags.of(queueConsumerFunction).add("component", "queue-consumer");
        Tags.of(queueConsumerFunction).add("monitor", "sqs-consumer");
        NagSuppressions.addResourceSuppressions(
            queueConsumerFunction,
            [
                {
                    id: "AwsSolutions-IAM4",
                    reason: "Queue consumer Lambda uses basic execution role for demo purposes.",
                },
                {
                    id: "AwsSolutions-SQS8",
                    reason: "Queue consumer uses reportBatchItemFailures for partial batch handling.",
                },
            ],
            true
        );

        // Permanent deny policy on the consumer role — blocks SQS message processing.
        // The consumer Lambda gets triggered by the event source mapping but every
        // ReceiveMessage/DeleteMessage call fails with AccessDenied.
        // This is baked in at deploy time so there's no CloudTrail event at incident time.
        // IMPORTANT: This must be created AFTER the event source mapping to avoid deployment failure.
        const denyPolicy = new aws_iam.Policy(this, "sqsConsumerDenyPolicy", {
            policyName: "SQSAccessPolicy",
            statements: [
                new aws_iam.PolicyStatement({
                    effect: aws_iam.Effect.DENY,
                    actions: [
                        "sqs:ReceiveMessage",
                        "sqs:DeleteMessage",
                        "sqs:GetQueueAttributes",
                        "sqs:ChangeMessageVisibility",
                    ],
                    resources: ["*"],
                }),
            ],
        });
        queueConsumerFunction.role!.attachInlinePolicy(denyPolicy);
        denyPolicy.node.addDependency(eventSourceMapping);

        // CRM Event Processor Lambda - handles async event processing for pipeline events
        const targetLambdaFunction = new NodejsFunction(this, "targetLambdaFunction", {
            entry: path.join(__dirname, "target-lambda", "index.ts"),
            handler: "handler",
            runtime: Runtime.NODEJS_22_X,
            architecture: Architecture.ARM_64,
            timeout: Duration.seconds(30),
        });
        // Tags for CloudWatch monitoring
        Tags.of(targetLambdaFunction).add("env", "dev");
        Tags.of(targetLambdaFunction).add("service", "crm-demo");
        Tags.of(targetLambdaFunction).add("component", "event-processor");
        Tags.of(targetLambdaFunction).add("monitor", "lambda-error-rate");
        NagSuppressions.addResourceSuppressions(
            targetLambdaFunction,
            [
                {
                    id: "AwsSolutions-IAM4",
                    reason: "Event processor Lambda uses basic execution role for demo purposes.",
                },
            ],
            true
        );

        const restApiLogGroup = new LogGroup(this, "restApiLogGroup", {
            removalPolicy: RemovalPolicy.DESTROY,
            retention: RetentionDays.THREE_MONTHS,
        });

        const restApi = new apigateway.RestApi(this, "restApi", {
            defaultMethodOptions: {
                authorizationType: AuthorizationType.COGNITO,
                authorizer: new CognitoUserPoolsAuthorizer(this, "authorizer", {
                    cognitoUserPools: [userPool],
                    identitySource: "method.request.header.Authorization",
                }),
            },
            defaultCorsPreflightOptions: {
                allowCredentials: true,
                allowOrigins: urls,
                allowMethods: Cors.ALL_METHODS,
                allowHeaders: Cors.DEFAULT_HEADERS,
            },
            deployOptions: {
                accessLogDestination: new LogGroupLogDestination(restApiLogGroup),
                accessLogFormat: AccessLogFormat.jsonWithStandardFields({
                    caller: true,
                    httpMethod: true,
                    ip: true,
                    protocol: true,
                    requestTime: true,
                    resourcePath: true,
                    responseLength: true,
                    status: true,
                    user: true,
                }),
                loggingLevel: MethodLoggingLevel.INFO,
                metricsEnabled: true,
                dataTraceEnabled: false,
            },
            cloudWatchRole: true,
            cloudWatchRoleRemovalPolicy: RemovalPolicy.DESTROY,
        });
        NagSuppressions.addResourceSuppressions(
            restApi,
            [
                {
                    id: "AwsSolutions-IAM4",
                    reason: "RestApi requires the AmazonAPIGatewayPushToCloudWatchLogs policy for logging.",
                },
            ],
            true
        );

        // Add CORS headers to API Gateway error responses (5xx / integration errors)
        // This ensures CORS headers are present even when Lambda times out or errors.
        // Note: DEFAULT_4XX and ACCESS_DENIED are excluded because they conflict with
        // the CORS preflight mock responses set by defaultCorsPreflightOptions.
        const corsResponseHeaders: Record<string, string> = {
            "method.response.header.Access-Control-Allow-Origin": `'${urls[0]}'`,
            "method.response.header.Access-Control-Allow-Headers": "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'",
            "method.response.header.Access-Control-Allow-Methods": "'GET,POST,PUT,DELETE,OPTIONS'",
            "method.response.header.Access-Control-Allow-Credentials": "'true'",
        };

        for (const responseType of [
            ResponseType.DEFAULT_5XX,
            ResponseType.INTEGRATION_TIMEOUT,
            ResponseType.INTEGRATION_FAILURE,
        ]) {
            new GatewayResponse(this, `gatewayResponse${responseType.responseType}`, {
                restApi,
                type: responseType,
                responseHeaders: corsResponseHeaders,
            });
        }

        const environment: Record<string, string> = {
            ALLOWED_ORIGINS: JSON.stringify(urls),
        };

        // Add CRM database environment variables if resources are provided
        if (databaseProxyEndpoint) {
            environment.DATABASE_PROXY_ENDPOINT = databaseProxyEndpoint;
        }
        if (databaseName) {
            environment.DATABASE_NAME = databaseName;
        }
        if (databaseSecret) {
            environment.DATABASE_SECRET_ARN = databaseSecret.secretArn;
        }
        if (crmImagesBucket) {
            environment.CRM_IMAGES_BUCKET = crmImagesBucket.bucketName;
        }

        // Failure simulator environment variables
        environment.CONFIG_TABLE_NAME = configTable.tableName;
        environment.NOTIFICATION_TOPIC_ARN = notificationTopic.topicArn;
        environment.NOTIFICATION_QUEUE_URL = notificationQueue.queueUrl;
        environment.NOTIFICATION_DLQ_URL = notificationDlq.queueUrl;
        environment.TARGET_LAMBDA_ARN = targetLambdaFunction.functionArn;
        environment.QUEUE_CONSUMER_FUNCTION_NAME = queueConsumerFunction.functionName;
        environment.APPLICATION_ERRORS_LOG_GROUP = failureErrorsLogGroup.logGroupName;
        environment.APPSYNC_API_URL = realtimeApi.api.graphqlUrl;

        // DevOps Agent webhook configuration
        if (props.devOpsAgentWebhookUrl) {
            environment.DEVOPS_AGENT_WEBHOOK_URL = props.devOpsAgentWebhookUrl;
        }
        if (props.devOpsAgentWebhookSecretArn) {
            environment.DEVOPS_AGENT_WEBHOOK_SECRET_ARN = props.devOpsAgentWebhookSecretArn;
        }

        // AWS Account ID for DevOps Agent incident context
        environment.AWS_ACCOUNT_ID = Stack.of(this).account;

        const proxyFunction = new CommonPythonFunction(this, "proxyFunction", {
            entry: path.join(__dirname, "proxy"),
            index: "index.py",
            handler: "lambda_handler",
            environment,
            memorySize: 1024,
            timeout: Duration.minutes(2),
            ...(vpc && {
                vpc,
                vpcSubnets: {
                    subnetType: SubnetType.PRIVATE_WITH_EGRESS,
                },
                securityGroups: [securityGroup!],
            }),
        });
        // Tags for CloudWatch monitoring
        Tags.of(proxyFunction).add("env", "dev");
        Tags.of(proxyFunction).add("service", "crm-demo");
        Tags.of(proxyFunction).add("component", "api-proxy");

        // Grant permissions for CRM database resources
        if (databaseSecret) {
            databaseSecret.grantRead(proxyFunction);
        }
        if (crmImagesBucket) {
            crmImagesBucket.grantRead(proxyFunction);
        }

        // Grant read access to DevOps Agent webhook secret
        if (props.devOpsAgentWebhookSecret) {
            props.devOpsAgentWebhookSecret.grantRead(proxyFunction);
        }

        // Grant CloudWatch metrics permissions for database monitoring
        if (databaseProxyEndpoint) {
            proxyFunction.addToRolePolicy(new aws_iam.PolicyStatement({
                effect: aws_iam.Effect.ALLOW,
                actions: ['cloudwatch:PutMetricData'],
                resources: ['*']
            }));
            NagSuppressions.addResourceSuppressions(
                proxyFunction,
                [
                    {
                        id: "AwsSolutions-IAM5",
                        reason: "CloudWatch PutMetricData requires wildcard resource as metrics cannot be scoped to specific ARNs.",
                    },
                ],
                true
            );
        }

        // Grant permissions for failure simulator resources
        configTable.grantReadWriteData(proxyFunction);
        
        // SNS permissions for modifying topic policies
        notificationTopic.grantPublish(proxyFunction);
        proxyFunction.addToRolePolicy(new aws_iam.PolicyStatement({
            effect: aws_iam.Effect.ALLOW,
            actions: ['sns:SetTopicAttributes', 'sns:GetTopicAttributes'],
            resources: [notificationTopic.topicArn],
        }));

        // SQS permissions for modifying queue policies and backlog spike scenario
        notificationQueue.grantSendMessages(proxyFunction);
        proxyFunction.addToRolePolicy(new aws_iam.PolicyStatement({
            effect: aws_iam.Effect.ALLOW,
            actions: ['sqs:SetQueueAttributes', 'sqs:GetQueueAttributes', 'sqs:PurgeQueue'],
            resources: [notificationQueue.queueArn, notificationDlq.queueArn],
        }));

        // Lambda permissions for invoking the event processor (for metrics probing and failure injection)
        proxyFunction.addToRolePolicy(new aws_iam.PolicyStatement({
            effect: aws_iam.Effect.ALLOW,
            actions: [
                'lambda:InvokeFunction',
                'lambda:GetFunction',
            ],
            resources: [targetLambdaFunction.functionArn],
        }));

        // Lambda self-invoke permission (for RDS background query loop)
        proxyFunction.addToRolePolicy(new aws_iam.PolicyStatement({
            effect: aws_iam.Effect.ALLOW,
            actions: ['lambda:InvokeFunction'],
            resources: [`arn:aws:lambda:${Stack.of(this).region}:${Stack.of(this).account}:function:*`],
        }));

        // S3 permissions for modifying bucket policies (if bucket exists)
        if (crmImagesBucket) {
            proxyFunction.addToRolePolicy(new aws_iam.PolicyStatement({
                effect: aws_iam.Effect.ALLOW,
                actions: ['s3:PutBucketPolicy', 's3:GetBucketPolicy', 's3:DeleteBucketPolicy'],
                resources: [crmImagesBucket.bucketArn],
            }));
        }

        // CloudWatch Logs permissions for failure events
        failureErrorsLogGroup.grantWrite(proxyFunction);
        proxyFunction.addToRolePolicy(new aws_iam.PolicyStatement({
            effect: aws_iam.Effect.ALLOW,
            actions: ['logs:FilterLogEvents', 'logs:CreateLogStream'],
            resources: [failureErrorsLogGroup.logGroupArn, `${failureErrorsLogGroup.logGroupArn}:*`],
        }));

        // AppSync permissions for publishing failure events
        realtimeApi.grantPublish(proxyFunction);

        // CloudWatch Metrics permissions for metrics dashboard
        proxyFunction.addToRolePolicy(new aws_iam.PolicyStatement({
            effect: aws_iam.Effect.ALLOW,
            actions: ['cloudwatch:GetMetricData', 'cloudwatch:ListMetrics'],
            resources: ['*'],
        }));
        NagSuppressions.addResourceSuppressions(
            proxyFunction,
            [
                {
                    id: "AwsSolutions-IAM5",
                    reason: "CloudWatch GetMetricData and ListMetrics require wildcard resource.",
                },
            ],
            true
        );

        restApi.root.addProxy({
            defaultIntegration: new LambdaIntegration(proxyFunction),
        });

        new RequestValidator(this, "requestValidator", {
            restApi,
            validateRequestBody: true,
            validateRequestParameters: true,
        });

        new CfnWebACLAssociation(this, "restApiWebAclAssociation", {
            resourceArn: restApi.deploymentStage.stageArn,
            webAclArn: regionalWebAclArn,
        });

        this.restApi = restApi;
    }
}
