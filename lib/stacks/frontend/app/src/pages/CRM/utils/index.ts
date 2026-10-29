/**
 * CRM Utilities Index
 * 
 * Central export point for all CRM utility functions
 */

// Export all formatters
export {
  formatCurrency,
  formatDate,
  formatRelativeDate,
  formatNumber,
  formatPercentage,
  formatCompactCurrency,
} from './formatters';

// Export all calculations
export {
  calculatePipelineMetrics,
  calculateQuotaAttainment,
  calculateWinRate,
  calculateWeightedForecast,
  calculateAverageDealSize,
  calculatePipelineVelocity,
  calculateOwnerPipeline,
  calculateOwnerClosedWon,
} from './calculations';

// Export all filters and sorting
export {
  filterOpportunities,
  searchOpportunities,
  sortOpportunities,
  filterAndSearchOpportunities,
  isOpportunityOverdue,
  getUniqueOwners,
  getUniqueAccounts,
} from './filters';

// Export filter types
export type { OpportunityFilters } from './filters';
