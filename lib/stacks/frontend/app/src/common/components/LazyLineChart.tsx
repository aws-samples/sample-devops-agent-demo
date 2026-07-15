/**
 * Lazy-loaded LineChart wrapper to avoid Cloudscape circular dependency issues.
 * The LineChart component has internal circular dependencies that cause
 * "can't access lexical declaration before initialization" errors when bundled with Vite.
 * This wrapper defers the import until render time.
 */

import React, { useState, useEffect, ComponentProps } from 'react';
// Individual imports to avoid Cloudscape circular dependency issues with barrel exports
import Box from '@cloudscape-design/components/box';
import Spinner from '@cloudscape-design/components/spinner';

type LineChartProps = ComponentProps<typeof import('@cloudscape-design/components').LineChart>;

// Dynamically imported LineChart component
let LineChartComponent: React.ComponentType<LineChartProps> | null = null;
let loadPromise: Promise<void> | null = null;

const loadLineChart = async () => {
  if (LineChartComponent) return;
  if (loadPromise) {
    await loadPromise;
    return;
  }
  
  loadPromise = (async () => {
    try {
      // Dynamic import with a small delay to ensure proper initialization order
      await new Promise(resolve => setTimeout(resolve, 0));
      const module = await import('@cloudscape-design/components/line-chart');
      LineChartComponent = module.default;
    } catch (err) {
      console.error('Failed to load LineChart:', err);
      throw err;
    }
  })();
  
  await loadPromise;
};

export const LazyLineChart: React.FC<LineChartProps> = (props) => {
  const [loaded, setLoaded] = useState(!!LineChartComponent);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (LineChartComponent) {
      setLoaded(true);
      return;
    }

    let mounted = true;
    
    loadLineChart()
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

  if (!loaded || !LineChartComponent) {
    return (
      <Box textAlign="center" padding="l">
        <Spinner size="large" />
      </Box>
    );
  }

  return <LineChartComponent {...props} />;
};

export default LazyLineChart;
