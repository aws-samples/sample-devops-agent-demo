/**
 * ServiceNow ITSM Page
 * 
 * Displays mock ServiceNow incidents and change requests.
 * Placeholder for future ServiceNow API integration.
 * 
 * ServiceNow API Integration Notes:
 * - Instance URL: https://{instance}.service-now.com
 * - Authentication: Basic Auth or OAuth 2.0
 * - Endpoints: /api/now/table/incident (incidents)
 *              /api/now/table/change_request (changes)
 * - Docs: https://developer.servicenow.com/dev.do
 */

import React, { useState, useEffect } from 'react';
// Individual imports to avoid Cloudscape circular dependency issues with barrel exports
import ContentLayout from '@cloudscape-design/components/content-layout';
import Header from '@cloudscape-design/components/header';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Container from '@cloudscape-design/components/container';
import Box from '@cloudscape-design/components/box';
import ColumnLayout from '@cloudscape-design/components/column-layout';
import StatusIndicator from '@cloudscape-design/components/status-indicator';
import Table from '@cloudscape-design/components/table';
import Badge from '@cloudscape-design/components/badge';
import Button from '@cloudscape-design/components/button';
import Input from '@cloudscape-design/components/input';
import FormField from '@cloudscape-design/components/form-field';
import Alert from '@cloudscape-design/components/alert';
import Tabs from '@cloudscape-design/components/tabs';
import ProgressBar from '@cloudscape-design/components/progress-bar';

// ============================================================================
// Types
// ============================================================================

interface Incident {
  number: string;
  shortDescription: string;
  priority: 1 | 2 | 3 | 4 | 5;
  state: 'New' | 'In Progress' | 'On Hold' | 'Resolved' | 'Closed';
  assignedTo: string;
  category: string;
  createdAt: number;
  updatedAt: number;
}

interface ChangeRequest {
  number: string;
  shortDescription: string;
  type: 'Standard' | 'Normal' | 'Emergency';
  state: 'New' | 'Assess' | 'Authorize' | 'Scheduled' | 'Implement' | 'Review' | 'Closed';
  risk: 'High' | 'Moderate' | 'Low';
  assignedTo: string;
  plannedStart: number;
  plannedEnd: number;
}

interface ServiceNowConfig {
  instanceUrl: string;
  username: string;
  password: string;
}

// ============================================================================
// Mock Data Generator
// ============================================================================

const generateMockIncidents = (): Incident[] => [
  {
    number: 'INC0012345',
    shortDescription: 'CRM API returning 500 errors intermittently',
    priority: 1,
    state: 'In Progress',
    assignedTo: 'Sarah Chen',
    category: 'Application',
    createdAt: Date.now() - 1800000,
    updatedAt: Date.now() - 300000,
  },
  {
    number: 'INC0012346',
    shortDescription: 'SNS notification delivery failures',
    priority: 2,
    state: 'New',
    assignedTo: 'Marcus Johnson',
    category: 'Integration',
    createdAt: Date.now() - 900000,
    updatedAt: Date.now() - 900000,
  },
  {
    number: 'INC0012347',
    shortDescription: 'Database connection pool exhaustion',
    priority: 2,
    state: 'In Progress',
    assignedTo: 'Elena Rodriguez',
    category: 'Database',
    createdAt: Date.now() - 3600000,
    updatedAt: Date.now() - 600000,
  },
  {
    number: 'INC0012348',
    shortDescription: 'Slow response times on Pipeline page',
    priority: 3,
    state: 'On Hold',
    assignedTo: 'David Kim',
    category: 'Performance',
    createdAt: Date.now() - 7200000,
    updatedAt: Date.now() - 1800000,
  },
  {
    number: 'INC0012349',
    shortDescription: 'Authentication timeout for federated users',
    priority: 3,
    state: 'Resolved',
    assignedTo: 'Lisa Wang',
    category: 'Security',
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 43200000,
  },
];

const generateMockChangeRequests = (): ChangeRequest[] => [
  {
    number: 'CHG0005678',
    shortDescription: 'Deploy Lambda error handling improvements',
    type: 'Normal',
    state: 'Scheduled',
    risk: 'Low',
    assignedTo: 'Sarah Chen',
    plannedStart: Date.now() + 86400000,
    plannedEnd: Date.now() + 90000000,
  },
  {
    number: 'CHG0005679',
    shortDescription: 'Increase RDS connection pool size',
    type: 'Emergency',
    state: 'Implement',
    risk: 'Moderate',
    assignedTo: 'Elena Rodriguez',
    plannedStart: Date.now() - 1800000,
    plannedEnd: Date.now() + 1800000,
  },
  {
    number: 'CHG0005680',
    shortDescription: 'Update SNS retry configuration',
    type: 'Standard',
    state: 'Authorize',
    risk: 'Low',
    assignedTo: 'Marcus Johnson',
    plannedStart: Date.now() + 172800000,
    plannedEnd: Date.now() + 176400000,
  },
  {
    number: 'CHG0005681',
    shortDescription: 'Enable CloudWatch detailed monitoring',
    type: 'Normal',
    state: 'Review',
    risk: 'Low',
    assignedTo: 'David Kim',
    plannedStart: Date.now() - 86400000,
    plannedEnd: Date.now() - 82800000,
  },
];

// ============================================================================
// Helper Components
// ============================================================================

const PriorityBadge = ({ priority }: { priority: Incident['priority'] }) => {
  const config: Record<Incident['priority'], { color: 'red' | 'blue' | 'green' | 'grey'; label: string }> = {
    1: { color: 'red', label: 'P1 - Critical' },
    2: { color: 'red', label: 'P2 - High' },
    3: { color: 'blue', label: 'P3 - Moderate' },
    4: { color: 'green', label: 'P4 - Low' },
    5: { color: 'grey', label: 'P5 - Planning' },
  };
  return <Badge color={config[priority].color}>{config[priority].label}</Badge>;
};

const IncidentState = ({ state }: { state: Incident['state'] }) => {
  const types: Record<Incident['state'], 'success' | 'info' | 'warning' | 'error' | 'pending'> = {
    New: 'info',
    'In Progress': 'pending',
    'On Hold': 'warning',
    Resolved: 'success',
    Closed: 'success',
  };
  return <StatusIndicator type={types[state]}>{state}</StatusIndicator>;
};

const ChangeState = ({ state }: { state: ChangeRequest['state'] }) => {
  const types: Record<ChangeRequest['state'], 'success' | 'info' | 'warning' | 'pending'> = {
    New: 'info',
    Assess: 'info',
    Authorize: 'warning',
    Scheduled: 'pending',
    Implement: 'pending',
    Review: 'warning',
    Closed: 'success',
  };
  return <StatusIndicator type={types[state]}>{state}</StatusIndicator>;
};

const RiskBadge = ({ risk }: { risk: ChangeRequest['risk'] }) => {
  const colors: Record<ChangeRequest['risk'], 'red' | 'blue' | 'green'> = {
    High: 'red',
    Moderate: 'blue',
    Low: 'green',
  };
  return <Badge color={colors[risk]}>{risk}</Badge>;
};

// ============================================================================
// Main Component
// ============================================================================

export const ServiceNowPage: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('incidents');
  const [config, setConfig] = useState<ServiceNowConfig>({
    instanceUrl: '',
    username: '',
    password: '',
  });
  const [configSaved, setConfigSaved] = useState(false);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setLoading(true);
    setTimeout(() => {
      setIncidents(generateMockIncidents());
      setChangeRequests(generateMockChangeRequests());
      setLoading(false);
    }, 500);
  };

  const handleSaveConfig = () => {
    setConfigSaved(true);
    setTimeout(() => setConfigSaved(false), 3000);
  };

  const openIncidents = incidents.filter(i => !['Resolved', 'Closed'].includes(i.state)).length;
  const criticalIncidents = incidents.filter(i => i.priority <= 2 && !['Resolved', 'Closed'].includes(i.state)).length;
  const activeChanges = changeRequests.filter(c => !['Closed'].includes(c.state)).length;

  return (
    <ContentLayout
      header={
        <Header
          variant="h1"
          description="IT Service Management via ServiceNow integration"
          actions={
            <SpaceBetween direction="horizontal" size="s">
              <Button iconName="refresh" onClick={refreshData} loading={loading}>
                Refresh
              </Button>
              <Button href="https://www.servicenow.com" target="_blank" iconName="external" iconAlign="right">
                Open ServiceNow
              </Button>
            </SpaceBetween>
          }
        >
          ServiceNow ITSM
        </Header>
      }
    >
      <SpaceBetween size="l">
        {/* Status Overview */}
        <Container header={<Header variant="h2">Service Desk Overview</Header>}>
          <ColumnLayout columns={4} variant="text-grid">
            <div>
              <Box variant="awsui-key-label">Open Incidents</Box>
              <Box variant="awsui-value-large">
                <StatusIndicator type={openIncidents > 0 ? 'warning' : 'success'}>
                  {openIncidents}
                </StatusIndicator>
              </Box>
            </div>
            <div>
              <Box variant="awsui-key-label">Critical (P1/P2)</Box>
              <Box variant="awsui-value-large" color="text-status-error">{criticalIncidents}</Box>
            </div>
            <div>
              <Box variant="awsui-key-label">Active Changes</Box>
              <Box variant="awsui-value-large">{activeChanges}</Box>
            </div>
            <div>
              <Box variant="awsui-key-label">SLA Compliance</Box>
              <ProgressBar value={87} description="87% within SLA" />
            </div>
          </ColumnLayout>
        </Container>

        <Tabs
          activeTabId={activeTab}
          onChange={({ detail }) => setActiveTab(detail.activeTabId)}
          tabs={[
            {
              id: 'incidents',
              label: `Incidents (${incidents.length})`,
              content: (
                <Table
                  header={<Header variant="h2">Incident Management</Header>}
                  columnDefinitions={[
                    { id: 'number', header: 'Number', cell: (item: Incident) => <Box fontWeight="bold">{item.number}</Box>, width: 120 },
                    { id: 'priority', header: 'Priority', cell: (item: Incident) => <PriorityBadge priority={item.priority} />, width: 130 },
                    { id: 'state', header: 'State', cell: (item: Incident) => <IncidentState state={item.state} />, width: 120 },
                    { id: 'description', header: 'Short Description', cell: (item: Incident) => item.shortDescription },
                    { id: 'category', header: 'Category', cell: (item: Incident) => <Badge>{item.category}</Badge>, width: 120 },
                    { id: 'assignedTo', header: 'Assigned To', cell: (item: Incident) => item.assignedTo, width: 140 },
                    { id: 'updated', header: 'Updated', cell: (item: Incident) => new Date(item.updatedAt).toLocaleString(), width: 160 },
                  ]}
                  items={incidents}
                  loading={loading}
                  stripedRows
                  sortingColumn={{ sortingField: 'priority' }}
                />
              ),
            },
            {
              id: 'changes',
              label: `Change Requests (${changeRequests.length})`,
              content: (
                <Table
                  header={<Header variant="h2">Change Management</Header>}
                  columnDefinitions={[
                    { id: 'number', header: 'Number', cell: (item: ChangeRequest) => <Box fontWeight="bold">{item.number}</Box>, width: 120 },
                    { id: 'type', header: 'Type', cell: (item: ChangeRequest) => (
                      <Badge color={item.type === 'Emergency' ? 'red' : item.type === 'Normal' ? 'blue' : 'grey'}>
                        {item.type}
                      </Badge>
                    ), width: 110 },
                    { id: 'state', header: 'State', cell: (item: ChangeRequest) => <ChangeState state={item.state} />, width: 120 },
                    { id: 'description', header: 'Short Description', cell: (item: ChangeRequest) => item.shortDescription },
                    { id: 'risk', header: 'Risk', cell: (item: ChangeRequest) => <RiskBadge risk={item.risk} />, width: 100 },
                    { id: 'assignedTo', header: 'Assigned To', cell: (item: ChangeRequest) => item.assignedTo, width: 140 },
                    { id: 'planned', header: 'Planned Start', cell: (item: ChangeRequest) => new Date(item.plannedStart).toLocaleString(), width: 160 },
                  ]}
                  items={changeRequests}
                  loading={loading}
                  stripedRows
                />
              ),
            },
            {
              id: 'config',
              label: 'Configuration',
              content: (
                <Container header={<Header variant="h2">ServiceNow Configuration</Header>}>
                  <SpaceBetween size="l">
                    <Alert type="info">
                      Configure your ServiceNow instance credentials to enable live data fetching.
                      You'll need admin access to your ServiceNow instance to generate API credentials.
                    </Alert>
                    
                    {configSaved && <Alert type="success" dismissible>Configuration saved successfully!</Alert>}
                    
                    <FormField label="Instance URL" description="Your ServiceNow instance URL (e.g., https://company.service-now.com)">
                      <Input
                        value={config.instanceUrl}
                        onChange={({ detail }) => setConfig({ ...config, instanceUrl: detail.value })}
                        placeholder="https://your-instance.service-now.com"
                      />
                    </FormField>
                    
                    <ColumnLayout columns={2}>
                      <FormField label="Username" description="ServiceNow API username">
                        <Input
                          value={config.username}
                          onChange={({ detail }) => setConfig({ ...config, username: detail.value })}
                          placeholder="Enter username"
                        />
                      </FormField>
                      <FormField label="Password" description="ServiceNow API password">
                        <Input
                          type="password"
                          value={config.password}
                          onChange={({ detail }) => setConfig({ ...config, password: detail.value })}
                          placeholder="Enter password"
                        />
                      </FormField>
                    </ColumnLayout>
                    
                    <Button variant="primary" onClick={handleSaveConfig}>
                      Save Configuration
                    </Button>
                  </SpaceBetween>
                </Container>
              ),
            },
          ]}
        />
      </SpaceBetween>
    </ContentLayout>
  );
};

export default ServiceNowPage;
