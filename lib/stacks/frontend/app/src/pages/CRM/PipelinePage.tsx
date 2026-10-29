/**
 * Pipeline Dashboard Page
 * 
 * Main dashboard for viewing and managing the sales opportunity pipeline.
 * 
 * Features:
 * - Stage metrics cards showing pipeline health
 * - Comprehensive filtering (date range, stage, owner, search)
 * - Sortable opportunities table
 * - Responsive layout
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
// Individual imports to avoid Cloudscape circular dependency issues with barrel exports
import ContentLayout from '@cloudscape-design/components/content-layout';
import Header from '@cloudscape-design/components/header';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Container from '@cloudscape-design/components/container';
import { StageMetrics } from './components/pipeline/StageMetrics';
import { OpportunityFilters } from './components/pipeline/OpportunityFilters';
import { OpportunityTable } from './components/pipeline/OpportunityTable';
import { calculatePipelineMetrics } from './utils/calculations';
import { filterAndSearchOpportunities } from './utils/filters';
import { OpportunityStage, ForecastCategory, Opportunity } from './types';
import { LoadingSpinner, ErrorAlert } from '../../common/components';
import { useDebounce } from './hooks/useDebounce';
import { fetchOpportunities } from '../../services/api';

/**
 * PipelinePage Component
 * 
 * The main pipeline dashboard that displays stage metrics, filters, and opportunities table.
 */
export const PipelinePage: React.FC = () => {
  // Loading and error state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Opportunities data from API
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);

  // Filter state
  const [filters, setFilters] = useState({
    dateRange: {
      start: null as Date | null,
      end: null as Date | null,
    },
    stage: [] as OpportunityStage[],
    owner: [] as string[],
    forecastCategory: [] as ForecastCategory[],
    searchQuery: '',
  });

  // Load opportunities from API
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchOpportunities();
        setOpportunities(data);
        setLoading(false);
      } catch (err) {
        setError('Failed to load opportunities. Please try again.');
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Debounce search query to reduce filtering frequency (300ms delay)
  const debouncedSearchQuery = useDebounce(filters.searchQuery, 300);

  // Apply filters and search to opportunities
  // Memoized to prevent recalculation on every render
  const filteredOpportunities = useMemo(() => {
    console.time('filterOpportunities');
    const result = filterAndSearchOpportunities(
      opportunities,
      {
        dateRange: filters.dateRange,
        stage: filters.stage,
        owner: filters.owner,
        forecastCategory: filters.forecastCategory,
      },
      debouncedSearchQuery
    );
    console.timeEnd('filterOpportunities');
    return result;
  }, [opportunities, filters.dateRange, filters.stage, filters.owner, filters.forecastCategory, debouncedSearchQuery]);

  // Calculate pipeline metrics from filtered opportunities
  // Memoized to prevent recalculation on every render
  const pipelineMetrics = useMemo(() => {
    console.time('calculatePipelineMetrics');
    const result = calculatePipelineMetrics(filteredOpportunities);
    console.timeEnd('calculatePipelineMetrics');
    return result;
  }, [filteredOpportunities]);

  // Handle filter changes
  // Memoized with useCallback to prevent function recreation on every render
  const handleFilterChange = useCallback((newFilters: typeof filters) => {
    setFilters(newFilters);
  }, []);

  // Handle retry
  // Memoized with useCallback to prevent function recreation on every render
  const handleRetry = useCallback(() => {
    setError(null);
    setLoading(true);
    // Trigger reload
    setTimeout(() => setLoading(false), 500);
  }, []);

  // Show loading state
  if (loading) {
    return (
      <ContentLayout
        header={
          <Header
            variant="h1"
            description="Track and manage your sales opportunities across all pipeline stages"
          >
            Pipeline Dashboard
          </Header>
        }
      >
        <LoadingSpinner message="Loading pipeline data..." />
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
            description="Track and manage your sales opportunities across all pipeline stages"
          >
            Pipeline Dashboard
          </Header>
        }
      >
        <ErrorAlert
          header="Failed to load pipeline"
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
          description="Track and manage your sales opportunities across all pipeline stages"
        >
          Pipeline Dashboard
        </Header>
      }
    >
      <SpaceBetween size="l">
        {/* Stage Metrics */}
        <Container>
          <StageMetrics metrics={pipelineMetrics} />
        </Container>

        {/* Filters */}
        <OpportunityFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          showForecastFilter={true}
        />

        {/* Opportunities Table */}
        <OpportunityTable
          opportunities={filteredOpportunities}
          headerText="Opportunities"
          headerDescription={`Showing ${filteredOpportunities.length} of ${opportunities.length} opportunities`}
          loading={false}
        />
      </SpaceBetween>
    </ContentLayout>
  );
};

export default PipelinePage;
