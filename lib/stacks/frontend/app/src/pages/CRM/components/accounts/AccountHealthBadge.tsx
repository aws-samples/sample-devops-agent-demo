/**
 * AccountHealthBadge Component
 * 
 * Displays a visual indicator for account health status with color coding.
 * - Green: Healthy account
 * - Yellow: At risk
 * - Red: Critical
 */

// Individual imports to avoid Cloudscape circular dependency issues with barrel exports
import Badge from '@cloudscape-design/components/badge';
import Box from '@cloudscape-design/components/box';
import { HealthStatus } from '../../types';

interface AccountHealthBadgeProps {
  health: HealthStatus;
  score?: number;
}

export const AccountHealthBadge: React.FC<AccountHealthBadgeProps> = ({ health, score }) => {
  const getHealthColor = (status: HealthStatus): 'green' | 'red' | 'grey' => {
    switch (status) {
      case HealthStatus.Green:
        return 'green';
      case HealthStatus.Red:
        return 'red';
      case HealthStatus.Yellow:
        return 'grey'; // Cloudscape uses 'grey' for warning/yellow
      default:
        return 'grey';
    }
  };

  const getHealthLabel = (status: HealthStatus): string => {
    switch (status) {
      case HealthStatus.Green:
        return 'Healthy';
      case HealthStatus.Yellow:
        return 'At Risk';
      case HealthStatus.Red:
        return 'Critical';
      default:
        return 'Unknown';
    }
  };

  return (
    <Box display="inline-block">
      <Badge color={getHealthColor(health)}>
        {getHealthLabel(health)}
        {score !== undefined && ` (${score})`}
      </Badge>
    </Box>
  );
};
