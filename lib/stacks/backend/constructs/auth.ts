import { Duration } from "aws-cdk-lib";
import {
    AccountRecovery,
    ClientAttributes,
    FeaturePlan,
    UserPool,
    UserPoolClient,
    UserPoolDomain,
    UserPoolGroup,
} from "aws-cdk-lib/aws-cognito";
import { IdentityPool, UserPoolAuthenticationProvider } from "aws-cdk-lib/aws-cognito-identitypool";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Function } from "aws-cdk-lib/aws-lambda";
import { CfnWebACL, CfnWebACLAssociation } from "aws-cdk-lib/aws-wafv2";
import { NagSuppressions } from "cdk-nag";
import { Construct } from "constructs";
import { createManagedRules } from "../../../common/utilities";

interface AuthProps {
    urls: string[];
    hydrationFunction?: Function;
}

export class Auth extends Construct {
    public readonly userPool: UserPool;
    public readonly userPoolDomain?: UserPoolDomain;
    public readonly userPoolClient: UserPoolClient;
    public readonly identityPool: IdentityPool;
    public readonly regionalWebAclArn: string;

    constructor(scope: Construct, id: string, props: AuthProps) {
        super(scope, id);

        const { urls, hydrationFunction } = props;

        const userPool = new UserPool(this, "userPool", {
            selfSignUpEnabled: false,
            signInAliases: {
                email: true,
            },
            autoVerify: {
                email: true,
            },
            standardAttributes: {
                email: {
                    required: true,
                    mutable: true,
                },
            },
            passwordPolicy: {
                minLength: 8,
                requireLowercase: true,
                requireDigits: true,
                requireUppercase: true,
                requireSymbols: true,
            },
            accountRecovery: AccountRecovery.EMAIL_ONLY,
            featurePlan: FeaturePlan.ESSENTIALS,
            lambdaTriggers: {
                postConfirmation: hydrationFunction,
            },
        });
        NagSuppressions.addResourceSuppressions(userPool, [
            {
                id: "AwsSolutions-COG2",
                reason: "Cognito user pool should not require MFA for demos.",
            },
            {
                id: "AwsSolutions-COG3",
                reason: "AdvancedSecurityMode is set to depreciate. Using Cognito feature plan's essential security feature.",
            },
        ]);

        new UserPoolGroup(this, "adminUserPoolGroup", {
            userPool,
            groupName: "Admin",
        });

        new UserPoolGroup(this, "usersUserPoolGroup", {
            userPool,
            groupName: "Users",
        });

        const tokenValidity = Duration.hours(8);
        const userPoolClient = new UserPoolClient(this, "userPoolClient", {
            userPool,
            generateSecret: false,
            refreshTokenValidity: tokenValidity,
            accessTokenValidity: tokenValidity,
            idTokenValidity: tokenValidity,
            readAttributes: new ClientAttributes().withStandardAttributes({
                email: true,
            }),
            authFlows: {
                adminUserPassword: true,
                custom: true,
                userSrp: true,
            },
            oAuth: {
                callbackUrls: urls,
                logoutUrls: urls,
            },
        });

        const identityPool = new IdentityPool(this, "identityPool", {
            allowUnauthenticatedIdentities: false,
            authenticationProviders: {
                userPools: [
                    new UserPoolAuthenticationProvider({
                        userPool,
                        userPoolClient,
                    }),
                ],
            },
        });
        identityPool.unauthenticatedRole.addToPrincipalPolicy(
            new PolicyStatement({
                effect: Effect.DENY,
                actions: ["*"],
                resources: ["*"],
            })
        );

        const regionalWebAcl = new CfnWebACL(this, "regionalWebAcl", {
            defaultAction: { allow: {} },
            scope: "REGIONAL",
            visibilityConfig: {
                metricName: "regionalWebAcl",
                sampledRequestsEnabled: true,
                cloudWatchMetricsEnabled: true,
            },
            customResponseBodies: {
                RateLimitResponse: {
                    contentType: "APPLICATION_JSON",
                    content: '{"error":"Rate limit exceeded"}',
                },
            },
            rules: [
                {
                    name: "ipRateLimitingRule",
                    priority: 0,
                    statement: {
                        rateBasedStatement: {
                            limit: 10000,
                            aggregateKeyType: "IP",
                        },
                    },
                    action: {
                        block: {
                            customResponse: {
                                responseCode: 429,
                                customResponseBodyKey: "RateLimitResponse",
                                responseHeaders: [
                                    { name: "Access-Control-Allow-Origin", value: urls[0] },
                                    { name: "Access-Control-Allow-Methods", value: "GET,POST,PUT,DELETE,OPTIONS" },
                                    { name: "Access-Control-Allow-Headers", value: "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token" },
                                    { name: "Access-Control-Allow-Credentials", value: "true" },
                                ],
                            },
                        },
                    },
                    visibilityConfig: {
                        sampledRequestsEnabled: true,
                        cloudWatchMetricsEnabled: true,
                        metricName: "ipRateLimitingRule",
                    },
                },
                ...createManagedRules("regional", 1, [
                    {
                        name: "AWSManagedRulesCommonRuleSet",
                        overrideAction: {
                            count: {},
                        },
                    },
                    {
                        name: "AWSManagedRulesBotControlRuleSet",
                        overrideAction: {
                            count: {},
                        },
                    },
                    {
                        name: "AWSManagedRulesKnownBadInputsRuleSet",
                    },
                    {
                        name: "AWSManagedRulesUnixRuleSet",
                        ruleActionOverrides: [
                            {
                                name: "UNIXShellCommandsVariables_BODY",
                                actionToUse: {
                                    count: {},
                                },
                            },
                        ],
                    },
                    {
                        name: "AWSManagedRulesSQLiRuleSet",
                        ruleActionOverrides: [
                            {
                                name: "SQLi_BODY",
                                actionToUse: {
                                    count: {},
                                },
                            },
                        ],
                    },
                ]),
            ],
        });
        const regionalWebAclArn = regionalWebAcl.attrArn;

        new CfnWebACLAssociation(this, "userPoolWebAclAssociation", {
            resourceArn: userPool.userPoolArn,
            webAclArn: regionalWebAclArn,
        });

        this.userPool = userPool;
        this.userPoolDomain = userPool.addDomain("userPoolDomain", {
            cognitoDomain: {
                domainPrefix: `${scope.node.tryGetContext("projectId")}-${scope.node.tryGetContext("stage") || "dev"}`,
            },
        });
        this.userPoolClient = userPoolClient;
        this.identityPool = identityPool;
        this.regionalWebAclArn = regionalWebAclArn;
    }
}
