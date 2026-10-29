# Team Performance Components

This directory contains components for displaying team performance metrics and individual sales rep performance.

## Components

### TeamMetrics
Displays team-wide performance metrics in a grid layout.

**Props:**
- `totalPipeline`: Total pipeline value across all team members
- `totalWon`: Total closed won value
- `winRate`: Team win rate percentage
- `totalOpportunities`: Total number of opportunities
- `averageDealSize`: Average deal size
- `pipelineVelocity`: Pipeline velocity in days

**Example:**
```tsx
<TeamMetrics
  totalPipeline={25000000}
  totalWon={18000000}
  winRate={68.5}
  totalOpportunities={150}
  averageDealSize={166667}
  pipelineVelocity={45}
/>
```

### RepPerformanceCard
Displays individual sales rep performance metrics in a card format.

**Props:**
- `member`: TeamMember object with performance data

**Example:**
```tsx
<RepPerformanceCard
  member={{
    id: 'tm-001',
    name: 'Sarah Chen',
    email: 'sarah.chen@anycompany.com',
    role: 'Account Executive',
    quota: 2000000,
    pipelineValue: 2450000,
    closedWonValue: 1850000,
    quotaAttainment: 92.5,
    winRate: 68,
    opportunityCount: 15,
    avatarUrl: '/avatars/sarah-chen.jpg',
  }}
/>
```

### PerformanceChart
Displays performance visualizations using SVG charts.

**Props:**
- `data`: Array of ChartDataPoint objects
- `type`: Chart type ('line' | 'bar' | 'pie')
- `title`: Chart title
- `description`: Optional chart description
- `xAxisLabel`: Optional X-axis label
- `yAxisLabel`: Optional Y-axis label (not currently used)

**Example - Line Chart:**
```tsx
<PerformanceChart
  type="line"
  title="Pipeline Trend"
  description="Pipeline value over the last 6 months"
  xAxisLabel="Month"
  data={[
    { x: 'Jan', y: 2000000, label: 'Jan' },
    { x: 'Feb', y: 2200000, label: 'Feb' },
    { x: 'Mar', y: 2400000, label: 'Mar' },
    { x: 'Apr', y: 2300000, label: 'Apr' },
    { x: 'May', y: 2500000, label: 'May' },
    { x: 'Jun', y: 2650000, label: 'Jun' },
  ]}
/>
```

**Example - Bar Chart:**
```tsx
<PerformanceChart
  type="bar"
  title="Win Rate by Rep"
  description="Individual rep win rates"
  xAxisLabel="Sales Rep"
  data={[
    { x: 'Sarah', y: 68, label: 'Sarah' },
    { x: 'Marcus', y: 72, label: 'Marcus' },
    { x: 'Jennifer', y: 65, label: 'Jennifer' },
    { x: 'David', y: 58, label: 'David' },
  ]}
/>
```

## Usage in Team Performance Page

These components are designed to be used together in the Team Performance page:

```tsx
import { TeamMetrics, RepPerformanceCard, PerformanceChart } from './components/team';
import { mockTeamMembers } from './data/mockTeamData';
import { mockOpportunities } from './data/mockOpportunities';

function TeamPerformancePage() {
  // Calculate team metrics
  const teamMetrics = calculateTeamMetrics(mockOpportunities, mockTeamMembers);
  
  return (
    <SpaceBetween size="l">
      {/* Team-wide metrics */}
      <TeamMetrics {...teamMetrics} />
      
      {/* Performance charts */}
      <ColumnLayout columns={2}>
        <PerformanceChart
          type="line"
          title="Pipeline Trend"
          data={pipelineTrendData}
        />
        <PerformanceChart
          type="bar"
          title="Win Rate by Rep"
          data={winRateData}
        />
      </ColumnLayout>
      
      {/* Individual rep cards */}
      <ColumnLayout columns={3}>
        {mockTeamMembers.map(member => (
          <RepPerformanceCard key={member.id} member={member} />
        ))}
      </ColumnLayout>
    </SpaceBetween>
  );
}
```

## Design Notes

- **TeamMetrics**: Uses a 3-column grid layout that's responsive
- **RepPerformanceCard**: Includes quota attainment progress bar with color-coded status
- **PerformanceChart**: Simple SVG-based charts with responsive design
- All components use Cloudscape Design System for consistency
- Color coding follows CRM standards (green = good, yellow = warning, red = needs attention)

## Requirements Covered

These components satisfy the following requirements:
- **5.1**: Display team-wide pipeline metrics
- **5.2**: Show total pipeline value, won deals, and win rate
- **5.3**: Show individual rep metrics (pipeline, closed deals, quota attainment)
- **5.4**: Calculate and display team metrics
- **5.5**: Show pipeline growth and velocity metrics
