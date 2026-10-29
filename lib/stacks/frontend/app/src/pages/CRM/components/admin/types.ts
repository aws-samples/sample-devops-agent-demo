/**
 * Failure Simulator Types
 * 
 * Types for the failure injection system that enables controlled
 * injection of real AWS infrastructure failures for observability demos.
 */

export type FailureType =
    | 'snsSubscriptionErrors'
    | 'lambdaFailedDeployment'
    | 'rdsIndexDrop';

export type TriggerAction =
    | 'createAccount'
    | 'updateAccount'
    | 'deleteAccount'
    | 'listAccounts'
    | 'createOpportunity'
    | 'updateOpportunity'
    | 'deleteOpportunity'
    | 'listOpportunities'
    | 'anyRequest';

export type FailureCategory =
    | 'System Changes'
    | 'Input Anomalies'
    | 'Resource Limits'
    | 'Component Failures'
    | 'Dependency Issues';

export type IssueType =
    | 'Database'
    | 'Configuration'
    | 'Lambda'
    | 'Queue'
    | 'API Gateway'
    | 'Storage';

export type Severity = 'light' | 'moderate' | 'severe';

export interface FailureScenario {
    /** Unique identifier */
    id: FailureType;
    
    /** Display name */
    name: string;
    
    /** Brief description */
    description: string;
    
    /** Detailed simulation explanation */
    simulationDetails: string;
    
    /** Whether currently enabled */
    enabled: boolean;
    
    /** Current severity level */
    severity: Severity;
    
    /** Category grouping */
    category: FailureCategory;
    
    /** Type of issue */
    issueType: IssueType;
    
    /** Incident description */
    incident: string;
    
    /** Whether this scenario is implemented */
    implemented: boolean;
    
    /** Actions that trigger this failure */
    triggerActions: TriggerAction[];
    
    /** Human-readable trigger description */
    triggerDescription: string;
    
    /** AWS service affected */
    awsService: string;
    
    /** CloudWatch metrics to monitor */
    metricsToMonitor: string[];
}

export interface SystemStatus {
    scenarios: Record<FailureType, {
        enabled: boolean;
        severity: Severity;
        lastModified?: string;
        enabledAt?: string;
        expiresAt?: string;
        remainingSeconds?: number;
    }>;
    lastModified: string;
    modifiedBy?: string;
}

export interface FailureEvent {
    id: string;
    timestamp: number;
    scenarioType: FailureType | string;
    errorType: string;
    errorMessage: string;
    service?: string;
    correlationId?: string;
    rawMessage?: string;
    logStreamName?: string;
    ingestionTime?: number;
    details?: Record<string, unknown>;
}

export interface FailureEventsResponse {
    success: boolean;
    events: FailureEvent[];
    count: number;
    logGroupName?: string;
    timeRange?: {
        startTime: number;
        endTime: number;
    };
    error?: string;
}

export interface MetricsResponse {
    success: boolean;
    metrics: {
        lambdaInvocations: number;
        lambdaErrors: number;
        lambdaThrottles: number;
        lambdaDuration: number;
        snsPublishSuccess: number;
        snsPublishFailed: number;
        sqsMessagesSent: number;
        sqsMessagesReceived: number;
        s3Requests: number;
        s3Errors: number;
        systemHealth: 'healthy' | 'degraded' | 'unhealthy';
        errorRate: number;
        timestamp: string;
    };
    timeSeries: Array<Record<string, number | string>>;
    timeRange?: {
        start: string;
        end: string;
    };
    error?: string;
}

export interface EnableFailureRequest {
    severity: Severity;
}

export interface FailureResponse {
    success: boolean;
    message: string;
    configuration?: Record<string, unknown>;
    correlationId?: string;
}
