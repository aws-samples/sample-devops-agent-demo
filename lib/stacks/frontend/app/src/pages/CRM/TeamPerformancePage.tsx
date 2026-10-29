/**
 * Team Performance Page
 * 
 * Manager dashboard for viewing team-wide performance metrics and individual
 * sales rep performance.
 * 
 * Features:
 * - Team-wide pipeline metrics
 * - Individual rep performance cards
 * - Time period filtering (This Quarter, This Month, This Year)
 * - Pipeline velocity and growth metrics
 * - Performance visualizations
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
// Individual imports to avoid Cloudscape circular dependency issues with barrel exports
import ContentLayout from '@cloudscape-design/components/content-layout';
import Header from '@cloudscape-design/components/header';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Container from '@cloudscape-design/components/container';
import Select, { SelectProps } from '@cloudscape-design/components/select';
import Grid from '@cloudscape-design/components/grid';
import Box from '@cloudscape-design/components/box';
import { TeamMetrics } from './components/team/TeamMetrics';
import { RepPerformanceCard } from './components/team/RepPerformanceCard';
import { PerformanceChart } from './components/team/PerformanceChart';
import { mockOpportunities } from './data/mockOpportunities';
import { mockTeamMembers } from './data/mockTeamData';
import {
  calculatePipelineMetrics,
  calculateWinRate,
  calculateAverageDealSize,
  calculatePipelineVelocity,
} from './utils/calculations';
import { OpportunityStage, ChartDataPoint } from './types';
import { LoadingSpinner, ErrorAlert } from '../../common/components';

/**
 * Time period options for filtering
 */
type TimePeriod = 'quarter' | 'month' | 'year';

interface TimePeriodOption {
  label: string;
  value: TimePeriod;
}

const TIME_PERIOD_OPTIONS: TimePeriodOption[] = [
  { label: 'This Quarter', value: 'quarter' },
  { label: 'This Month', value: 'month' },
  { label: 'This Year', value: 'year' },
];

/**
 * TeamPerformancePage Component
 * 
 * Displays team-wide metrics and individual rep performance with time period filtering.
 */
export const TeamPerformancePage: React.FC = () => {
  // Loading and error state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Simulate data loading
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        await new Promise(resolve => setTimeout(resolve, 450));
        setLoading(false);
      } catch (err) {
        setError('Failed to load team performance data. Please try again.');
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Time period filter state
  const [selectedPeriod, setSelectedPeriod] = useState<SelectProps.Option>({
    label: 'This Quarter',
    value: 'quarter',
  });

  // Filter opportunities by time period
  // Memoized to prevent recalculation on every render
  const filteredOpportunities = useMemo(() => {
    console.time('filterOpportunitiesByPeriod');
    const now = new Date();
    let startDate: Date;

    switch (selectedPeriod.value) {
      case 'month':
        // First day of current month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        // First day of current year
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'quarter':
      default:
        // First day of current quarter
        const currentQuarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
        break;
    }

    const result = mockOpportunities.filter((opp) => {
      const oppDate = new Date(opp.createdDate);
      return oppDate >= startDate;
    });
    console.timeEnd('filterOpportunitiesByPeriod');
    return result;
  }, [selectedPeriod]);

  // Calculate team-wide metrics
  // Memoized to prevent recalculation on every render
  const teamMetrics = useMemo(() => {
    console.time('calculateTeamMetrics');
    const pipelineMetrics = calculatePipelineMetrics(filteredOpportunities);
    const winRate = calculateWinRate(filteredOpportunities);
    const averageDealSize = calculateAverageDealSize(filteredOpportunities);
    const pipelineVelocity = calculatePipelineVelocity(filteredOpportunities);

    const result = {
      totalPipeline: pipelineMetrics.openPipeline,
      totalWon: pipelineMetrics.wonOpportunities,
      winRate,
      totalOpportunities: filteredOpportunities.filter(
        (opp) =>
          opp.stage !== OpportunityStage.ClosedWon &&
          opp.stage !== OpportunityStage.ClosedLost
      ).length,
      averageDealSize,
      pipelineVelocity,
    };
    console.timeEnd('calculateTeamMetrics');
    return result;
  }, [filteredOpportunities]);

  // Generate pipeline trend chart data (last 6 months)
  // Memoized to prevent recalculation on every render
  const pipelineTrendData = useMemo((): ChartDataPoint[] => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const now = new Date();
    
    return months.map((month, index) => {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      
      // Calculate pipeline value for this month
      const monthOpportunities = mockOpportunities.filter((opp) => {
        const oppDate = new Date(opp.createdDate);
        return (
          oppDate.getMonth() === monthDate.getMonth() &&
          oppDate.getFullYear() === monthDate.getFullYear() &&
          opp.stage !== OpportunityStage.ClosedWon &&
          opp.stage !== OpportunityStage.ClosedLost
        );
      });
      
      const pipelineValue = monthOpportunities.reduce((sum, opp) => sum + opp.amount, 0);
      
      return {
        x: month,
        y: pipelineValue / 1000000, // Convert to millions for readability
        label: month,
      };
    });
  }, []);

  // Generate win rate by rep chart data
  // Memoized to prevent recalculation on every render
  const winRateByRepData = useMemo((): ChartDataPoint[] => {
    return mockTeamMembers
      .sort((a, b) => b.winRate - a.winRate)
      .slice(0, 8) // Top 8 reps
      .map((member) => ({
        x: member.name.split(' ')[0], // First name only for chart
        y: member.winRate,
        label: member.name.split(' ')[0],
      }));
  }, []);

  // Handle retry
  // Memoized with useCallback to prevent function recreation on every render
  const handleRetry = useCallback(() => {
    setError(null);
    setLoading(true);
    setTimeout(() => setLoading(false), 450);
  }, []);

  // Show loading state
  if (loading) {
    return (
      <ContentLayout
        header={
          <Header
            variant="h1"
            description="Monitor team performance, quota attainment, and pipeline health"
          >
            Team Performance
          </Header>
        }
      >
        <LoadingSpinner message="Loading team performance data..." />
      </ContentLayout>
    );
  }

  // Show error state
  if (error) {
    return (
      <ContentLayout
        header={
          <Header
            variant="h1"
            description="Monitor team performance, quota attainment, and pipeline health"
          >
            Team Performance
          </Header>
        }
      >
        <ErrorAlert
          header="Failed to load team performance"
          message={error}
          onRetry={handleRetry}
          showReload={true}
        />
      </ContentLayout>
    );
  }

  return (
    <ContentLayout
      header={
        <Header
          variant="h1"
          description="Monitor team performance, quota attainment, and pipeline health"
          actions={
            <Select
              selectedOption={selectedPeriod}
              onChange={({ detail }) => setSelectedPeriod(detail.selectedOption)}
              options={TIME_PERIOD_OPTIONS}
              selectedAriaLabel="Selected time period"
            />
          }
        >
          Team Performance
        </Header>
      }
    >
      <SpaceBetween size="l">
        {/* Team-Wide Metrics */}
        <Container
          header={
            <Header variant="h2" description="Aggregate metrics across all team members">
              Team Metrics
            </Header>
          }
        >
          <TeamMetrics
            totalPipeline={teamMetrics.totalPipeline}
            totalWon={teamMetrics.totalWon}
            winRate={teamMetrics.winRate}
            totalOpportunities={teamMetrics.totalOpportunities}
            averageDealSize={teamMetrics.averageDealSize}
            pipelineVelocity={teamMetrics.pipelineVelocity}
          />
        </Container>

        {/* Performance Charts */}
        <Grid 
          gridDefinition={[
            { colspan: { default: 12, xxs: 12, xs: 12, s: 12, m: 6 } },
            { colspan: { default: 12, xxs: 12, xs: 12, s: 12, m: 6 } },
          ]}
        >
          <PerformanceChart
            data={pipelineTrendData}
            type="line"
            title="Pipeline Trend"
            description="Pipeline value over the last 6 months (in millions)"
            xAxisLabel="Month"
          />
          <PerformanceChart
            data={winRateByRepData}
            type="bar"
            title="Win Rate by Rep"
            description="Top performing sales representatives"
            xAxisLabel="Sales Rep"
          />
        </Grid>

        {/* Individual Rep Performance */}
        <Container
          header={
            <Header
              variant="h2"
              description="Individual performance metrics and quota attainment"
            >
              Individual Performance
            </Header>
          }
        >
          <Grid
            gridDefinition={[
              { colspan: { default: 12, xs: 6, s: 4 } },
              { colspan: { default: 12, xs: 6, s: 4 } },
              { colspan: { default: 12, xs: 6, s: 4 } },
              { colspan: { default: 12, xs: 6, s: 4 } },
              { colspan: { default: 12, xs: 6, s: 4 } },
              { colspan: { default: 12, xs: 6, s: 4 } },
              { colspan: { default: 12, xs: 6, s: 4 } },
              { colspan: { default: 12, xs: 6, s: 4 } },
              { colspan: { default: 12, xs: 6, s: 4 } },
              { colspan: { default: 12, xs: 6, s: 4 } },
              { colspan: { default: 12, xs: 6, s: 4 } },
              { colspan: { default: 12, xs: 6, s: 4 } },
            ]}
          >
            {mockTeamMembers
              .sort((a, b) => b.quotaAttainment - a.quotaAttainment)
              .map((member) => (
                <RepPerformanceCard key={member.id} member={member} />
              ))}
          </Grid>
        </Container>

        {/* Additional Insights */}
        <Container
          header={
            <Header variant="h2" description="Key insights and trends">
              Performance Insights
            </Header>
          }
        >
          <SpaceBetween size="m">
            <Box>
              <Box variant="awsui-key-label" margin={{ bottom: 'xxs' }}>
                Pipeline Growth
              </Box>
              <Box fontSize="heading-l" fontWeight="bold" color="text-status-success">
                +12.5%
              </Box>
              <Box variant="small" color="text-body-secondary">
                Compared to previous {selectedPeriod.label?.toLowerCase()}
              </Box>
            </Box>
            <Box>
              <Box variant="awsui-key-label" margin={{ bottom: 'xxs' }}>
                Top Performer
              </Box>
              <Box fontSize="heading-l" fontWeight="bold">
                {mockTeamMembers.sort((a, b) => b.quotaAttainment - a.quotaAttainment)[0]?.name}
              </Box>
              <Box variant="small" color="text-body-secondary">
                {mockTeamMembers.sort((a, b) => b.quotaAttainment - a.quotaAttainment)[0]?.quotaAttainment.toFixed(1)}% quota attainment
              </Box>
            </Box>
            <Box>
              <Box variant="awsui-key-label" margin={{ bottom: 'xxs' }}>
                Team Quota Attainment
              </Box>
              <Box fontSize="heading-l" fontWeight="bold">
                {(
                  (mockTeamMembers.reduce((sum, m) => sum + m.closedWonValue, 0) /
                    mockTeamMembers.reduce((sum, m) => sum + m.quota, 0)) *
                  100
                ).toFixed(1)}%
              </Box>
              <Box variant="small" color="text-body-secondary">
                Aggregate team performance against quota
              </Box>
            </Box>
          </SpaceBetween>
        </Container>
      </SpaceBetween>
    </ContentLayout>
  );
};

export default TeamPerformancePage;
