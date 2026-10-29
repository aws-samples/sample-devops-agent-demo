import { Construct } from "constructs";
import {
    IVpc,
    SubnetType,
    SecurityGroup,
} from "aws-cdk-lib/aws-ec2";
import {
    DatabaseInstance,
    DatabaseInstanceEngine,
    PostgresEngineVersion,
    StorageType,
    Credentials,
    DatabaseProxy,
    ProxyTarget,
    ParameterGroup,
} from "aws-cdk-lib/aws-rds";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { RemovalPolicy, Duration, CustomResource, Tags } from "aws-cdk-lib";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { Provider } from "aws-cdk-lib/custom-resources";
import { PythonFunction } from "@aws-cdk/aws-lambda-python-alpha";
import { NagSuppressions } from "cdk-nag";
import * as path from "path";

export interface DatabaseProps {
    vpc: IVpc;
    securityGroup: SecurityGroup;
    imagesBucket: Bucket;
}

export class Database extends Construct {
    public readonly database: DatabaseInstance;
    public readonly databaseSecret: Secret;
    public readonly databaseEndpoint: string;
    public readonly databaseName: string;
    public readonly proxy: DatabaseProxy;
    public readonly proxyEndpoint: string;
    public readonly postgresLogGroup: LogGroup;

    constructor(scope: Construct, id: string, props: DatabaseProps) {
        super(scope, id);

        const { vpc, securityGroup } = props;

        this.databaseName = "crmdb";

        // Parameter group to enable PostgreSQL logging
        const parameterGroup = new ParameterGroup(this, "parameterGroup", {
            engine: DatabaseInstanceEngine.postgres({
                version: PostgresEngineVersion.VER_15,
            }),
            parameters: {
                // Enable logging
                "log_statement": "all",
                "log_min_duration_statement": "1000", // Log queries taking > 1 second
                "log_connections": "1",
                "log_disconnections": "1",
                "log_lock_waits": "1",
                "log_temp_files": "0", // Log all temp files
                "log_autovacuum_min_duration": "0", // Log all autovacuum
            },
        });

        this.database = new DatabaseInstance(this, "database", {
            engine: DatabaseInstanceEngine.postgres({
                version: PostgresEngineVersion.VER_15,
            }),
            vpc,
            vpcSubnets: {
                subnetType: SubnetType.PRIVATE_ISOLATED,
            },
            securityGroups: [securityGroup],
            databaseName: this.databaseName,
            credentials: Credentials.fromGeneratedSecret("postgres"),
            allocatedStorage: 100,
            storageType: StorageType.GP3,
            backupRetention: Duration.days(7),
            storageEncrypted: true,
            enablePerformanceInsights: true,
            iamAuthentication: true,
            publiclyAccessible: false,
            deletionProtection: false,
            removalPolicy: RemovalPolicy.DESTROY,
            parameterGroup,
            // Enable CloudWatch log exports for PostgreSQL
            cloudwatchLogsExports: ["postgresql"],
            cloudwatchLogsRetention: RetentionDays.TWO_WEEKS,
        });

        // Reference the auto-created PostgreSQL log group
        // RDS creates log groups with format: /aws/rds/instance/<instance-id>/postgresql
        this.postgresLogGroup = LogGroup.fromLogGroupName(
            this,
            "postgresLogGroup",
            `/aws/rds/instance/${this.database.instanceIdentifier}/postgresql`
        ) as LogGroup;
        // Tags for CloudWatch monitoring
        Tags.of(this.database).add("env", "dev");
        Tags.of(this.database).add("service", "crm-demo");
        Tags.of(this.database).add("component", "crm-database");
        Tags.of(this.database).add("monitor", "rds-cpu");

        this.databaseSecret = this.database.secret as Secret;
        this.databaseEndpoint = this.database.dbInstanceEndpointAddress;

        // Suppress CDK Nag warnings for demo environment
        NagSuppressions.addResourceSuppressions(
            this.database,
            [
                {
                    id: "AwsSolutions-RDS3",
                    reason: "Multi-AZ not required for demo environment - reduces cost",
                },
                {
                    id: "AwsSolutions-RDS10",
                    reason: "Deletion protection disabled for demo environment - allows easy cleanup",
                },
                {
                    id: "AwsSolutions-RDS11",
                    reason: "Default port acceptable for demo environment",
                },
                {
                    id: "AwsSolutions-SMG4",
                    reason: "Automatic rotation not required for demo environment",
                },
            ],
            true
        );

        this.proxy = new DatabaseProxy(this, "proxy", {
            proxyTarget: ProxyTarget.fromInstance(this.database),
            secrets: [this.databaseSecret],
            vpc,
            vpcSubnets: {
                subnetType: SubnetType.PRIVATE_ISOLATED,
            },
            securityGroups: [securityGroup],
            requireTLS: false,
            dbProxyName: "crm-database-proxy",
        });

        this.proxyEndpoint = this.proxy.endpoint;
        
        // Create seeding Lambda function
        const seedFunction = new PythonFunction(this, "seedFunction", {
            entry: path.join(__dirname, "database/seed-function"),
            runtime: Runtime.PYTHON_3_12,
            timeout: Duration.minutes(15),
            memorySize: 512,
            vpc,
            vpcSubnets: {
                subnetType: SubnetType.PRIVATE_ISOLATED,
            },
            securityGroups: [securityGroup],
            environment: {
                DB_PROXY_ENDPOINT: this.proxyEndpoint,
                DB_NAME: this.databaseName,
                DB_USERNAME: "postgres",
                DB_PASSWORD: this.databaseSecret.secretValueFromJson("password").unsafeUnwrap(),
            },
        });

        // Grant Lambda access to the database secret
        this.databaseSecret.grantRead(seedFunction);

        // Create custom resource provider
        const provider = new Provider(this, "seedProvider", {
            onEventHandler: seedFunction,
        });

        // Get clear data flag from CDK context
        const clearData = this.node.tryGetContext('clearDatabaseData') === true;

        // Create custom resource to trigger seeding
        new CustomResource(this, "seedResource", {
            serviceToken: provider.serviceToken,
            properties: {
                clear_data: clearData ? 'true' : 'false',
                // Always force update when clearData is true by using a timestamp
                forceUpdate: clearData ? Date.now().toString() : 'false',
            },
        });
    }
}
