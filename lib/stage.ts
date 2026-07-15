import { Aspects, Stage, StageProps } from "aws-cdk-lib";
import { AwsSolutionsChecks, NagSuppressions } from "cdk-nag";
import { Construct } from "constructs";
import { Backend } from "./stacks/backend";
import { Frontend, FrontendDeployment } from "./stacks/frontend";

export class ApplicationStage extends Stage {
    constructor(scope: Construct, id: string, props?: StageProps) {
        super(scope, id, props);

        const frontend = new Frontend(this, "frontend");

        // DevOps Agent webhook configuration from cdk.json context
        const devOpsAgentWebhookUrl = this.node.tryGetContext('devOpsAgentWebhookUrl');

        // GitHub integration configuration from cdk.json context
        const githubPat = this.node.tryGetContext('githubPat');
        const githubRepo = this.node.tryGetContext('githubRepo');

        const backend = new Backend(this, "backend", {
            urls: frontend.urls,
            devOpsAgentWebhookUrl,
            githubPat,
            githubRepo,
        });

        // this stack must be named frontendDeployment
        const frontendDeployment = new FrontendDeployment(this, "frontendDeployment", {
            websiteBucket: frontend.websiteBucket,
            distribution: frontend.distribution,
            environmentVariables: backend.environmentVariables,
        });

        // Ensure frontend deployment happens after backend is fully deployed
        frontendDeployment.addDependency(backend);

        NagSuppressions.addResourceSuppressions(
            this,
            [
                {
                    id: "AwsSolutions-IAM4",
                    reason: "Lambda functions can require managed policies.",
                    appliesTo: [
                        "Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
                        "Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole",
                    ],
                },
                {
                    id: "AwsSolutions-IAM5",
                    reason: "High-level constructs can require wildcards for dynamic resource creation and management.",
                },
                {
                    id: "AwsSolutions-L1",
                    reason: "High-level constructs can set their own runtimes.",
                },
            ],
            true
        );
        Aspects.of(this).add(new AwsSolutionsChecks());
    }
}
