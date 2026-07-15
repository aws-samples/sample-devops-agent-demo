/**
 * RepPerformanceCard Component
 * 
 * Displays individual sales rep performance metrics including pipeline value,
 * closed deals, quota attainment, and win rate.
 */

// Individual imports to avoid Cloudscape circular dependency issues with barrel exports
import Box from '@cloudscape-design/components/box';
import ColumnLayout from '@cloudscape-design/components/column-layout';
import Container from '@cloudscape-design/components/container';
import Header from '@cloudscape-design/components/header';
import ProgressBar from '@cloudscape-design/components/progress-bar';
import SpaceBetween from '@cloudscape-design/components/space-between';
import { TeamMember } from '../../types';
import { formatCurrency } from '../../utils/formatters';

export interface RepPerformanceCardProps {
  /** Team member data */
  member: TeamMember;
}

/**
 * RepPerformanceCard displays performance metrics for an individual sales rep
 */
export function RepPerformanceCard({ member }: RepPerformanceCardProps) {
  // Determine quota attainment status color
  const getQuotaStatus = (attainment: number): 'success' | 'in-progress' | 'error' => {
    if (attainment >= 100) return 'success';
    if (attainment >= 75) return 'in-progress';
    return 'error';
  };

  // Determine win rate status color
  const getWinRateColor = (winRate: number) => {
    if (winRate >= 70) return 'text-status-success' as const;
    if (winRate >= 50) return 'text-status-info' as const;
    return 'text-status-warning' as const;
  };

  return (
    <Container
      header={
        <Header
          variant="h3"
          description={member.role}
        >
          <span style={{ whiteSpace: 'nowrap' }}>{member.name}</span>
        </Header>
      }
    >
      <SpaceBetween size="l">
        {/* Quota Attainment */}
        <div>
          <Box variant="awsui-key-label" margin={{ bottom: 'xxs' }}>
            Quota Attainment
          </Box>
          <ProgressBar
            value={member.quotaAttainment}
            status={getQuotaStatus(member.quotaAttainment)}
            label={`${member.quotaAttainment.toFixed(1)}%`}
            description={`${formatCurrency(member.closedWonValue)} of ${formatCurrency(member.quota)}`}
          />
        </div>

        {/* Key Metrics */}
        <ColumnLayout 
          columns={2} 
          variant="text-grid"
        >
          <div>
            <Box variant="awsui-key-label" fontSize="body-s" color="text-label">
              Pipeline Value
            </Box>
            <Box fontSize="heading-l" fontWeight="bold">
              {formatCurrency(member.pipelineValue)}
            </Box>
          </div>
          <div>
            <Box variant="awsui-key-label" fontSize="body-s" color="text-label">
              Closed Won
            </Box>
            <Box fontSize="heading-l" fontWeight="bold">
              {formatCurrency(member.closedWonValue)}
            </Box>
          </div>
        </ColumnLayout>

        {/* Additional Metrics */}
        <ColumnLayout 
          columns={2} 
          variant="text-grid"
        >
          <div>
            <Box variant="awsui-key-label" fontSize="body-s" color="text-label">
              Win Rate
            </Box>
            <Box fontSize="heading-m" fontWeight="bold" color={getWinRateColor(member.winRate)}>
              {member.winRate.toFixed(0)}%
            </Box>
          </div>
          <div>
            <Box variant="awsui-key-label" fontSize="body-s" color="text-label">
              Opportunities
            </Box>
            <Box fontSize="heading-m" fontWeight="bold">
              {member.opportunityCount}
            </Box>
          </div>
          <div>
            <Box variant="awsui-key-label" fontSize="body-s" color="text-label">
              Avg Deal Size
            </Box>
            <Box fontSize="heading-m" fontWeight="bold">
              {formatCurrency(member.pipelineValue / member.opportunityCount)}
            </Box>
          </div>
        </ColumnLayout>
      </SpaceBetween>
    </Container>
  );
}
