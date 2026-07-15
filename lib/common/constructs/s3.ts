import { RemovalPolicy } from "aws-cdk-lib";
import { Bucket, BucketProps, BlockPublicAccess, HttpMethods } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

export interface CommonBucketProps extends Omit<BucketProps, "blockPublicAccess" | "enforceSSL"> {
    eventBridgeEnabled?: boolean;
}

export class CommonBucket extends Bucket {
    constructor(scope: Construct, id: string, props?: CommonBucketProps) {
        super(scope, id, {
            autoDeleteObjects: true,
            removalPolicy: RemovalPolicy.DESTROY,
            blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
            enforceSSL: true,
            eventBridgeEnabled: props?.eventBridgeEnabled ?? false,
            ...props,
        });
    }
}

export interface CommonWebBucketProps extends CommonBucketProps {
    allowedOrigins: string[];
}

export class CommonWebBucket extends Bucket {
    constructor(scope: Construct, id: string, props: CommonWebBucketProps) {
        const { allowedOrigins, ...bucketProps } = props;

        super(scope, id, {
            autoDeleteObjects: true,
            removalPolicy: RemovalPolicy.DESTROY,
            blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
            enforceSSL: true,
            eventBridgeEnabled: bucketProps?.eventBridgeEnabled ?? false,
            cors: [
                {
                    allowedMethods: [HttpMethods.GET, HttpMethods.PUT, HttpMethods.POST, HttpMethods.DELETE],
                    allowedOrigins,
                    allowedHeaders: ["*"],
                },
            ],
            ...bucketProps,
        });
    }
}
