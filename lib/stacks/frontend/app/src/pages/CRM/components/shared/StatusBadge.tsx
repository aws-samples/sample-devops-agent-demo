/**
 * StatusBadge Component
 * 
 * Displays status badges for opportunity stages, health status, and forecast categories.
 * Applies proper color coding based on the status type.
 */

import React from 'react';
// Individual imports to avoid Cloudscape circular dependency issues with barrel exports
import Badge from '@cloudscape-design/components/badge';
import { OpportunityStage, ForecastCategory, HealthStatus } from '../../types';

export interface StatusBadgeProps {
  /** Status value to display */
  status: OpportunityStage | ForecastCategory | HealthStatus | string;
  
  /** Type of status badge */
  type: 'stage' | 'forecast' | 'health' | 'custom';
  
  /** Additional CSS class name */
  className?: string;
}

/**
 * Get badge color based on opportunity stage
 */
function getStageColor(stage: OpportunityStage): 'blue' | 'grey' | 'green' | 'red' {
  switch (stage) {
    case OpportunityStage.Launched:
      return 'grey';     // Early stage - neutral
    case OpportunityStage.Qualified:
      return 'grey';     // Progressing - informational
    case OpportunityStage.ProofOfConcept:
      return 'blue';     // Active stage - informational
    case OpportunityStage.Negotiation:
      return 'blue';     // Late stage - still informational
    case OpportunityStage.ClosedWon:
      return 'green';    // Success
    case OpportunityStage.ClosedLost:
      return 'red';      // Failure
    default:
      return 'grey';
  }
}

/**
 * Get badge color based on forecast category
 */
function getForecastColor(category: ForecastCategory): 'blue' | 'grey' | 'green' | 'red' {
  switch (category) {
    case ForecastCategory.Commit:
      return 'green';
    case ForecastCategory.BestCase:
      return 'blue';
    case ForecastCategory.Pipeline:
      return 'grey';
    case ForecastCategory.Omitted:
      return 'red';
    default:
      return 'grey';
  }
}

/**
 * Get badge color based on health status
 */
function getHealthColor(health: HealthStatus): 'blue' | 'grey' | 'green' | 'red' {
  switch (health) {
    case HealthStatus.Green:
      return 'green';
    case HealthStatus.Yellow:
      return 'blue'; // Cloudscape doesn't have yellow, use blue for warning
    case HealthStatus.Red:
      return 'red';
    default:
      return 'grey';
  }
}

/**
 * StatusBadge component for stage/status indicators
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  type,
  className,
}) => {
  let color: 'blue' | 'grey' | 'green' | 'red' = 'grey';
  
  // Determine color based on type
  if (type === 'stage') {
    color = getStageColor(status as OpportunityStage);
  } else if (type === 'forecast') {
    color = getForecastColor(status as ForecastCategory);
  } else if (type === 'health') {
    color = getHealthColor(status as HealthStatus);
  }
  
  return (
    <Badge color={color} className={className}>
      {status}
    </Badge>
  );
};

export default StatusBadge;
