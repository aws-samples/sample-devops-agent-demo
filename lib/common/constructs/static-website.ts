import { CustomResource, Duration, Fn, Stack } from "aws-cdk-lib";
import {
    BuildSpec,
    ComputeType,
    LinuxArmBuildImage,
    Project,
} from "aws-cdk-lib/aws-codebuild";
import { Distribution } from "aws-cdk-lib/aws-cloudfront";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Code, Function, Runtime, Architecture } from "aws-cdk-lib/aws-lambda";
import { IBucket } from "aws-cdk-lib/aws-s3";
import { Asset } from "aws-cdk-lib/aws-s3-assets";
import { Provider } from "aws-cdk-lib/custom-resources";
import { NagSuppressions } from "cdk-nag";
import { Construct } from "constructs";

export interface StaticWebsiteBuildProps {
    readonly path: string;
    readonly exclude?: string[];
    readonly destinationBucket: IBucket;
    readonly distribution: Distribution;
    readonly environmentVariables?: Record<string, string>;
    readonly installCommands?: string[];
    readonly commands?: string[];
    readonly primaryOutputDirectory?: string;
}

export class StaticWebsiteBuild extends Construct {
    constructor(scope: Construct, id: string, props: StaticWebsiteBuildProps) {
        super(scope, id);

        const {
            path: appPath,
            exclude = [],
            destinationBucket,
            distribution,
            environmentVariables = {},
            installCommands = [],
            commands = [],
            primaryOutputDirectory = "dist",
        } = props;

        // Upload source code as an asset
        const sourceAsset = new Asset(this, "sourceAsset", {
            path: appPath,
            exclude: [...exclude, "node_modules", "dist", ".env.local", ".env.production"],
        });

        // Create CodeBuild project to build the frontend
        const buildProject = new Project(this, "buildProject", {
            environment: {
                buildImage: LinuxArmBuildImage.AMAZON_LINUX_2_STANDARD_3_0,
                computeType: ComputeType.SMALL,
            },
            buildSpec: BuildSpec.fromObject({
                version: "0.2",
                phases: {
                    install: {
                        "runtime-versions": {
                            nodejs: "18",
                        },
                        commands: installCommands,
                    },
                    build: {
                        commands: commands,
                    },
                },
                artifacts: {
                    files: ["**/*"],
                    "base-directory": primaryOutputDirectory,
                },
            }),
        });

        // Grant CodeBuild access to read source and write to destination
        sourceAsset.grantRead(buildProject);
        destinationBucket.grantReadWrite(buildProject);

        NagSuppressions.addResourceSuppressions(
            buildProject,
            [
                {
                    id: "AwsSolutions-CB4",
                    reason: "CodeBuild project uses default encryption for demo purposes.",
                },
                {
                    id: "AwsSolutions-IAM5",
                    reason: "CodeBuild requires wildcard permissions for S3 bucket access.",
                },
            ],
            true
        );

        // Lambda function to trigger CodeBuild and wait for completion
        const triggerFunction = new Function(this, "triggerFunction", {
            runtime: Runtime.PYTHON_3_12,
            architecture: Architecture.ARM_64,
            handler: "index.handler",
            timeout: Duration.minutes(15),
            code: Code.fromInline(`
import boto3
import cfnresponse
import time
import json

def handler(event, context):
    try:
        print(f'Event: {json.dumps(event)}')
        
        if event['RequestType'] == 'Delete':
            cfnresponse.send(event, context, cfnresponse.SUCCESS, {})
            return

        codebuild = boto3.client('codebuild')
        s3 = boto3.client('s3')
        cloudfront = boto3.client('cloudfront')

        project_name = event['ResourceProperties']['ProjectName']
        source_bucket = event['ResourceProperties']['SourceBucket']
        source_key = event['ResourceProperties']['SourceKey']
        dest_bucket = event['ResourceProperties']['DestBucket']
        distribution_id = event['ResourceProperties']['DistributionId']
        
        # Get environment variables directly from CustomResource properties
        # These are resolved by CloudFormation before being passed to Lambda
        env_vars_json = event['ResourceProperties'].get('EnvironmentVariablesJson', '{}')
        env_vars = json.loads(env_vars_json)
        
        print(f'Environment variables received:')
        for key, value in env_vars.items():
            # Mask sensitive values in logs
            display_value = value[:20] + '...' if len(value) > 20 else value
            print(f'  {key}: {display_value}')
        
        # Build environment variables override for CodeBuild
        env_overrides = [
            {'name': key, 'value': value, 'type': 'PLAINTEXT'}
            for key, value in env_vars.items()
        ]

        # Clear destination bucket before uploading new content
        print(f'Clearing destination bucket: {dest_bucket}')
        paginator = s3.get_paginator('list_objects_v2')
        for page in paginator.paginate(Bucket=dest_bucket):
            if 'Contents' in page:
                objects = [{'Key': obj['Key']} for obj in page['Contents']]
                if objects:
                    s3.delete_objects(Bucket=dest_bucket, Delete={'Objects': objects})
                    print(f'Deleted {len(objects)} objects')

        response = codebuild.start_build(
            projectName=project_name,
            sourceTypeOverride='S3',
            sourceLocationOverride=f'{source_bucket}/{source_key}',
            environmentVariablesOverride=env_overrides,
            artifactsOverride={
                'type': 'S3',
                'location': dest_bucket,
                'path': '',
                'name': '.',
                'packaging': 'NONE',
                'encryptionDisabled': True,
            }
        )

        build_id = response['build']['id']
        print(f'Started build: {build_id}')

        # Wait for build to complete
        while True:
            time.sleep(10)
            build_response = codebuild.batch_get_builds(ids=[build_id])
            build = build_response['builds'][0]
            status = build['buildStatus']
            print(f'Build status: {status}')

            if status == 'SUCCEEDED':
                # Invalidate CloudFront cache
                cloudfront.create_invalidation(
                    DistributionId=distribution_id,
                    InvalidationBatch={
                        'Paths': {'Quantity': 1, 'Items': ['/*']},
                        'CallerReference': str(time.time())
                    }
                )
                print('CloudFront invalidation created')
                cfnresponse.send(event, context, cfnresponse.SUCCESS, {'BuildId': build_id})
                return
            elif status in ['FAILED', 'FAULT', 'STOPPED', 'TIMED_OUT']:
                # Get build logs for debugging
                logs = build.get('logs', {})
                print(f'Build failed. Logs: {logs}')
                cfnresponse.send(event, context, cfnresponse.FAILED, {'Error': f'Build {status}'})
                return

    except Exception as e:
        print(f'Error: {str(e)}')
        import traceback
        traceback.print_exc()
        cfnresponse.send(event, context, cfnresponse.FAILED, {'Error': str(e)})
`),
        });

        // Grant permissions to the trigger function
        sourceAsset.grantRead(triggerFunction);
        destinationBucket.grantReadWrite(triggerFunction);

        triggerFunction.addToRolePolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ["codebuild:StartBuild", "codebuild:BatchGetBuilds"],
                resources: [buildProject.projectArn],
            })
        );

        triggerFunction.addToRolePolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ["cloudfront:CreateInvalidation"],
                resources: [
                    `arn:aws:cloudfront::${Stack.of(this).account}:distribution/${distribution.distributionId}`,
                ],
            })
        );

        NagSuppressions.addResourceSuppressions(
            triggerFunction,
            [
                {
                    id: "AwsSolutions-IAM5",
                    reason: "Lambda requires permissions to manage CodeBuild and S3.",
                },
            ],
            true
        );

        // Custom resource provider
        const provider = new Provider(this, "provider", {
            onEventHandler: triggerFunction,
        });

        NagSuppressions.addResourceSuppressions(
            provider,
            [
                {
                    id: "AwsSolutions-IAM4",
                    reason: "Provider uses managed policies.",
                },
                {
                    id: "AwsSolutions-IAM5",
                    reason: "Provider requires wildcard permissions.",
                },
                {
                    id: "AwsSolutions-L1",
                    reason: "Provider sets its own runtime.",
                },
            ],
            true
        );

        // Pass environment variables as JSON string - CloudFormation will resolve tokens
        // before passing to the Lambda function
        const envVarsJson = Fn.sub(JSON.stringify(
            Object.fromEntries(
                Object.entries(environmentVariables).map(([k, v]) => [k, `\${${k}}`])
            )
        ), environmentVariables);

        // Custom resource to trigger the build
        new CustomResource(this, "buildTrigger", {
            serviceToken: provider.serviceToken,
            properties: {
                ProjectName: buildProject.projectName,
                SourceBucket: sourceAsset.s3BucketName,
                SourceKey: sourceAsset.s3ObjectKey,
                DestBucket: destinationBucket.bucketName,
                DistributionId: distribution.distributionId,
                // Pass env vars directly - CloudFormation resolves tokens before Lambda receives them
                EnvironmentVariablesJson: Fn.toJsonString(environmentVariables),
                // Force update on every deployment by including a hash of env var keys
                // CloudFormation will detect changes in the resolved values
                EnvVarKeys: Object.keys(environmentVariables).sort().join(","),
            },
        });
    }
}
