/**
 * TeamMetrics Component
 * 
 * Displays team-wide performance metrics including total pipeline value,
 * won deals, and win rate using Cloudscape Cards.
 */

// Individual imports to avoid Cloudscape circular dependency issues with barrel exports
import Box from '@cloudscape-design/components/box';
import ColumnLayout from '@cloudscape-design/components/column-layout';
import SpaceBetween from '@cloudscape-design/components/space-between';
import { formatCurrency } from '../../utils/formatters';

export interface TeamMetricsProps {
  /** Total pipeline value across all team members */
  totalPipeline: number;
  
  /** Total closed won value */
  totalWon: number;
  
  /** Team win rate percentage */
  winRate: number;
  
  /** Total number of opportunities */
  totalOpportunities: number;
  
  /** Average deal size */
  averageDealSize: number;
  
  /** Pipeline velocity in days */
  pipelineVelocity: number;
}

/**
 * TeamMetrics displays key team-wide performance indicators
 */
export function TeamMetrics({
  totalPipeline,
  totalWon,
  winRate,
  totalOpportunities,
  averageDealSize,
  pipelineVelocity,
}: TeamMetricsProps) {
  const metrics = [
    {
      label: 'Total Pipeline',
      value: formatCurrency(totalPipeline),
      description: 'Open opportunities across all reps',
    },
    {
      label: 'Total Won',
      value: formatCurrency(totalWon),
      description: 'Closed won deals this period',
    },
    {
      label: 'Win Rate',
      value: `${winRate.toFixed(1)}%`,
      description: 'Percentage of closed deals won',
    },
    {
      label: 'Total Opportunities',
      value: totalOpportunities.toString(),
      description: 'Active opportunities in pipeline',
    },
    {
      label: 'Avg Deal Size',
      value: formatCurrency(averageDealSize),
      description: 'Average opportunity value',
    },
    {
      label: 'Pipeline Velocity',
      value: `${Math.round(pipelineVelocity)} days`,
      description: 'Average time to close',
    },
  ];

  return (
    <ColumnLayout 
      columns={3} 
      variant="text-grid"
    >
      {metrics.map((metric, index) => (
        <Box key={index} padding={{ vertical: 's' }}>
          <SpaceBetween size="xxs">
            <Box variant="awsui-key-label" fontSize="body-s" color="text-label">
              {metric.label}
            </Box>
            <Box fontSize="display-l" fontWeight="bold">
              {metric.value}
            </Box>
            <Box variant="small" color="text-body-secondary">
              {metric.description}
            </Box>
          </SpaceBetween>
        </Box>
      ))}
    </ColumnLayout>
  );
}
