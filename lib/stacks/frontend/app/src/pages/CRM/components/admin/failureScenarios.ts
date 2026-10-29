/**
 * Failure Scenario Definitions
 * 
 * Defines all available failure scenarios for the simulator.
 */

import { FailureScenario } from './types';

export const failureScenarios: FailureScenario[] = [
    {
        id: 'rdsIndexDrop',
        name: 'RDS Index Drop',
        description: 'Drops database indexes causing slow queries',
        simulationDetails: 'Actually drops PostgreSQL indexes on opportunities and accounts tables, causing full table scans instead of index scans.',
        enabled: false,
        severity: 'moderate',
        category: 'Dependency Issues',
        issueType: 'Database',
        incident: 'Database performance degradation',
        implemented: true,
        triggerActions: ['listAccounts', 'listOpportunities', 'listTeamMembers', 'getAccount', 'getOpportunity'],
        triggerDescription: 'Navigate to any page to experience slow database queries',
        awsService: 'Amazon RDS',
        metricsToMonitor: ['CPUUtilization', 'ReadLatency', 'DatabaseConnections'],
    },
    {
        id: 'sqsBacklogSpike',
        name: 'SQS Message Backlog Spike',
        description: 'Revokes consumer Lambda permissions causing message processing failure',
        simulationDetails: 'Attaches an IAM deny policy to the queue consumer Lambda role, blocking it from receiving/deleting SQS messages. Also floods the queue with messages. The consumer keeps getting triggered but fails with AccessDenied, causing organic backlog growth.',
        enabled: false,
        severity: 'moderate',
        category: 'Dependency Issues',
        issueType: 'Queue',
        incident: 'Message processing failures due to IAM permission change',
        implemented: true,
        triggerActions: ['listAccounts', 'listOpportunities', 'listTeamMembers', 'getAccount', 'getOpportunity'],
        triggerDescription: 'Navigate to any page to see message processing delays logged',
        awsService: 'Amazon SQS',
        metricsToMonitor: ['ApproximateNumberOfMessagesVisible', 'ApproximateAgeOfOldestMessage', 'NumberOfMessagesSent'],
    },
    {
        id: 'lambdaFailedDeployment',
        name: 'Lambda Failed Deployment',
        description: 'Deploys code with missing module dependency causing import errors',
        simulationDetails: 'Deploys a code update to the CRM event processor Lambda that references a missing module (./config/pipeline-rules). Every invocation fails with Runtime.ImportModuleError.',
        enabled: false,
        severity: 'moderate',
        category: 'System Changes',
        issueType: 'Lambda',
        incident: 'Lambda invocation errors',
        implemented: true,
        triggerActions: ['listAccounts', 'listOpportunities', 'listTeamMembers', 'getAccount', 'getOpportunity'],
        triggerDescription: 'Navigate to any page to trigger Lambda deployment errors',
        awsService: 'AWS Lambda',
        metricsToMonitor: ['Errors', 'Duration', 'Throttles'],
    },
];

export const getScenarioById = (id: string): FailureScenario | undefined => {
    return failureScenarios.find(s => s.id === id);
};

export const getScenariosByCategory = (category: string): FailureScenario[] => {
    return failureScenarios.filter(s => s.category === category);
};

export const getImplementedScenarios = (): FailureScenario[] => {
    return failureScenarios.filter(s => s.implemented);
};
