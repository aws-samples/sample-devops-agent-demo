/**
 * CRM Calculation Utilities
 * 
 * This file contains utility functions for calculating pipeline metrics,
 * quota attainment, and other CRM-related calculations.
 */

import { Opportunity, OpportunityStage, PipelineMetrics } from '../types';

/**
 * Calculate comprehensive pipeline metrics from a list of opportunities
 * 
 * @param opportunities - Array of opportunities to analyze
 * @returns PipelineMetrics object with calculated values
 * 
 * @example
 * const metrics = calculatePipelineMetrics(opportunities);
 * console.log(metrics.openPipeline); // Total open pipeline value
 */
export function calculatePipelineMetrics(opportunities: Opportunity[]): PipelineMetrics {
  const now = new Date();
  
  // Initialize metrics
  const metrics: PipelineMetrics = {
    openPipeline: 0,
    newOpportunities: 0,
    wonOpportunities: 0,
    increasedValue: 0,
    movedIn: 0,
    movedOut: 0,
    decreasedValue: 0,
    lostOpportunities: 0,
    overdueOpportunities: 0,
  };

  // Calculate metrics from opportunities
  opportunities.forEach((opp) => {
    // Open pipeline: all opportunities not closed
    if (opp.stage !== OpportunityStage.ClosedWon && opp.stage !== OpportunityStage.ClosedLost) {
      metrics.openPipeline += opp.amount;
      
      // Check if overdue (close date passed and not closed)
      if (new Date(opp.closeDate) < now) {
        metrics.overdueOpportunities += opp.amount;
      }
    }
    
    // Won opportunities
    if (opp.stage === OpportunityStage.ClosedWon) {
      metrics.wonOpportunities += opp.amount;
    }
    
    // Lost opportunities
    if (opp.stage === OpportunityStage.ClosedLost) {
      metrics.lostOpportunities += opp.amount;
    }
    
    // New opportunities (created in last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    if (new Date(opp.createdDate) >= thirtyDaysAgo) {
      metrics.newOpportunities += opp.amount;
    }
    
    // Note: increasedValue, movedIn, movedOut, and decreasedValue would require
    // historical data to calculate changes over time. For now, these remain 0.
    // In a real implementation, these would compare current values to previous period.
  });

  return metrics;
}

/**
 * Calculate quota attainment percentage
 * 
 * @param closed - Total closed/won amount
 * @param quota - Target quota amount
 * @returns Quota attainment percentage (0-100+)
 * 
 * @example
 * calculateQuotaAttainment(75000, 100000) // 75
 * calculateQuotaAttainment(120000, 100000) // 120
 * calculateQuotaAttainment(0, 100000) // 0
 */
export function calculateQuotaAttainment(closed: number, quota: number): number {
  if (quota === 0) {
    return 0;
  }
  return (closed / quota) * 100;
}

/**
 * Calculate win rate from opportunities
 * 
 * @param opportunities - Array of opportunities to analyze
 * @returns Win rate percentage (0-100)
 * 
 * @example
 * calculateWinRate(opportunities) // 45.5
 */
export function calculateWinRate(opportunities: Opportunity[]): number {
  const closedOpportunities = opportunities.filter(
    (opp) => opp.stage === OpportunityStage.ClosedWon || opp.stage === OpportunityStage.ClosedLost
  );
  
  if (closedOpportunities.length === 0) {
    return 0;
  }
  
  const wonOpportunities = closedOpportunities.filter(
    (opp) => opp.stage === OpportunityStage.ClosedWon
  );
  
  return (wonOpportunities.length / closedOpportunities.length) * 100;
}

/**
 * Calculate weighted forecast value (probability × amount)
 * 
 * @param opportunities - Array of opportunities to analyze
 * @returns Total weighted forecast value
 * 
 * @example
 * calculateWeightedForecast(opportunities) // 450000
 */
export function calculateWeightedForecast(opportunities: Opportunity[]): number {
  return opportunities
    .filter((opp) => opp.stage !== OpportunityStage.ClosedWon && opp.stage !== OpportunityStage.ClosedLost)
    .reduce((total, opp) => total + (opp.amount * opp.probability / 100), 0);
}

/**
 * Calculate average deal size
 * 
 * @param opportunities - Array of opportunities to analyze
 * @returns Average opportunity amount
 * 
 * @example
 * calculateAverageDealSize(opportunities) // 125000
 */
export function calculateAverageDealSize(opportunities: Opportunity[]): number {
  if (opportunities.length === 0) {
    return 0;
  }
  
  const total = opportunities.reduce((sum, opp) => sum + opp.amount, 0);
  return total / opportunities.length;
}

/**
 * Calculate pipeline velocity (average days to close)
 * 
 * @param opportunities - Array of closed opportunities to analyze
 * @returns Average days from creation to close
 * 
 * @example
 * calculatePipelineVelocity(closedOpportunities) // 45.5
 */
export function calculatePipelineVelocity(opportunities: Opportunity[]): number {
  const closedWonOpportunities = opportunities.filter(
    (opp) => opp.stage === OpportunityStage.ClosedWon
  );
  
  if (closedWonOpportunities.length === 0) {
    return 0;
  }
  
  const totalDays = closedWonOpportunities.reduce((sum, opp) => {
    const created = new Date(opp.createdDate).getTime();
    const closed = new Date(opp.lastModifiedDate).getTime();
    const days = (closed - created) / (1000 * 60 * 60 * 24);
    return sum + days;
  }, 0);
  
  return totalDays / closedWonOpportunities.length;
}

/**
 * Calculate total pipeline value for a specific owner
 * 
 * @param opportunities - Array of opportunities to analyze
 * @param ownerId - Owner ID to filter by
 * @returns Total pipeline value for the owner
 * 
 * @example
 * calculateOwnerPipeline(opportunities, 'user-123') // 500000
 */
export function calculateOwnerPipeline(opportunities: Opportunity[], ownerId: string): number {
  return opportunities
    .filter((opp) => opp.ownerId === ownerId)
    .filter((opp) => opp.stage !== OpportunityStage.ClosedWon && opp.stage !== OpportunityStage.ClosedLost)
    .reduce((total, opp) => total + opp.amount, 0);
}

/**
 * Calculate total closed won value for a specific owner
 * 
 * @param opportunities - Array of opportunities to analyze
 * @param ownerId - Owner ID to filter by
 * @returns Total closed won value for the owner
 * 
 * @example
 * calculateOwnerClosedWon(opportunities, 'user-123') // 250000
 */
export function calculateOwnerClosedWon(opportunities: Opportunity[], ownerId: string): number {
  return opportunities
    .filter((opp) => opp.ownerId === ownerId && opp.stage === OpportunityStage.ClosedWon)
    .reduce((total, opp) => total + opp.amount, 0);
}
