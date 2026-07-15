/**
 * Lazy-loaded PieChart wrapper to avoid Cloudscape circular dependency issues.
 * The PieChart component has internal circular dependencies that cause
 * "can't access lexical declaration before initialization" errors when bundled with Vite.
 * This wrapper defers the import until render time.
 */

import React, { useState, useEffect, ComponentProps } from 'react';
// Individual imports to avoid Cloudscape circular dependency issues with barrel exports
import Box from '@cloudscape-design/components/box';
import Spinner from '@cloudscape-design/components/spinner';

type PieChartProps = ComponentProps<typeof import('@cloudscape-design/components').PieChart>;

// Dynamically imported PieChart component
let PieChartComponent: React.ComponentType<PieChartProps> | null = null;
let loadPromise: Promise<void> | null = null;

const loadPieChart = async () => {
  if (PieChartComponent) return;
  if (loadPromise) {
    await loadPromise;
    return;
  }
  
  loadPromise = (async () => {
    try {
      // Dynamic import with a small delay to ensure proper initialization order
      await new Promise(resolve => setTimeout(resolve, 0));
      const module = await import('@cloudscape-design/components/pie-chart');
      PieChartComponent = module.default;
    } catch (err) {
      console.error('Failed to load PieChart:', err);
      throw err;
    }
  })();
  
  await loadPromise;
};

export const LazyPieChart: React.FC<PieChartProps> = (props) => {
  const [loaded, setLoaded] = useState(!!PieChartComponent);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (PieChartComponent) {
      setLoaded(true);
      return;
    }

    let mounted = true;
    
    loadPieChart()
      .then(() => {
        if (mounted) setLoaded(true);
      })
      .catch((err) => {
        if (mounted) setError(err);
      });

    return () => { mounted = false; };
  }, []);

  if (error) {
    return (
      <Box textAlign="center" padding="l" color="text-status-error">
        Failed to load chart component
      </Box>
    );
  }

  if (!loaded || !PieChartComponent) {
    return (
      <Box textAlign="center" padding="l">
        <Spinner size="large" />
      </Box>
    );
  }

  return <PieChartComponent {...props} />;
};

export default LazyPieChart;
