/**
 * Events Panel Component
 * 
 * Displays real-time failure events from CloudWatch Logs and AppSync subscriptions.
 * Shows event timeline with scenario type, error details, and timestamps.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
// Individual imports to avoid Cloudscape circular dependency issues with barrel exports
import Container from '@cloudscape-design/components/container';
import Header from '@cloudscape-design/components/header';
import Table from '@cloudscape-design/components/table';
import Box from '@cloudscape-design/components/box';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Badge from '@cloudscape-design/components/badge';
import Button from '@cloudscape-design/components/button';
import Select from '@cloudscape-design/components/select';
import StatusIndicator from '@cloudscape-design/components/status-indicator';
import Pagination from '@cloudscape-design/components/pagination';
import TextFilter from '@cloudscape-design/components/text-filter';
import Toggle from '@cloudscape-design/components/toggle';
import { get } from 'aws-amplify/api';
import { FailureEvent, FailureEventsResponse } from './types';
import { useFailureEventsSubscription } from './useFailureEventsSubscription';

// Scenario type display labels and colors
const SCENARIO_LABELS: Record<string, { label: string; color: 'blue' | 'green' | 'red' | 'grey' }> = {
  ddbThrottling: { label: 'DynamoDB Throttling', color: 'blue' },
  snsSubscriptionErrors: { label: 'SNS Subscription Errors', color: 'green' },
  lambdaFailedDeployment: { label: 'Lambda Failed Deployment', color: 'red' },
  apiGatewayThrottling: { label: 'API Gateway Throttling', color: 'red' },
  rdsIndexDrop: { label: 'RDS Index Drop', color: 'blue' },
};

// Time range options
const TIME_RANGE_OPTIONS = [
  { label: 'Last 15 minutes', value: '15' },
  { label: 'Last 30 minutes', value: '30' },
  { label: 'Last 1 hour', value: '60' },
  { label: 'Last 6 hours', value: '360' },
  { label: 'Last 24 hours', value: '1440' },
];

const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  return date.toLocaleString();
};

const ScenarioBadge: React.FC<{ scenarioType: string }> = ({ scenarioType }) => {
  const config = SCENARIO_LABELS[scenarioType] || { label: scenarioType, color: 'grey' as const };
  return <Badge color={config.color}>{config.label}</Badge>;
};

interface EventsPanelProps {
  maxEvents?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const EventsPanel: React.FC<EventsPanelProps> = ({
  maxEvents = 50,
  autoRefresh = true,
  refreshInterval = 30000,
}) => {
  const [historicalEvents, setHistoricalEvents] = useState<FailureEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<string>('60');
  const [filterText, setFilterText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [useStreaming, setUseStreaming] = useState(true);

  const pageSize = 10;

  // Real-time subscription
  const {
    events: realtimeEvents,
    isConnected,
    error: subscriptionError,
  } = useFailureEventsSubscription(maxEvents);

  // Combine real-time and historical events, deduplicating by ID
  const events = useMemo(() => {
    if (useStreaming && isConnected) {
      const realtimeIds = new Set(realtimeEvents.map((e) => e.id));
      const uniqueHistorical = historicalEvents.filter((h) => !realtimeIds.has(h.id));
      return [...realtimeEvents, ...uniqueHistorical].slice(0, maxEvents);
    }
    return historicalEvents;
  }, [useStreaming, isConnected, realtimeEvents, historicalEvents, maxEvents]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const now = Date.now();
      const startTime = now - parseInt(timeRange) * 60 * 1000;

      const response = await get({
        apiName: 'restApi',
        path: '/admin/failure-events',
        options: {
          queryParams: {
            startTime: startTime.toString(),
            endTime: now.toString(),
            limit: maxEvents.toString(),
          },
        },
      }).response;

      const data = (await response.body.json()) as unknown as FailureEventsResponse;

      if (data.success) {
        setHistoricalEvents(data.events || []);
        setLastRefresh(new Date());
      } else {
        setError(data.error || 'Failed to fetch events');
      }
    } catch (err) {
      console.error('Failed to fetch failure events:', err);
      setError('Failed to fetch events from API');
    } finally {
      setLoading(false);
    }
  }, [timeRange, maxEvents]);

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchEvents();

    if (autoRefresh) {
      const interval = setInterval(fetchEvents, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchEvents, autoRefresh, refreshInterval]);

  // Filter events
  const filteredEvents = events.filter((event) => {
    if (!filterText) return true;
    const searchLower = filterText.toLowerCase();
    return (
      event.scenarioType.toLowerCase().includes(searchLower) ||
      event.errorType.toLowerCase().includes(searchLower) ||
      event.errorMessage.toLowerCase().includes(searchLower) ||
      (event.service?.toLowerCase().includes(searchLower) ?? false)
    );
  });

  // Paginate
  const totalPages = Math.ceil(filteredEvents.length / pageSize);
  const paginatedEvents = filteredEvents.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Stats
  const uniqueScenarios = new Set(events.map((e) => e.scenarioType)).size;
  const latestEvent = events[0];
  const timeSinceLatest = latestEvent
    ? formatTimestamp(latestEvent.timestamp)
    : 'No events';

  return (
    <Container
      header={
        <Header
          variant="h2"
          description="Real-time failure events from CloudWatch Logs and AppSync"
          counter={`(${events.length})`}
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Toggle
                checked={useStreaming}
                onChange={({ detail }) => setUseStreaming(detail.checked)}
              >
                <SpaceBetween direction="horizontal" size="xxs">
                  <span>Streaming</span>
                  <StatusIndicator type={isConnected && useStreaming ? 'success' : 'stopped'}>
                    {isConnected && useStreaming ? 'Connected' : 'Off'}
                  </StatusIndicator>
                </SpaceBetween>
              </Toggle>
              <Select
                selectedOption={
                  TIME_RANGE_OPTIONS.find((o) => o.value === timeRange) || null
                }
                onChange={({ detail }) =>
                  setTimeRange(detail.selectedOption.value || '60')
                }
                options={TIME_RANGE_OPTIONS}
              />
              <Button
                iconName="refresh"
                onClick={fetchEvents}
                loading={loading}
              >
                Refresh
              </Button>
            </SpaceBetween>
          }
        >
          Failure Events
        </Header>
      }
    >
      <SpaceBetween size="m">
        {/* Stats Row */}
        <Box>
          <SpaceBetween direction="horizontal" size="l">
            <Box>
              <Box variant="awsui-key-label">Total Events</Box>
              <Box variant="awsui-value-large">{events.length}</Box>
            </Box>
            <Box>
              <Box variant="awsui-key-label">Unique Scenarios</Box>
              <Box variant="awsui-value-large">{uniqueScenarios}</Box>
            </Box>
            <Box>
              <Box variant="awsui-key-label">Latest Event</Box>
              <Box variant="awsui-value-large">{timeSinceLatest}</Box>
            </Box>
            <Box>
              <Box variant="awsui-key-label">Last Refresh</Box>
              <Box>
                {lastRefresh ? (
                  <StatusIndicator type="success">
                    {lastRefresh.toLocaleTimeString()}
                  </StatusIndicator>
                ) : (
                  <StatusIndicator type="pending">Never</StatusIndicator>
                )}
              </Box>
            </Box>
          </SpaceBetween>
        </Box>

        {/* Filter */}
        <TextFilter
          filteringText={filterText}
          filteringPlaceholder="Filter events..."
          onChange={({ detail }) => {
            setFilterText(detail.filteringText);
            setCurrentPage(1);
          }}
        />

        {/* Events Table */}
        <Table
          columnDefinitions={[
            {
              id: 'timestamp',
              header: 'Time',
              width: 100,
              cell: (item) => (
                <Box color="text-body-secondary">
                  {formatTimestamp(item.timestamp)}
                </Box>
              ),
            },
            {
              id: 'scenarioType',
              header: 'Scenario',
              width: 200,
              cell: (item) => <ScenarioBadge scenarioType={item.scenarioType} />,
            },
            {
              id: 'errorType',
              header: 'Error Type',
              width: 180,
              cell: (item) => (
                <Box fontWeight="bold" color="text-status-error">
                  {item.errorType}
                </Box>
              ),
            },
            {
              id: 'errorMessage',
              header: 'Message',
              cell: (item) => (
                <Box color="text-body-secondary">{item.errorMessage}</Box>
              ),
            },
            {
              id: 'service',
              header: 'Service',
              width: 120,
              cell: (item) => item.service || '-',
            },
          ]}
          items={paginatedEvents}
          loading={loading}
          loadingText="Loading events..."
          empty={
            <Box textAlign="center" color="inherit" padding="l">
              <SpaceBetween size="m">
                <Box variant="strong">No failure events</Box>
                <Box color="text-body-secondary">
                  Enable a failure scenario to generate events
                </Box>
              </SpaceBetween>
            </Box>
          }
          stripedRows
          stickyHeader
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination
            currentPageIndex={currentPage}
            pagesCount={totalPages}
            onChange={({ detail }) => setCurrentPage(detail.currentPageIndex)}
          />
        )}

        {/* Error display */}
        {(error || subscriptionError) && (
          <Box color="text-status-error" textAlign="center">
            {error || subscriptionError}
          </Box>
        )}
      </SpaceBetween>
    </Container>
  );
};

export default EventsPanel;
