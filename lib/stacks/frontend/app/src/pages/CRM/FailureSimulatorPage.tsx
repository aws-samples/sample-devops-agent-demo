/**
 * Failure Simulator Page
 * 
 * Admin page for controlled injection of AWS infrastructure failures
 * to demonstrate observability, monitoring, and automated remediation capabilities.
 * 
 * Features:
 * - Toggle failure scenarios on/off
 * - View scenario details and AWS changes
 * - Real-time status updates
 * - One-at-a-time scenario enforcement
 * - 20-minute auto-disable timer with countdown display
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
// Individual imports to avoid Cloudscape circular dependency issues with barrel exports
import ContentLayout from '@cloudscape-design/components/content-layout';
import Header from '@cloudscape-design/components/header';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Container from '@cloudscape-design/components/container';
import Table from '@cloudscape-design/components/table';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import StatusIndicator from '@cloudscape-design/components/status-indicator';
import Badge from '@cloudscape-design/components/badge';
import Toggle from '@cloudscape-design/components/toggle';
import Modal from '@cloudscape-design/components/modal';
import Alert from '@cloudscape-design/components/alert';
import ColumnLayout from '@cloudscape-design/components/column-layout';
import Popover from '@cloudscape-design/components/popover';
import Spinner from '@cloudscape-design/components/spinner';
import Tabs from '@cloudscape-design/components/tabs';
import ProgressBar from '@cloudscape-design/components/progress-bar';
import { post, del, get } from 'aws-amplify/api';
import { EventsPanel } from './components/admin';

// ============================================================================
// Types
// ============================================================================

type FailureType =
  | 'sqsBacklogSpike'
  | 'lambdaFailedDeployment'
  | 'rdsIndexDrop';

type TriggerAction =
  | 'list'
  | 'get'
  | 'anyAction';

type Severity = 'light' | 'moderate' | 'severe';

interface FailureScenario {
  id: string;
  type: FailureType;
  name: string;
  description: string;
  simulationDetails: string;
  enabled: boolean;
  severity: Severity;
  category: 'System Changes' | 'Input Anomalies' | 'Dependency Issues';
  issueType: 'Database' | 'Configuration' | 'Lambda' | 'Queue';
  incident: string;
  triggerActions: TriggerAction[];
  triggerDescription: string;
  awsChange: string;
  metricsToMonitor: string[];
}

interface SystemStatus {
  [key: string]: {
    enabled: boolean;
    severity: Severity;
    enabledAt?: string;
    expiresAt?: string;
    remainingSeconds?: number;
  };
}

// Timer duration in seconds (20 minutes)
const TIMER_DURATION_SECONDS = 20 * 60;

// ============================================================================
// Failure Scenarios Data
// ============================================================================

const FAILURE_SCENARIOS: FailureScenario[] = [
  {
    id: 'sqs-backlog-spike',
    type: 'sqsBacklogSpike',
    name: 'SQS Message Backlog Spike',
    description: 'Floods SQS queue with messages causing a real backlog visible in CloudWatch metrics.',
    simulationDetails: 'Sends hundreds of messages to the notification queue, creating a real backlog visible in ApproximateNumberOfMessagesVisible metric.',
    enabled: false,
    severity: 'moderate',
    category: 'Dependency Issues',
    issueType: 'Queue',
    incident: 'Message Processing Delays',
    triggerActions: ['anyAction'],
    triggerDescription: 'Navigate to any page to see message processing delays logged',
    awsChange: 'sqs:SendMessage → Sends 150 messages to CRM notification queue creating visible backlog',
    metricsToMonitor: ['ApproximateNumberOfMessagesVisible', 'ApproximateAgeOfOldestMessage', 'NumberOfMessagesSent'],
  },
  {
    id: 'lambda-failed-deployment',
    type: 'lambdaFailedDeployment',
    name: 'Lambda Failed Deployment',
    description: 'Deploys code with missing module dependency causing Runtime.ImportModuleError.',
    simulationDetails: 'Deploys a code update referencing a missing ./config/pipeline-rules module. Every invocation fails with Runtime.ImportModuleError.',
    enabled: false,
    severity: 'moderate',
    category: 'System Changes',
    issueType: 'Lambda',
    incident: 'Failed Deployment',
    triggerActions: ['anyAction'],
    triggerDescription: 'Navigate to any page to trigger Lambda deployment errors',
    awsChange: 'lambda:UpdateFunctionCode → Deploys code update referencing missing ./config/pipeline-rules module, causing Runtime.ImportModuleError on every invocation',
    metricsToMonitor: ['Errors', 'Duration', 'Throttles'],
  },
  {
    id: 'rds-index-drop',
    type: 'rdsIndexDrop',
    name: 'RDS Index Drop',
    description: 'Drops PostgreSQL indexes causing slow queries with sequential scans.',
    simulationDetails: 'Database queries will be significantly slower due to missing indexes (full table scans).',
    enabled: false,
    severity: 'moderate',
    category: 'Dependency Issues',
    issueType: 'Database',
    incident: 'RDS Index Drop',
    triggerActions: ['list', 'get'],
    triggerDescription: 'Navigate to any page to experience slow database queries',
    awsChange: 'PostgreSQL DROP INDEX → Removes idx_opportunities_stage, idx_accounts_industry_id, and other indexes from CRM database tables',
    metricsToMonitor: ['CPUUtilization', 'ReadLatency', 'DatabaseConnections'],
  },
];

// ============================================================================
// Helper Components
// ============================================================================

const TriggerActionBadge: React.FC<{ action: TriggerAction }> = ({ action }) => {
  const actionLabels: Record<TriggerAction, string> = {
    list: 'List',
    get: 'Get',
    anyAction: 'Any Action',
  };

  return <Badge color="blue">{actionLabels[action]}</Badge>;
};

const CategoryBadge: React.FC<{ category: FailureScenario['category'] }> = ({ category }) => {
  const colors: Record<FailureScenario['category'], 'grey' | 'blue' | 'red'> = {
    'System Changes': 'grey',
    'Input Anomalies': 'blue',
    'Dependency Issues': 'red',
  };

  return <Badge color={colors[category]}>{category}</Badge>;
};

const IssueTypeBadge: React.FC<{ issueType: FailureScenario['issueType'] }> = ({ issueType }) => {
  return <Badge>{issueType}</Badge>;
};

// ============================================================================
// Countdown Timer Component
// ============================================================================

const CountdownTimer: React.FC<{
  expiresAt: string | undefined;
  scenarioName: string;
  onExpired: () => void;
}> = ({ expiresAt, scenarioName, onExpired }) => {
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!expiresAt) {
      setRemainingSeconds(0);
      return;
    }

    const calculateRemaining = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const remaining = Math.max(0, Math.floor((expiry - now) / 1000));
      return remaining;
    };

    setRemainingSeconds(calculateRemaining());

    intervalRef.current = setInterval(() => {
      const remaining = calculateRemaining();
      setRemainingSeconds(remaining);
      
      if (remaining <= 0) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        onExpired();
      }
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [expiresAt, onExpired]);

  if (remainingSeconds <= 0) return null;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const progress = (remainingSeconds / TIMER_DURATION_SECONDS) * 100;

  return (
    <Box padding={{ vertical: 's', horizontal: 'm' }}>
      <SpaceBetween size="xs">
        <Box variant="small" color="text-status-warning">
          <strong>{scenarioName}</strong> auto-disables in:
        </Box>
        <Box fontSize="heading-xl" fontWeight="bold" color="text-status-warning">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </Box>
        <ProgressBar
          value={progress}
          variant="standalone"
          additionalInfo={`${Math.ceil(remainingSeconds / 60)} min remaining`}
        />
      </SpaceBetween>
    </Box>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const FailureSimulatorPage: React.FC = () => {
  const [scenarios, setScenarios] = useState<FailureScenario[]>(FAILURE_SCENARIOS);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeExpiresAt, setActiveExpiresAt] = useState<string | undefined>(undefined);
  const [waitingForTimer, setWaitingForTimer] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    scenario: FailureScenario | null;
    action: 'enable' | 'disable';
  }>({ visible: false, scenario: null, action: 'enable' });

  // Fetch current system status on mount and set up polling
  useEffect(() => {
    fetchSystemStatus();
    
    // Poll every 30 seconds to sync timer across users
    const pollInterval = setInterval(fetchSystemStatus, 30000);
    return () => clearInterval(pollInterval);
  }, []);

  const fetchSystemStatus = async (): Promise<string | undefined> => {
    try {
      setLoading(true);
      const response = await get({
        apiName: 'restApi',
        path: '/admin/system-status',
      }).response;
      
      const data = await response.body.json() as { scenarios: SystemStatus };
      
      console.log('[FailureSimulator] System status response:', JSON.stringify(data, null, 2));
      
      if (data?.scenarios) {
        let foundExpiresAt: string | undefined;
        
        setScenarios((prev: FailureScenario[]) => prev.map((scenario: FailureScenario) => {
          const scenarioData = data.scenarios[scenario.type];
          console.log(`[FailureSimulator] Scenario ${scenario.type}:`, scenarioData);
          if (scenarioData?.enabled && scenarioData?.expiresAt) {
            foundExpiresAt = scenarioData.expiresAt;
            console.log(`[FailureSimulator] Found active scenario with expiresAt: ${foundExpiresAt}`);
          }
          return {
            ...scenario,
            enabled: scenarioData?.enabled ?? false,
            severity: scenarioData?.severity ?? 'moderate',
          };
        }));
        
        console.log(`[FailureSimulator] Setting activeExpiresAt to: ${foundExpiresAt}`);
        setActiveExpiresAt(foundExpiresAt);
        return foundExpiresAt;
      }
      return undefined;
    } catch (err) {
      // API might not exist yet - use local state
      console.log('[FailureSimulator] System status API error:', err);
      return undefined;
    } finally {
      setLoading(false);
    }
  };

  const handleTimerExpired = useCallback(() => {
    // Refresh status when timer expires
    fetchSystemStatus();
  }, []);

  const handleToggleScenario = useCallback((scenario: FailureScenario) => {
    const action = scenario.enabled ? 'disable' : 'enable';
    setConfirmModal({ visible: true, scenario, action });
  }, []);

  const executeToggle = async () => {
    const { scenario, action } = confirmModal;
    if (!scenario) return;

    setConfirmModal({ visible: false, scenario: null, action: 'enable' });
    setActionLoading(scenario.id);
    setError(null);

    try {
      if (action === 'enable') {
        // Disable any currently enabled scenario first
        const enabledScenario = scenarios.find((s: FailureScenario) => s.enabled && s.id !== scenario.id);
        if (enabledScenario) {
          await del({
            apiName: 'restApi',
            path: `/admin/failures/${enabledScenario.id}`,
          }).response;
        }

        // Enable the new scenario
        await post({
          apiName: 'restApi',
          path: `/admin/failures/${scenario.id}`,
          options: {
            body: { severity: scenario.severity },
          },
        }).response;

        setScenarios((prev: FailureScenario[]) => prev.map((s: FailureScenario) => ({
          ...s,
          enabled: s.id === scenario.id,
        })));
        
        // Show waiting state while polling for timer data
        setWaitingForTimer(true);
        
        // Poll until we get the expiresAt timestamp (with timeout)
        let attempts = 0;
        const maxAttempts = 10;
        let foundExpiresAt: string | undefined;
        
        while (attempts < maxAttempts && !foundExpiresAt) {
          foundExpiresAt = await fetchSystemStatus();
          if (foundExpiresAt) break;
          // Wait 1 second before next attempt
          await new Promise(resolve => setTimeout(resolve, 1000));
          attempts++;
        }
        
        setWaitingForTimer(false);
      } else {
        // Disable the scenario
        await del({
          apiName: 'restApi',
          path: `/admin/failures/${scenario.id}`,
        }).response;

        setScenarios((prev: FailureScenario[]) => prev.map((s: FailureScenario) => ({
          ...s,
          enabled: s.id === scenario.id ? false : s.enabled,
        })));
        
        // Clear the timer
        setActiveExpiresAt(undefined);
      }
    } catch (err) {
      // For demo purposes, toggle locally if API fails
      console.log('API call failed, toggling locally for demo');
      setWaitingForTimer(false);
      if (action === 'enable') {
        setScenarios((prev: FailureScenario[]) => prev.map((s: FailureScenario) => ({
          ...s,
          enabled: s.id === scenario.id,
        })));
      } else {
        setScenarios((prev: FailureScenario[]) => prev.map((s: FailureScenario) => ({
          ...s,
          enabled: s.id === scenario.id ? false : s.enabled,
        })));
        setActiveExpiresAt(undefined);
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleRollbackAll = async () => {
    setLoading(true);
    setError(null);

    try {
      // Disable all enabled scenarios
      const enabledScenarios = scenarios.filter((s: FailureScenario) => s.enabled);
      for (const scenario of enabledScenarios) {
        try {
          await del({
            apiName: 'restApi',
            path: `/admin/failures/${scenario.id}`,
          }).response;
        } catch {
          // Continue with local state update
        }
      }

      setScenarios((prev: FailureScenario[]) => prev.map((s: FailureScenario) => ({ ...s, enabled: false })));
    } catch (err) {
      setError('Failed to rollback all scenarios');
    } finally {
      setLoading(false);
    }
  };

  const activeScenario = scenarios.find((s: FailureScenario) => s.enabled);
  const hasActiveScenario = !!activeScenario;
  const [activeTab, setActiveTab] = useState('scenarios');

  return (
    <ContentLayout
      header={
        <Header
          variant="h1"
          description="Inject controlled AWS infrastructure failures to demonstrate observability and monitoring capabilities"
          actions={
            <SpaceBetween direction="horizontal" size="m" alignItems="center">
              {/* Countdown Timer or Waiting Indicator */}
              {waitingForTimer && (
                <Box padding={{ vertical: 'xs', horizontal: 'm' }}>
                  <SpaceBetween direction="horizontal" size="xs" alignItems="center">
                    <Spinner size="normal" />
                    <Box variant="small">Activating scenario...</Box>
                  </SpaceBetween>
                </Box>
              )}
              {hasActiveScenario && activeExpiresAt && !waitingForTimer && (
                <Box padding={{ vertical: 'xs', horizontal: 'm' }} display="inline-block">
                  <CountdownTimer
                    expiresAt={activeExpiresAt}
                    scenarioName={activeScenario.name}
                    onExpired={handleTimerExpired}
                  />
                </Box>
              )}
              <Button
                onClick={fetchSystemStatus}
                iconName="refresh"
                loading={loading}
              >
                Refresh Status
              </Button>
              <Button
                onClick={handleRollbackAll}
                disabled={!hasActiveScenario || loading}
                variant="normal"
              >
                Rollback All
              </Button>
            </SpaceBetween>
          }
        >
          Failure Simulator
        </Header>
      }
    >
      <SpaceBetween size="l">
        {/* Waiting for timer indicator */}
        {waitingForTimer && (
          <Alert type="info">
            <SpaceBetween direction="horizontal" size="s" alignItems="center">
              <Spinner size="normal" />
              <Box>Activating failure scenario... Please wait while the timer initializes.</Box>
            </SpaceBetween>
          </Alert>
        )}

        {/* Status Alert with Timer Info */}
        {hasActiveScenario && !waitingForTimer && (
          <Alert
            type="warning"
            header="Active Failure Scenario"
          >
            <SpaceBetween size="xs">
              <Box>
                <strong>{activeScenario.name}</strong> is currently active. {activeScenario.triggerDescription}
              </Box>
              {activeExpiresAt && (
                <Box variant="small" color="text-body-secondary">
                  This scenario will automatically disable after 20 minutes to prevent prolonged system impact.
                </Box>
              )}
            </SpaceBetween>
          </Alert>
        )}

        {error && (
          <Alert type="error" dismissible onDismiss={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Metrics Overview */}
        <Container header={<Header variant="h2">Scenario Overview</Header>}>
          <ColumnLayout columns={4} variant="text-grid">
            <div>
              <Box variant="awsui-key-label">Total Scenarios</Box>
              <Box variant="awsui-value-large">{scenarios.length}</Box>
            </div>
            <div>
              <Box variant="awsui-key-label">Active</Box>
              <Box variant="awsui-value-large">
                <StatusIndicator type={hasActiveScenario ? 'warning' : 'success'}>
                  {hasActiveScenario ? '1' : '0'}
                </StatusIndicator>
              </Box>
            </div>
            <div>
              <Box variant="awsui-key-label">Categories</Box>
              <Box variant="awsui-value-large">3</Box>
            </div>
            <div>
              <Box variant="awsui-key-label">Issue Types</Box>
              <Box variant="awsui-value-large">5</Box>
            </div>
          </ColumnLayout>
        </Container>

        {/* Tabs for Scenarios and Events */}
        <Tabs
          activeTabId={activeTab}
          onChange={({ detail }) => setActiveTab(detail.activeTabId)}
          tabs={[
            {
              id: 'scenarios',
              label: 'Failure Scenarios',
              content: (
                <SpaceBetween size="l">
                  {/* Scenarios Table */}
                  <Table
                    header={
                      <Header
                        variant="h2"
                        description="Toggle scenarios to inject real AWS infrastructure failures"
                        counter={`(${scenarios.length})`}
                      >
                        Failure Scenarios
                      </Header>
                    }
                    columnDefinitions={[
                      {
                        id: 'status',
                        header: 'Status',
                        width: 100,
                        cell: (item: FailureScenario) => (
                          actionLoading === item.id ? (
                            <Spinner size="normal" />
                          ) : (
                            <Toggle
                              checked={item.enabled}
                              onChange={() => handleToggleScenario(item)}
                              disabled={loading}
                            />
                          )
                        ),
                      },
                      {
                        id: 'name',
                        header: 'Scenario',
                        cell: (item: FailureScenario) => (
                          <SpaceBetween direction="horizontal" size="xs" alignItems="start">
                            <SpaceBetween direction="vertical" size="xxs">
                              <Box fontWeight="bold">{item.name}</Box>
                              <Box color="text-body-secondary" fontSize="body-s">
                                {item.description}
                              </Box>
                            </SpaceBetween>
                            <Popover
                              header={item.name}
                              size="large"
                              content={
                                <SpaceBetween size="m">
                                  <div>
                                    <Box variant="awsui-key-label">What happens when enabled</Box>
                                    <Box>{item.simulationDetails}</Box>
                                  </div>
                                  <div>
                                    <Box variant="awsui-key-label">AWS Resource Change</Box>
                                    <Box fontSize="body-s">{item.awsChange}</Box>
                                  </div>
                                  <div>
                                    <Box variant="awsui-key-label">How to trigger</Box>
                                    <Box>{item.triggerDescription}</Box>
                                  </div>
                                  <div>
                                    <Box variant="awsui-key-label">Metrics to monitor</Box>
                                    <Box>{item.metricsToMonitor.join(', ')}</Box>
                                  </div>
                                  <Alert type="info" statusIconAriaLabel="Info">
                                    Scenario auto-disables after 20 minutes to prevent prolonged impact.
                                  </Alert>
                                </SpaceBetween>
                              }
                              triggerType="custom"
                            >
                              <Button variant="inline-icon" iconName="status-info" ariaLabel={`More info about ${item.name}`} />
                            </Popover>
                          </SpaceBetween>
                        ),
                        width: 350,
                      },
                      {
                        id: 'category',
                        header: 'Category',
                        cell: (item: FailureScenario) => <CategoryBadge category={item.category} />,
                        width: 150,
                      },
                      {
                        id: 'issueType',
                        header: 'Issue Type',
                        cell: (item: FailureScenario) => <IssueTypeBadge issueType={item.issueType} />,
                        width: 120,
                      },
                      {
                        id: 'triggers',
                        header: 'Trigger Actions',
                        cell: (item: FailureScenario) => (
                          <SpaceBetween direction="horizontal" size="xxs">
                            {item.triggerActions.map((action: TriggerAction, idx: number) => (
                              <TriggerActionBadge key={idx} action={action} />
                            ))}
                          </SpaceBetween>
                        ),
                        width: 200,
                      },
                      {
                        id: 'awsChange',
                        header: 'AWS Change',
                        cell: (item: FailureScenario) => (
                          <Popover
                            header="AWS Resource Modification"
                            content={
                              <SpaceBetween size="s">
                                <div>
                                  <Box variant="awsui-key-label">API Call</Box>
                                  <Box>{item.awsChange}</Box>
                                </div>
                                <div>
                                  <Box variant="awsui-key-label">Metrics to Monitor</Box>
                                  <Box>{item.metricsToMonitor.join(', ')}</Box>
                                </div>
                              </SpaceBetween>
                            }
                            triggerType="custom"
                          >
                            <Button variant="inline-icon" iconName="status-info" />
                          </Popover>
                        ),
                        width: 100,
                      },
                    ]}
                    items={scenarios}
                    loading={loading}
                    loadingText="Loading scenarios..."
                    empty={
                      <Box textAlign="center" color="inherit">
                        <b>No scenarios configured</b>
                      </Box>
                    }
                    stripedRows
                    stickyHeader
                  />

                  {/* Instructions */}
                  <Container header={<Header variant="h2">How to Use</Header>}>
                    <SpaceBetween size="m">
                      <Box>
                        <ol>
                          <li><strong>Enable a scenario</strong> - Toggle on a failure scenario to inject the failure into AWS resources</li>
                          <li><strong>Trigger the failure</strong> - Perform the trigger action (e.g., create an opportunity) to see the failure in action</li>
                          <li><strong>Observe the impact</strong> - Check CloudWatch metrics, logs, and alarms to see the failure effects</li>
                          <li><strong>Disable the scenario</strong> - Toggle off to restore normal operation</li>
                        </ol>
                      </Box>
                      <Alert type="info">
                        Only one failure scenario can be active at a time to isolate root cause analysis.
                        Enabling a new scenario will automatically disable any currently active scenario.
                      </Alert>
                    </SpaceBetween>
                  </Container>
                </SpaceBetween>
              ),
            },
            {
              id: 'events',
              label: 'Failure Events',
              content: <EventsPanel maxEvents={100} autoRefresh={true} refreshInterval={15000} />,
            },
          ]}
        />
      </SpaceBetween>

      {/* Confirmation Modal */}
      <Modal
        visible={confirmModal.visible}
        onDismiss={() => setConfirmModal({ visible: false, scenario: null, action: 'enable' })}
        header={confirmModal.action === 'enable' ? 'Enable Failure Scenario' : 'Disable Failure Scenario'}
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button
                variant="link"
                onClick={() => setConfirmModal({ visible: false, scenario: null, action: 'enable' })}
              >
                Cancel
              </Button>
              <Button
                variant={confirmModal.action === 'enable' ? 'primary' : 'normal'}
                onClick={executeToggle}
              >
                {confirmModal.action === 'enable' ? 'Enable' : 'Disable'}
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        {confirmModal.scenario && (
          <SpaceBetween size="m">
            {confirmModal.action === 'enable' ? (
              <>
                <Alert type="warning">
                  This will make real changes to AWS resources. The following modification will be applied:
                </Alert>
                <Box>
                  <strong>Scenario:</strong> {confirmModal.scenario.name}
                </Box>
                <Box>
                  <strong>AWS Change:</strong> {confirmModal.scenario.awsChange}
                </Box>
                <Box>
                  <strong>Effect:</strong> {confirmModal.scenario.simulationDetails}
                </Box>
              </>
            ) : (
              <>
                <Box>
                  Are you sure you want to disable <strong>{confirmModal.scenario.name}</strong>?
                </Box>
                <Box>
                  This will restore the original AWS resource configuration.
                </Box>
              </>
            )}
          </SpaceBetween>
        )}
      </Modal>
    </ContentLayout>
  );
};

export default FailureSimulatorPage;
