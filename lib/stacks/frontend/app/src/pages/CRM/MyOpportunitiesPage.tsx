/**
 * My Opportunities Page
 * 
 * Personal pipeline view for individual sales representatives.
 * 
 * Features:
 * - Filter opportunities by current user
 * - Display personal pipeline metrics
 * - Show quota attainment with progress bar
 * - Highlight overdue opportunities
 * - Calculate weighted forecast value
 * - Reuse OpportunityTable component
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import React, { useMemo, useState, useEffect, useCallback } from 'react';
// Individual imports to avoid Cloudscape circular dependency issues with barrel exports
import ContentLayout from '@cloudscape-design/components/content-layout';
import Header from '@cloudscape-design/components/header';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Container from '@cloudscape-design/components/container';
import ColumnLayout from '@cloudscape-design/components/column-layout';
import Box from '@cloudscape-design/components/box';
import ProgressBar from '@cloudscape-design/components/progress-bar';
import Badge from '@cloudscape-design/components/badge';
import Input from '@cloudscape-design/components/input';
import Button from '@cloudscape-design/components/button';
import FormField from '@cloudscape-design/components/form-field';
import { OpportunityTable } from './components/pipeline/OpportunityTable';
import { CurrencyDisplay } from './components/shared';
import { useCRM } from './context/CRMContext';
import { Opportunity, OpportunityStage } from './types';
import { LoadingSpinner, ErrorAlert } from '../../common/components';
import { fetchOpportunities, searchOpportunities } from '../../services/api';

/**
 * Calculate personal pipeline metrics for the current user
 * Memoized calculation function to improve performance
 */
const calculatePersonalMetrics = (opportunities: Opportunity[]) => {
  console.time('calculatePersonalMetrics');
  const now = new Date();
  
  // Total pipeline value (all open opportunities)
  const openOpportunities = opportunities.filter(
    opp => opp.stage !== 'Closed Won' && opp.stage !== 'Closed Lost'
  );
  const totalPipelineValue = openOpportunities.reduce((sum, opp) => sum + opp.amount, 0);
  
  // Weighted forecast (probability × amount for open opportunities)
  const weightedForecast = openOpportunities.reduce(
    (sum, opp) => sum + (opp.amount * opp.probability / 100),
    0
  );
  
  // Closed won value
  const closedWonOpportunities = opportunities.filter(opp => opp.stage === 'Closed Won');
  const closedWonValue = closedWonOpportunities.reduce((sum, opp) => sum + opp.amount, 0);
  
  // Overdue opportunities (close date in the past, not closed)
  const overdueOpportunities = openOpportunities.filter(
    opp => new Date(opp.closeDate) < now
  );
  
  // Opportunities by stage
  const opportunitiesByStage = openOpportunities.reduce((acc, opp) => {
    acc[opp.stage] = (acc[opp.stage] || 0) + 1;
    return acc;
  }, {} as Record<OpportunityStage, number>);
  
  console.timeEnd('calculatePersonalMetrics');
  return {
    totalPipelineValue,
    weightedForecast,
    closedWonValue,
    openCount: openOpportunities.length,
    closedWonCount: closedWonOpportunities.length,
    overdueCount: overdueOpportunities.length,
    overdueOpportunities,
    opportunitiesByStage,
  };
};

/**
 * MyOpportunitiesPage Component
 * 
 * Displays the current user's personal pipeline with metrics and opportunities.
 */
export const MyOpportunitiesPage: React.FC = () => {
  const { currentUser } = useCRM();
  
  // Loading and error state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Opportunity[]>([]);

  // Load all opportunities from API
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchOpportunities();
        setOpportunities(data);
        setLoading(false);
      } catch (err) {
        console.error('Error loading opportunities:', err);
        setError('Failed to load opportunities. Please try again.');
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Handle search with debouncing
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    try {
      setIsSearching(true);
      setError(null);
      const results = await searchOpportunities(query);
      setSearchResults(results);
    } catch (err) {
      console.error('Error searching opportunities:', err);
      setError('Failed to search opportunities. Please try again.');
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch(searchQuery);
      } else {
        setSearchResults([]);
        setIsSearching(false);
      }
    }, 300); // 300ms delay

    return () => clearTimeout(timeoutId);
  }, [searchQuery, handleSearch]);

  // Handle clear search
  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
  }, []);
  
  // All opportunities for current user (including closed for metrics)
  const allUserOpportunities = useMemo(() => {
    return opportunities.filter(opp => opp.ownerId === currentUser.id);
  }, [opportunities, currentUser.id]);

  // Filter opportunities for current user (open opportunities only for display)
  const userOpenOpportunities = useMemo(() => {
    return allUserOpportunities.filter(opp => 
      opp.stage !== 'Closed Won' && 
      opp.stage !== 'Closed Lost'
    );
  }, [allUserOpportunities]);

  // Filter search results for current user (open opportunities only)
  const userSearchResults = useMemo(() => {
    return searchResults.filter(opp => 
      opp.ownerId === currentUser.id && 
      opp.stage !== 'Closed Won' && 
      opp.stage !== 'Closed Lost'
    );
  }, [searchResults, currentUser.id]);

  // Determine which opportunities to display (search results or open opportunities)
  const displayOpportunities = useMemo(() => {
    return searchQuery.trim() ? userSearchResults : userOpenOpportunities;
  }, [userOpenOpportunities, userSearchResults, searchQuery]);
  
  // Calculate metrics for all user opportunities (including closed)
  // Memoized to prevent recalculation on every render
  const metrics = useMemo(() => {
    return calculatePersonalMetrics(allUserOpportunities);
  }, [allUserOpportunities]);
  
  // Calculate quota attainment percentage
  // Memoized to prevent recalculation on every render
  const quotaAttainment = useMemo(() => {
    if (currentUser.quota === 0) return 0;
    // Use the calculated closed won value from opportunities data
    const attainmentPercent = (metrics.closedWonValue / currentUser.quota) * 100;
    return Math.round(attainmentPercent);
  }, [metrics.closedWonValue, currentUser.quota]);
  
  // Determine quota attainment status
  // Memoized to prevent recalculation on every render
  const quotaStatus = useMemo(() => {
    return quotaAttainment >= 100 ? 'success' : quotaAttainment >= 70 ? 'in-progress' : 'error';
  }, [quotaAttainment]);
  
  // Sort opportunities to show overdue first (for display, not metrics)
  const sortedOpportunities = useMemo(() => {
    if (searchQuery.trim()) {
      // For search results, show by relevance (already sorted by API)
      return displayOpportunities;
    } else {
      // For regular view, show overdue first
      const overdue = metrics.overdueOpportunities.filter(opp => 
        displayOpportunities.some(dispOpp => dispOpp.id === opp.id)
      );
      const notOverdue = displayOpportunities.filter(
        opp => !overdue.some(overdueOpp => overdueOpp.id === opp.id)
      );
      return [...overdue, ...notOverdue];
    }
  }, [displayOpportunities, metrics.overdueOpportunities, searchQuery]);

  // Handle retry
  const handleRetry = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await fetchOpportunities();
      setOpportunities(data);
      setLoading(false);
      // Clear search results on retry
      setSearchQuery('');
      setSearchResults([]);
      setIsSearching(false);
    } catch (err) {
      console.error('Error loading opportunities:', err);
      setError('Failed to load your opportunities. Please try again.');
      setLoading(false);
    }
  }, []);

  // Show loading state
  if (loading) {
    return (
      <ContentLayout
        header={
          <Header
            variant="h1"
            description={`Your personal pipeline and opportunities for ${currentUser.name}`}
          >
            My Opportunities
          </Header>
        }
      >
        <LoadingSpinner message="Loading opportunities..." />
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
            description={`Your personal pipeline and opportunities for ${currentUser.name}`}
          >
            My Opportunities
          </Header>
        }
      >
        <ErrorAlert
          header="Failed to load opportunities"
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
          description={`Your personal pipeline and opportunities for ${currentUser.name}`}
        >
          My Opportunities
        </Header>
      }
    >
      <SpaceBetween size="l">
        {/* Personal Pipeline Metrics */}
        <Container
          header={
            <Header variant="h2">
              Personal Pipeline Metrics
            </Header>
          }
        >
          <ColumnLayout 
            columns={4} 
            variant="text-grid"
          >
            {/* Total Pipeline Value */}
            <div>
              <Box variant="awsui-key-label">Total Pipeline Value</Box>
              <Box fontSize="display-l" fontWeight="bold">
                <CurrencyDisplay amount={metrics.totalPipelineValue} />
              </Box>
              <Box variant="small" color="text-status-inactive">
                {metrics.openCount} open opportunities
              </Box>
            </div>
            
            {/* Weighted Forecast */}
            <div>
              <Box variant="awsui-key-label">Weighted Forecast</Box>
              <Box fontSize="display-l" fontWeight="bold">
                <CurrencyDisplay amount={metrics.weightedForecast} />
              </Box>
              <Box variant="small" color="text-status-inactive">
                Probability-adjusted value
              </Box>
            </div>
            
            {/* Closed Won */}
            <div>
              <Box variant="awsui-key-label">Closed Won</Box>
              <Box fontSize="display-l" fontWeight="bold" color="text-status-success">
                <CurrencyDisplay amount={metrics.closedWonValue} />
              </Box>
              <Box variant="small" color="text-status-inactive">
                {metrics.closedWonCount} deals closed
              </Box>
            </div>
            
            {/* Overdue Opportunities */}
            <div>
              <Box variant="awsui-key-label">Overdue Opportunities</Box>
              <Box fontSize="display-l" fontWeight="bold" color={metrics.overdueCount > 0 ? "text-status-error" : "inherit"}>
                {metrics.overdueCount}
              </Box>
              <Box variant="small" color="text-status-inactive">
                {metrics.overdueCount > 0 ? 'Require immediate attention' : 'All on track'}
              </Box>
            </div>
          </ColumnLayout>
        </Container>
        
        {/* Quota Attainment */}
        <Container
          header={
            <Header
              variant="h2"
              description={`Your quota: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(currentUser.quota)}`}
            >
              Quota Attainment
            </Header>
          }
        >
          <SpaceBetween size="m">
            <ProgressBar
              value={quotaAttainment}
              status={quotaStatus}
              label="Quota progress"
              resultText={`${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(metrics.closedWonValue)} of ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(currentUser.quota)}`}
              additionalInfo={
                quotaAttainment >= 100 
                  ? '🎉 Quota exceeded!' 
                  : quotaAttainment >= 70 
                  ? 'On track to meet quota' 
                  : 'Additional effort needed'
              }
            />
            
            <ColumnLayout 
              columns={3} 
              variant="text-grid"
            >
              <div>
                <Box variant="awsui-key-label">Remaining to Quota</Box>
                <Box fontSize="heading-l" fontWeight="bold">
                  <CurrencyDisplay amount={Math.max(0, currentUser.quota - metrics.closedWonValue)} />
                </Box>
              </div>
              
              <div>
                <Box variant="awsui-key-label">Win Rate</Box>
                <Box fontSize="heading-l" fontWeight="bold">
                  {currentUser.winRate}%
                </Box>
              </div>
              
              <div>
                <Box variant="awsui-key-label">Average Deal Size</Box>
                <Box fontSize="heading-l" fontWeight="bold">
                  <CurrencyDisplay 
                    amount={metrics.closedWonCount > 0 ? metrics.closedWonValue / metrics.closedWonCount : 0} 
                  />
                </Box>
              </div>
            </ColumnLayout>
          </SpaceBetween>
        </Container>
        
        {/* Overdue Opportunities Alert */}
        {metrics.overdueCount > 0 && (
          <Container>
            <SpaceBetween size="s">
              <Box variant="h3">
                <Badge color="red">⚠️ {metrics.overdueCount} Overdue</Badge>
                {' '}
                <span>Opportunities Past Close Date</span>
              </Box>
              <Box variant="p" color="text-status-error">
                The following opportunities have passed their close date and require immediate attention.
                Update the close date or stage to keep your pipeline accurate.
              </Box>
            </SpaceBetween>
          </Container>
        )}
        
        {/* Search Section */}
        <Container
          header={
            <Header variant="h2">
              Search Opportunities
            </Header>
          }
        >
          <SpaceBetween size="m">
            <FormField
              label="Search opportunities"
              description="Search by opportunity name, account, owner, next steps, or recent activity. Results update as you type."
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: 1, minWidth: '400px' }}>
                  <Input
                    value={searchQuery}
                    onChange={({ detail }) => setSearchQuery(detail.value)}
                    placeholder="Start typing to search... e.g., cloud migration, finance platform, Sarah Chen"
                    type="search"
                    clearAriaLabel="Clear search"
                  />
                </div>
                {searchQuery && (
                  <Button
                    variant="normal"
                    onClick={handleClearSearch}
                    disabled={isSearching}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </FormField>
            
            {searchQuery && (
              <Box variant="small" color="text-status-info">
                {isSearching 
                  ? 'Searching...' 
                  : `Found ${displayOpportunities.length} opportunities matching "${searchQuery}"`
                }
              </Box>
            )}
          </SpaceBetween>
        </Container>

        {/* Open Opportunities Table */}
        <OpportunityTable
          opportunities={sortedOpportunities}
          headerText={searchQuery ? "Search Results" : "Open Opportunities"}
          headerDescription={
            searchQuery 
              ? `${displayOpportunities.length} open opportunities matching "${searchQuery}"`
              : metrics.overdueCount > 0 
                ? `${metrics.overdueCount} overdue opportunities shown first`
                : `${displayOpportunities.length} open opportunities`
          }
        />
      </SpaceBetween>
    </ContentLayout>
  );
};

export default MyOpportunitiesPage;
