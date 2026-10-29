import {
    AuthorizationType,
    Code,
    FieldLogLevel,
    FunctionRuntime,
    GraphqlApi,
    IamResource,
    NoneDataSource,
    Resolver,
    SchemaFile,
} from "aws-cdk-lib/aws-appsync";
import { UserPool } from "aws-cdk-lib/aws-cognito";
import { IGrantable } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import * as path from "path";

interface RealtimeApiProps {
    userPool: UserPool;
}

export class RealtimeApi extends Construct {
    public readonly api: GraphqlApi;

    constructor(scope: Construct, id: string, props: RealtimeApiProps) {
        super(scope, id);

        const { userPool } = props;

        // Create AppSync API with Cognito + IAM auth
        const api = new GraphqlApi(this, "Api", {
            name: "crm-realtime-api",
            schema: SchemaFile.fromAsset(path.join(__dirname, "../graphql/schema.graphql")),
            authorizationConfig: {
                defaultAuthorization: {
                    authorizationType: AuthorizationType.USER_POOL,
                    userPoolConfig: { userPool },
                },
                additionalAuthorizationModes: [
                    { authorizationType: AuthorizationType.IAM },
                ],
            },
            logConfig: {
                fieldLogLevel: FieldLogLevel.ERROR,
            },
            xrayEnabled: true,
        });

        // NONE data source for local pub/sub resolvers
        const noneDataSource = new NoneDataSource(this, "NoneDataSource", {
            api,
            name: "NoneDataSource",
        });

        // Resolver for publishFailureEvent mutation
        new Resolver(this, "PublishFailureEventResolver", {
            api,
            typeName: "Mutation",
            fieldName: "publishFailureEvent",
            dataSource: noneDataSource,
            runtime: FunctionRuntime.JS_1_0_0,
            code: Code.fromInline(`
                export function request(ctx) {
                    const id = util.autoId();
                    const timestamp = util.time.nowEpochSeconds();
                    return {
                        payload: {
                            id,
                            timestamp,
                            scenarioType: ctx.args.scenarioType,
                            errorType: ctx.args.errorType,
                            errorMessage: ctx.args.errorMessage,
                            service: ctx.args.service || null,
                            correlationId: ctx.args.correlationId || null,
                            rawMessage: ctx.args.rawMessage || null,
                        }
                    };
                }
                export function response(ctx) {
                    return ctx.result;
                }
            `),
        });

        // Resolver for publishScenarioChange mutation
        new Resolver(this, "PublishScenarioChangeResolver", {
            api,
            typeName: "Mutation",
            fieldName: "publishScenarioChange",
            dataSource: noneDataSource,
            runtime: FunctionRuntime.JS_1_0_0,
            code: Code.fromInline(`
                export function request(ctx) {
                    const id = util.autoId();
                    const timestamp = util.time.nowEpochSeconds();
                    return {
                        payload: {
                            id,
                            timestamp,
                            scenarioType: ctx.args.scenarioType,
                            action: ctx.args.action,
                            severity: ctx.args.severity || null,
                            userId: ctx.args.userId || null,
                        }
                    };
                }
                export function response(ctx) {
                    return ctx.result;
                }
            `),
        });

        // Resolver for publishMetricsUpdate mutation (real-time CloudWatch metrics)
        new Resolver(this, "PublishMetricsUpdateResolver", {
            api,
            typeName: "Mutation",
            fieldName: "publishMetricsUpdate",
            dataSource: noneDataSource,
            runtime: FunctionRuntime.JS_1_0_0,
            code: Code.fromInline(`
                export function request(ctx) {
                    const id = util.autoId();
                    const timestamp = util.time.nowEpochSeconds();
                    return {
                        payload: {
                            id,
                            timestamp,
                            activeScenario: ctx.args.activeScenario || null,
                            sqsQueueDepth: ctx.args.sqsQueueDepth,
                            lambdaErrorRate: ctx.args.lambdaErrorRate,
                            rdsResponseTime: ctx.args.rdsResponseTime,
                            systemHealth: ctx.args.systemHealth,
                        }
                    };
                }
                export function response(ctx) {
                    return ctx.result;
                }
            `),
        });

        // Placeholder query resolver
        new Resolver(this, "PlaceholderQueryResolver", {
            api,
            typeName: "Query",
            fieldName: "_placeholder",
            dataSource: noneDataSource,
            runtime: FunctionRuntime.JS_1_0_0,
            code: Code.fromInline(`
                export function request(ctx) {
                    return { payload: null };
                }
                export function response(ctx) {
                    return "AppSync API is running";
                }
            `),
        });

        this.api = api;
    }

    /**
     * Grant a principal permission to publish to all mutations (failure events and scenario changes)
     */
    grantPublish(grantee: IGrantable): void {
        this.api.grant(grantee, IamResource.custom("types/Mutation/*"), "appsync:GraphQL");
    }
}
