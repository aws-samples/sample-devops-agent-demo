/**
 * CRM Filtering and Sorting Utilities
 * 
 * This file contains utility functions for filtering, searching, and sorting
 * opportunities data in the AnyCompany CRM platform.
 */

import { Opportunity, OpportunityStage, ForecastCategory } from '../types';

// ============================================================================
// Filter Interfaces
// ============================================================================

export interface OpportunityFilters {
  dateRange?: {
    start: Date | null;
    end: Date | null;
  };
  stage?: OpportunityStage[];
  owner?: string[];
  forecastCategory?: ForecastCategory[];
}

// ============================================================================
// Filtering Functions
// ============================================================================

/**
 * Filter opportunities based on multiple criteria
 * 
 * @param opportunities - Array of opportunities to filter
 * @param filters - Filter criteria to apply
 * @returns Filtered array of opportunities
 */
export function filterOpportunities(
  opportunities: Opportunity[],
  filters: OpportunityFilters
): Opportunity[] {
  let filtered = [...opportunities];

  // Filter by date range (close date)
  if (filters.dateRange) {
    const { start, end } = filters.dateRange;
    
    if (start) {
      filtered = filtered.filter(opp => {
        const closeDate = new Date(opp.closeDate);
        return closeDate >= start;
      });
    }
    
    if (end) {
      filtered = filtered.filter(opp => {
        const closeDate = new Date(opp.closeDate);
        return closeDate <= end;
      });
    }
  }

  // Filter by stage
  if (filters.stage && filters.stage.length > 0) {
    filtered = filtered.filter(opp => 
      filters.stage!.includes(opp.stage)
    );
  }

  // Filter by owner
  if (filters.owner && filters.owner.length > 0) {
    filtered = filtered.filter(opp => 
      filters.owner!.includes(opp.ownerId)
    );
  }

  // Filter by forecast category
  if (filters.forecastCategory && filters.forecastCategory.length > 0) {
    filtered = filtered.filter(opp => 
      filters.forecastCategory!.includes(opp.forecastCategory)
    );
  }

  return filtered;
}

// ============================================================================
// Search Functions
// ============================================================================

/**
 * Search opportunities using fuzzy matching across multiple fields
 * 
 * @param opportunities - Array of opportunities to search
 * @param query - Search query string
 * @returns Filtered array of opportunities matching the query
 */
export function searchOpportunities(
  opportunities: Opportunity[],
  query: string
): Opportunity[] {
  if (!query || query.trim() === '') {
    return opportunities;
  }

  const normalizedQuery = query.toLowerCase().trim();

  return opportunities.filter(opp => {
    // Search across opportunity name
    const nameMatch = opp.name.toLowerCase().includes(normalizedQuery);
    
    // Search across account name
    const accountMatch = opp.accountName.toLowerCase().includes(normalizedQuery);
    
    // Search across owner name
    const ownerMatch = opp.ownerName.toLowerCase().includes(normalizedQuery);

    return nameMatch || accountMatch || ownerMatch;
  });
}

// ============================================================================
// Sorting Functions
// ============================================================================

/**
 * Sort opportunities by a specific column and direction
 * 
 * @param opportunities - Array of opportunities to sort
 * @param column - Column name to sort by
 * @param direction - Sort direction ('asc' or 'desc')
 * @returns Sorted array of opportunities
 */
export function sortOpportunities(
  opportunities: Opportunity[],
  column: string,
  direction: 'asc' | 'desc'
): Opportunity[] {
  const sorted = [...opportunities];

  sorted.sort((a, b) => {
    let aValue: any;
    let bValue: any;

    // Extract values based on column
    switch (column) {
      case 'name':
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      
      case 'accountName':
        aValue = a.accountName.toLowerCase();
        bValue = b.accountName.toLowerCase();
        break;
      
      case 'amount':
        aValue = a.amount;
        bValue = b.amount;
        break;
      
      case 'closeDate':
        aValue = new Date(a.closeDate).getTime();
        bValue = new Date(b.closeDate).getTime();
        break;
      
      case 'stage':
        // Sort by stage order: Launched -> Qualified -> Proof of Concept -> Negotiation -> Closed Won -> Closed Lost
        const stageOrder: Record<OpportunityStage, number> = {
          [OpportunityStage.Launched]: 1,
          [OpportunityStage.Qualified]: 2,
          [OpportunityStage.ProofOfConcept]: 3,
          [OpportunityStage.Negotiation]: 4,
          [OpportunityStage.ClosedWon]: 5,
          [OpportunityStage.ClosedLost]: 6,
        };
        aValue = stageOrder[a.stage];
        bValue = stageOrder[b.stage];
        break;
      
      case 'ownerName':
        aValue = a.ownerName.toLowerCase();
        bValue = b.ownerName.toLowerCase();
        break;
      
      case 'forecastCategory':
        // Sort by forecast category: Commit -> Best Case -> Pipeline -> Omitted
        const forecastOrder: Record<ForecastCategory, number> = {
          [ForecastCategory.Commit]: 1,
          [ForecastCategory.BestCase]: 2,
          [ForecastCategory.Pipeline]: 3,
          [ForecastCategory.Omitted]: 4,
        };
        aValue = forecastOrder[a.forecastCategory];
        bValue = forecastOrder[b.forecastCategory];
        break;
      
      case 'recentActivityDate':
        aValue = new Date(a.recentActivityDate).getTime();
        bValue = new Date(b.recentActivityDate).getTime();
        break;
      
      case 'probability':
        aValue = a.probability;
        bValue = b.probability;
        break;
      
      default:
        // Default to sorting by name
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
    }

    // Compare values
    let comparison = 0;
    if (aValue < bValue) {
      comparison = -1;
    } else if (aValue > bValue) {
      comparison = 1;
    }

    // Apply direction
    return direction === 'asc' ? comparison : -comparison;
  });

  return sorted;
}

// ============================================================================
// Combined Filter and Search
// ============================================================================

/**
 * Apply both filtering and searching to opportunities
 * 
 * @param opportunities - Array of opportunities to filter and search
 * @param filters - Filter criteria to apply
 * @param searchQuery - Search query string
 * @returns Filtered and searched array of opportunities
 */
export function filterAndSearchOpportunities(
  opportunities: Opportunity[],
  filters: OpportunityFilters,
  searchQuery: string
): Opportunity[] {
  // First apply filters
  let result = filterOpportunities(opportunities, filters);
  
  // Then apply search
  result = searchOpportunities(result, searchQuery);
  
  return result;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if an opportunity is overdue (close date in the past and not closed)
 * 
 * @param opportunity - Opportunity to check
 * @returns True if opportunity is overdue
 */
export function isOpportunityOverdue(opportunity: Opportunity): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const closeDate = new Date(opportunity.closeDate);
  closeDate.setHours(0, 0, 0, 0);
  
  const isNotClosed = 
    opportunity.stage !== OpportunityStage.ClosedWon && 
    opportunity.stage !== OpportunityStage.ClosedLost;
  
  return closeDate < today && isNotClosed;
}

/**
 * Get unique owners from opportunities list
 * 
 * @param opportunities - Array of opportunities
 * @returns Array of unique owner objects with id and name
 */
export function getUniqueOwners(opportunities: Opportunity[]): Array<{ id: string; name: string }> {
  const ownerMap = new Map<string, string>();
  
  opportunities.forEach(opp => {
    if (!ownerMap.has(opp.ownerId)) {
      ownerMap.set(opp.ownerId, opp.ownerName);
    }
  });
  
  return Array.from(ownerMap.entries()).map(([id, name]) => ({ id, name }));
}

/**
 * Get unique accounts from opportunities list
 * 
 * @param opportunities - Array of opportunities
 * @returns Array of unique account objects with id and name
 */
export function getUniqueAccounts(opportunities: Opportunity[]): Array<{ id: string; name: string }> {
  const accountMap = new Map<string, string>();
  
  opportunities.forEach(opp => {
    if (!accountMap.has(opp.accountId)) {
      accountMap.set(opp.accountId, opp.accountName);
    }
  });
  
  return Array.from(accountMap.entries()).map(([id, name]) => ({ id, name }));
}
