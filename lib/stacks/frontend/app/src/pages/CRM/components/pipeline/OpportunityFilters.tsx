/**
 * Opportunity Filters Component
 * 
 * Provides comprehensive filtering controls for the opportunity pipeline:
 * - Date range picker for close date filtering
 * - Multi-select stage filter
 * - Multi-select owner filter
 * - Search input for text search (debounced for performance)
 * - Clear filters button
 * 
 * All filter changes are emitted to the parent component via callbacks.
 * Optimized with React.memo to prevent unnecessary re-renders.
 * 
 * Requirements: 1.3, 1.4, 3.1, 3.2, 3.3, 3.4, 3.5
 */

import React, { useMemo, useCallback } from 'react';
// Individual imports to avoid Cloudscape circular dependency issues with barrel exports
import SpaceBetween from '@cloudscape-design/components/space-between';
import FormField from '@cloudscape-design/components/form-field';
import Input from '@cloudscape-design/components/input';
import Multiselect, { MultiselectProps } from '@cloudscape-design/components/multiselect';
import Button from '@cloudscape-design/components/button';
import Container from '@cloudscape-design/components/container';
import Header from '@cloudscape-design/components/header';
import DateRangePicker, { DateRangePickerProps } from '@cloudscape-design/components/date-range-picker';
import { OpportunityStage, ForecastCategory } from '../../types';
import { mockTeamMembers } from '../../data/mockTeamData';

export interface OpportunityFiltersProps {
  /** Current filter state */
  filters: {
    dateRange: {
      start: Date | null;
      end: Date | null;
    };
    stage: OpportunityStage[];
    owner: string[];
    forecastCategory: ForecastCategory[];
    searchQuery: string;
  };
  
  /** Callback when filters change */
  onFilterChange: (filters: OpportunityFiltersProps['filters']) => void;
  
  /** Optional: Show forecast category filter */
  showForecastFilter?: boolean;
}

/**
 * OpportunityFilters Component
 * 
 * A comprehensive filter panel for opportunity pipeline management.
 * Supports date range, stage, owner, forecast, and text search filtering.
 * Optimized with React.memo and useCallback for performance.
 */
export const OpportunityFilters: React.FC<OpportunityFiltersProps> = React.memo(({
  filters,
  onFilterChange,
  showForecastFilter = false,
}) => {
  // Stage options for multiselect
  // Memoized to prevent recreation on every render
  const stageOptions: MultiselectProps.Option[] = useMemo(() => 
    Object.values(OpportunityStage).map(stage => ({
      label: stage,
      value: stage,
    })), []
  );

  // Owner options for multiselect
  // Memoized to prevent recreation on every render
  const ownerOptions: MultiselectProps.Option[] = useMemo(() => 
    mockTeamMembers.map(member => ({
      label: member.name,
      value: member.id,
    })), []
  );

  // Forecast category options for multiselect
  // Memoized to prevent recreation on every render
  const forecastOptions: MultiselectProps.Option[] = useMemo(() => 
    Object.values(ForecastCategory).map(category => ({
      label: category,
      value: category,
    })), []
  );

  // Handle date range change
  // Memoized with useCallback to prevent function recreation on every render
  const handleDateRangeChange = useCallback<NonNullable<DateRangePickerProps['onChange']>>((event) => {
    const { detail } = event;
    let start: Date | null = null;
    let end: Date | null = null;
    
    if (detail.value?.type === 'absolute') {
      start = detail.value.startDate ? new Date(detail.value.startDate) : null;
      end = detail.value.endDate ? new Date(detail.value.endDate) : null;
    }
    
    const newFilters = {
      ...filters,
      dateRange: {
        start,
        end,
      },
    };
    onFilterChange(newFilters);
  }, [filters, onFilterChange]);

  // Handle stage filter change
  // Memoized with useCallback to prevent function recreation on every render
  const handleStageChange = useCallback<NonNullable<MultiselectProps['onChange']>>((event) => {
    const { detail } = event;
    const newFilters = {
      ...filters,
      stage: detail.selectedOptions.map((opt: MultiselectProps.Option) => opt.value as OpportunityStage),
    };
    onFilterChange(newFilters);
  }, [filters, onFilterChange]);

  // Handle owner filter change
  // Memoized with useCallback to prevent function recreation on every render
  const handleOwnerChange = useCallback<NonNullable<MultiselectProps['onChange']>>((event) => {
    const { detail } = event;
    const newFilters = {
      ...filters,
      owner: detail.selectedOptions.map((opt: MultiselectProps.Option) => opt.value as string),
    };
    onFilterChange(newFilters);
  }, [filters, onFilterChange]);

  // Handle forecast category filter change
  // Memoized with useCallback to prevent function recreation on every render
  const handleForecastChange = useCallback<NonNullable<MultiselectProps['onChange']>>((event) => {
    const { detail } = event;
    const newFilters = {
      ...filters,
      forecastCategory: detail.selectedOptions.map((opt: MultiselectProps.Option) => opt.value as ForecastCategory),
    };
    onFilterChange(newFilters);
  }, [filters, onFilterChange]);

  // Handle search query change
  // Note: Search is debounced in the parent component (PipelinePage)
  // This just updates the filter state immediately for UI responsiveness
  const handleSearchChange = useCallback((value: string) => {
    const newFilters = {
      ...filters,
      searchQuery: value,
    };
    onFilterChange(newFilters);
  }, [filters, onFilterChange]);

  // Clear all filters
  // Memoized with useCallback to prevent function recreation on every render
  const handleClearFilters = useCallback(() => {
    const clearedFilters = {
      dateRange: {
        start: null,
        end: null,
      },
      stage: [],
      owner: [],
      forecastCategory: [],
      searchQuery: '',
    };
    onFilterChange(clearedFilters);
  }, [onFilterChange]);

  // Check if any filters are active
  const hasActiveFilters = 
    filters.dateRange.start !== null ||
    filters.dateRange.end !== null ||
    filters.stage.length > 0 ||
    filters.owner.length > 0 ||
    filters.forecastCategory.length > 0 ||
    filters.searchQuery.length > 0;

  // Convert date range for DateRangePicker
  const dateRangeValue: DateRangePickerProps.Value | null = 
    filters.dateRange.start && filters.dateRange.end
      ? {
          type: 'absolute',
          startDate: filters.dateRange.start.toISOString().split('T')[0],
          endDate: filters.dateRange.end.toISOString().split('T')[0],
        }
      : null;

  // Convert selected stages for Multiselect
  const selectedStages = stageOptions.filter(opt => 
    filters.stage.includes(opt.value as OpportunityStage)
  );

  // Convert selected owners for Multiselect
  const selectedOwners = ownerOptions.filter(opt => 
    filters.owner.includes(opt.value as string)
  );

  // Convert selected forecast categories for Multiselect
  const selectedForecast = forecastOptions.filter(opt => 
    filters.forecastCategory.includes(opt.value as ForecastCategory)
  );

  return (
    <Container
      header={
        <Header
          variant="h2"
          actions={
            <Button
              onClick={handleClearFilters}
              disabled={!hasActiveFilters}
              variant="normal"
            >
              Clear filters
            </Button>
          }
        >
          Filters
        </Header>
      }
    >
      <SpaceBetween size="l">
        {/* Search Input */}
        <FormField
          label="Search"
          description="Search by opportunity name, account name, or owner"
        >
          <Input
            value={filters.searchQuery}
            onChange={({ detail }) => handleSearchChange(detail.value)}
            placeholder="Search opportunities..."
            type="search"
            clearAriaLabel="Clear search"
          />
        </FormField>

        {/* Date Range Picker */}
        <FormField
          label="Close Date Range"
          description="Filter by expected close date"
        >
          <DateRangePicker
            onChange={handleDateRangeChange}
            value={dateRangeValue}
            relativeOptions={[
              {
                key: 'previous-7-days',
                amount: 7,
                unit: 'day',
                type: 'relative',
              },
              {
                key: 'previous-30-days',
                amount: 30,
                unit: 'day',
                type: 'relative',
              },
              {
                key: 'previous-90-days',
                amount: 90,
                unit: 'day',
                type: 'relative',
              },
              {
                key: 'next-30-days',
                amount: 30,
                unit: 'day',
                type: 'relative',
              },
              {
                key: 'next-90-days',
                amount: 90,
                unit: 'day',
                type: 'relative',
              },
            ]}
            isValidRange={(range) => {
              if (range?.type === 'absolute') {
                const [startDateWithoutTime] = range.startDate.split('T');
                const [endDateWithoutTime] = range.endDate.split('T');
                if (!startDateWithoutTime || !endDateWithoutTime) {
                  return {
                    valid: false,
                    errorMessage: 'The selected date range is incomplete.',
                  };
                }
                if (new Date(range.startDate) > new Date(range.endDate)) {
                  return {
                    valid: false,
                    errorMessage: 'The start date must be before the end date.',
                  };
                }
              }
              return { valid: true };
            }}
            placeholder="Filter by close date"
            rangeSelectorMode="absolute-only"
          />
        </FormField>

        {/* Stage Filter */}
        <FormField
          label="Stage"
          description="Filter by opportunity stage"
        >
          <Multiselect
            selectedOptions={selectedStages}
            onChange={handleStageChange}
            options={stageOptions}
            placeholder="Select stages"
            filteringType="auto"
            tokenLimit={3}
          />
        </FormField>

        {/* Owner Filter */}
        <FormField
          label="Owner"
          description="Filter by opportunity owner"
        >
          <Multiselect
            selectedOptions={selectedOwners}
            onChange={handleOwnerChange}
            options={ownerOptions}
            placeholder="Select owners"
            filteringType="auto"
            tokenLimit={3}
          />
        </FormField>

        {/* Forecast Category Filter (Optional) */}
        {showForecastFilter && (
          <FormField
            label="Forecast Category"
            description="Filter by forecast category"
          >
            <Multiselect
              selectedOptions={selectedForecast}
              onChange={handleForecastChange}
              options={forecastOptions}
              placeholder="Select forecast categories"
              filteringType="auto"
              tokenLimit={3}
            />
          </FormField>
        )}
      </SpaceBetween>
    </Container>
  );
});

OpportunityFilters.displayName = 'OpportunityFilters';

export default OpportunityFilters;
