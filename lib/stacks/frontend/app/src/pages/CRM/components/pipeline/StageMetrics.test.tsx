/**
 * StageMetrics Component Manual Test
 * 
 * This file demonstrates how to use the StageMetrics component
 * and can be used for manual verification.
 */

import React from 'react';
import { StageMetrics } from './StageMetrics';
import { PipelineMetrics } from '../../types';
import { mockOpportunities } from '../../data/mockOpportunities';
import { calculatePipelineMetrics } from '../../utils/calculations';

/**
 * Example usage of StageMetrics component
 */
export const StageMetricsExample: React.FC = () => {
  // Calculate metrics from mock opportunities
  const metrics: PipelineMetrics = calculatePipelineMetrics(mockOpportunities);

  return (
    <div style={{ padding: '20px' }}>
      <h1>Pipeline Stage Metrics</h1>
      <StageMetrics metrics={metrics} />
    </div>
  );
};

/**
 * Example with custom metrics
 */
export const StageMetricsCustomExample: React.FC = () => {
  const customMetrics: PipelineMetrics = {
    openPipeline: 5000000,
    newOpportunities: 750000,
    wonOpportunities: 1200000,
    increasedValue: 250000,
    movedIn: 300000,
    movedOut: 150000,
    decreasedValue: 100000,
    lostOpportunities: 400000,
    overdueOpportunities: 200000,
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Custom Pipeline Metrics</h1>
      <StageMetrics metrics={customMetrics} />
    </div>
  );
};

export default StageMetricsExample;
