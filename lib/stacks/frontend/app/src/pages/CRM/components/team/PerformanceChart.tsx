/**
 * PerformanceChart Component
 * 
 * Displays performance visualizations using Cloudscape Charts including
 * line charts for pipeline trends and bar charts for win rate by rep.
 */

// Individual imports to avoid Cloudscape circular dependency issues with barrel exports
import Box from '@cloudscape-design/components/box';
import Container from '@cloudscape-design/components/container';
import Header from '@cloudscape-design/components/header';
import { ChartDataPoint } from '../../types';

export interface PerformanceChartProps {
  /** Chart data points */
  data: ChartDataPoint[];
  
  /** Chart type */
  type: 'line' | 'bar' | 'pie';
  
  /** Chart title */
  title: string;
  
  /** Optional chart description */
  description?: string;
  
  /** X-axis label */
  xAxisLabel?: string;
  
  /** Y-axis label */
  yAxisLabel?: string;
}

/**
 * PerformanceChart renders various chart types for performance visualization
 * 
 * Note: This is a simplified implementation. In production, you would use
 * a charting library like Recharts, Chart.js, or D3.js with Cloudscape styling.
 */
export function PerformanceChart({
  data,
  type,
  title,
  description,
  xAxisLabel,
}: PerformanceChartProps) {
  // Calculate chart dimensions
  const maxValue = Math.max(...data.map((d) => d.y));
  const chartHeight = 300;
  const chartWidth = 600;
  const padding = 40;

  // Render line chart
  const renderLineChart = () => {
    if (data.length === 0) return null;

    const points = data.map((point, index) => {
      const x = padding + (index / (data.length - 1)) * (chartWidth - 2 * padding);
      const y = chartHeight - padding - ((point.y / maxValue) * (chartHeight - 2 * padding));
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width={chartWidth} height={chartHeight} style={{ width: '100%', height: 'auto' }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = chartHeight - padding - (ratio * (chartHeight - 2 * padding));
          return (
            <g key={ratio}>
              <line
                x1={padding}
                y1={y}
                x2={chartWidth - padding}
                y2={y}
                stroke="#e9ebed"
                strokeWidth="1"
              />
              <text
                x={padding - 10}
                y={y + 5}
                textAnchor="end"
                fontSize="12"
                fill="#5f6b7a"
              >
                {(maxValue * ratio).toFixed(0)}
              </text>
            </g>
          );
        })}

        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke="#0972d3"
          strokeWidth="2"
        />

        {/* Data points */}
        {data.map((point, index) => {
          const x = padding + (index / (data.length - 1)) * (chartWidth - 2 * padding);
          const y = chartHeight - padding - ((point.y / maxValue) * (chartHeight - 2 * padding));
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="4"
              fill="#0972d3"
            />
          );
        })}

        {/* X-axis labels */}
        {data.map((point, index) => {
          const x = padding + (index / (data.length - 1)) * (chartWidth - 2 * padding);
          return (
            <text
              key={index}
              x={x}
              y={chartHeight - padding + 20}
              textAnchor="middle"
              fontSize="12"
              fill="#5f6b7a"
            >
              {point.label || point.x.toString()}
            </text>
          );
        })}
      </svg>
    );
  };

  // Render bar chart
  const renderBarChart = () => {
    if (data.length === 0) return null;

    const barWidth = (chartWidth - 2 * padding) / data.length * 0.8;
    const barSpacing = (chartWidth - 2 * padding) / data.length;

    return (
      <svg width={chartWidth} height={chartHeight} style={{ width: '100%', height: 'auto' }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = chartHeight - padding - (ratio * (chartHeight - 2 * padding));
          return (
            <g key={ratio}>
              <line
                x1={padding}
                y1={y}
                x2={chartWidth - padding}
                y2={y}
                stroke="#e9ebed"
                strokeWidth="1"
              />
              <text
                x={padding - 10}
                y={y + 5}
                textAnchor="end"
                fontSize="12"
                fill="#5f6b7a"
              >
                {(maxValue * ratio).toFixed(0)}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((point, index) => {
          const x = padding + index * barSpacing + (barSpacing - barWidth) / 2;
          const barHeight = (point.y / maxValue) * (chartHeight - 2 * padding);
          const y = chartHeight - padding - barHeight;
          
          // Color based on value
          const getBarColor = (value: number) => {
            if (value >= 70) return '#037f0c'; // Green
            if (value >= 50) return '#0972d3'; // Blue
            return '#f89406'; // Orange
          };

          return (
            <g key={index}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={getBarColor(point.y)}
                rx="2"
              />
              <text
                x={x + barWidth / 2}
                y={chartHeight - padding + 20}
                textAnchor="middle"
                fontSize="11"
                fill="#5f6b7a"
              >
                {point.label || point.x.toString()}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  // Render appropriate chart type
  const renderChart = () => {
    switch (type) {
      case 'line':
        return renderLineChart();
      case 'bar':
        return renderBarChart();
      case 'pie':
        return (
          <Box textAlign="center" padding="xxl" color="text-body-secondary">
            Pie chart visualization (not implemented in this demo)
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Container
      header={
        <Header variant="h2" description={description}>
          {title}
        </Header>
      }
    >
      <Box padding={{ vertical: 'm' }}>
        {data.length === 0 ? (
          <Box textAlign="center" padding="xxl" color="text-body-secondary">
            No data available for visualization
          </Box>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            {renderChart()}
            {xAxisLabel && (
              <Box textAlign="center" margin={{ top: 's' }} color="text-label" fontSize="body-s">
                {xAxisLabel}
              </Box>
            )}
          </div>
        )}
      </Box>
    </Container>
  );
}
