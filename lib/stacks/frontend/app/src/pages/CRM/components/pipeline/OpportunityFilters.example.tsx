/**
 * OpportunityFilters Usage Example
 * 
 * This file demonstrates how to use the OpportunityFilters component
 * in a parent component like PipelinePage.
 */

import React, { useState } from 'react';
import { OpportunityFilters } from './OpportunityFilters';
import { OpportunityStage, ForecastCategory } from '../../types';

export const OpportunityFiltersExample: React.FC = () => {
  // Initialize filter state
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

  // Handle filter changes
  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
    console.log('Filters changed:', newFilters);
    
    // Here you would typically:
    // 1. Apply filters to your opportunities data
    // 2. Update the filtered opportunities state
    // 3. Pass filtered data to OpportunityTable
  };

  return (
    <div>
      <OpportunityFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        showForecastFilter={true}
      />
      
      {/* Display active filters summary */}
      <div style={{ marginTop: '20px', padding: '10px', background: '#f0f0f0' }}>
        <h3>Active Filters:</h3>
        <pre>{JSON.stringify(filters, null, 2)}</pre>
      </div>
    </div>
  );
};

export default OpportunityFiltersExample;
