/**
 * CRM Data Models and Types
 * 
 * This file contains all TypeScript interfaces and enums for the AnyCompany CRM platform.
 * These types define the structure of opportunities, accounts, team members, and metrics.
 */

// ============================================================================
// Enums
// ============================================================================

/**
 * Opportunity stages in the sales pipeline
 */
export enum OpportunityStage {
  Launched = 'Launched',
  Qualified = 'Qualified',
  ProofOfConcept = 'Proof of Concept',
  Negotiation = 'Negotiation',
  ClosedWon = 'Closed Won',
  ClosedLost = 'Closed Lost',
}

/**
 * Forecast categories for pipeline prediction
 */
export enum ForecastCategory {
  Commit = 'Commit',
  BestCase = 'Best Case',
  Pipeline = 'Pipeline',
  Omitted = 'Omitted',
}

/**
 * Industry classifications for accounts
 */
export enum Industry {
  Technology = 'Technology',
  Healthcare = 'Healthcare',
  Finance = 'Finance',
  Retail = 'Retail',
  Manufacturing = 'Manufacturing',
}

/**
 * Account health status indicators
 */
export enum HealthStatus {
  Green = 'green',
  Yellow = 'yellow',
  Red = 'red',
}

// ============================================================================
// Core Data Models
// ============================================================================

/**
 * Sales opportunity representing a potential deal
 */
export interface Opportunity {
  /** Unique identifier */
  id: string;
  
  /** Opportunity name/title */
  name: string;
  
  /** Associated account ID */
  accountId: string;
  
  /** Associated account name */
  accountName: string;
  
  /** Total opportunity amount in USD */
  amount: number;
  
  /** Expected close date */
  closeDate: Date;
  
  /** Current stage in the pipeline */
  stage: OpportunityStage;
  
  /** Next action to be taken */
  nextStep: string;
  
  /** Most recent activity description */
  recentActivity: string;
  
  /** Date of most recent activity */
  recentActivityDate: Date;
  
  /** Forecast category for pipeline prediction */
  forecastCategory: ForecastCategory;
  
  /** Owner/sales rep ID */
  ownerId: string;
  
  /** Owner/sales rep full name */
  ownerName: string;
  
  /** Win probability (0-100) */
  probability: number;
  
  /** Date opportunity was created */
  createdDate: Date;
  
  /** Date opportunity was last modified */
  lastModifiedDate: Date;
}

/**
 * Customer account
 */
export interface Account {
  /** Unique identifier */
  id: string;
  
  /** Account/company name */
  name: string;
  
  /** Company domain/website */
  domain: string;
  
  /** Industry classification */
  industry: Industry;
  
  /** Annual revenue in USD */
  annualRevenue: number;
  
  /** Number of employees */
  employeeCount: number;
  
  /** Account owner ID */
  ownerId: string;
  
  /** Account owner full name */
  ownerName: string;
  
  /** Health status indicator */
  healthStatus: HealthStatus;
  
  /** Numeric health score (0-100) */
  healthScore: number;
  
  /** Number of associated opportunities */
  opportunityCount: number;
  
  /** Total value of all opportunities */
  totalOpportunityValue: number;
  
  /** Date of last activity */
  lastActivityDate: Date;
  
  /** Date account was created */
  createdDate: Date;
  
  /** Optional company logo URL */
  logoUrl?: string;
}

/**
 * Sales team member
 */
export interface TeamMember {
  /** Unique identifier */
  id: string;
  
  /** Full name */
  name: string;
  
  /** Email address */
  email: string;
  
  /** Job role */
  role: 'Sales Rep' | 'Sales Manager' | 'Account Executive';
  
  /** Sales quota in USD */
  quota: number;
  
  /** Current pipeline value in USD */
  pipelineValue: number;
  
  /** Closed won value in USD */
  closedWonValue: number;
  
  /** Quota attainment percentage (0-100+) */
  quotaAttainment: number;
  
  /** Win rate percentage (0-100) */
  winRate: number;
  
  /** Number of opportunities owned */
  opportunityCount: number;
  
  /** Optional avatar image URL */
  avatarUrl?: string;
}

/**
 * Pipeline metrics for dashboard
 */
export interface PipelineMetrics {
  /** Total open pipeline value */
  openPipeline: number;
  
  /** Value of new opportunities */
  newOpportunities: number;
  
  /** Value of won opportunities */
  wonOpportunities: number;
  
  /** Value increase in existing opportunities */
  increasedValue: number;
  
  /** Value moved into pipeline */
  movedIn: number;
  
  /** Value moved out of pipeline */
  movedOut: number;
  
  /** Value decrease in existing opportunities */
  decreasedValue: number;
  
  /** Value of lost opportunities */
  lostOpportunities: number;
  
  /** Value of overdue opportunities */
  overdueOpportunities: number;
}

// ============================================================================
// UI State Types
// ============================================================================

/**
 * Filter state for opportunity filtering
 */
export interface FilterState {
  /** Date range filter */
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  
  /** Selected stages */
  stage: OpportunityStage[];
  
  /** Selected owner IDs */
  owner: string[];
  
  /** Search query string */
  searchQuery: string;
  
  /** Selected forecast categories */
  forecastCategory: ForecastCategory[];
  
  /** Selected industries (for account filtering) */
  industry: Industry[];
}

/**
 * Sort configuration
 */
export interface SortConfig {
  /** Column to sort by */
  column: string;
  
  /** Sort direction */
  direction: 'asc' | 'desc';
}

/**
 * Stage metric for dashboard display
 */
export interface StageMetric {
  /** Metric label */
  label: string;
  
  /** Formatted value string */
  value: string;
  
  /** Optional change percentage */
  change?: number;
  
  /** Optional trend indicator */
  trend?: 'up' | 'down' | 'neutral';
}

/**
 * Chart data point for visualizations
 */
export interface ChartDataPoint {
  /** X-axis value (typically date or category) */
  x: string | number | Date;
  
  /** Y-axis value */
  y: number;
  
  /** Optional series/category label */
  label?: string;
}
