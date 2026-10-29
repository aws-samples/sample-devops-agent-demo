/**
 * Accounts Page
 * 
 * Account management and health tracking page.
 * 
 * Features:
 * - Table view of all accounts
 * - Industry filter
 * - Search by account name
 * - Account health indicators
 * - Click-through to view related opportunities
 * - Responsive layout
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
// Individual imports to avoid Cloudscape circular dependency issues with barrel exports
import ContentLayout from '@cloudscape-design/components/content-layout';
import Header from '@cloudscape-design/components/header';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Container from '@cloudscape-design/components/container';
import Grid from '@cloudscape-design/components/grid';
import Select from '@cloudscape-design/components/select';
import Input from '@cloudscape-design/components/input';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import Modal from '@cloudscape-design/components/modal';
import { AccountTable } from './components/accounts';
import { OpportunityTable } from './components/pipeline/OpportunityTable';
import { EmptyState } from './components/shared';
import { mockAccounts } from './data/mockAccounts';
import { mockOpportunities } from './data/mockOpportunities';
import { Account, Industry } from './types';
import { LoadingSpinner, ErrorAlert } from '../../common/components';
import { useDebounce } from './hooks/useDebounce';

/**
 * AccountsPage Component
 * 
 * Main page for viewing and managing customer accounts.
 */
export const AccountsPage: React.FC = () => {
  // Loading and error state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [selectedIndustry, setSelectedIndustry] = useState<Industry | ''>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Simulate data loading
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        await new Promise(resolve => setTimeout(resolve, 400));
        setLoading(false);
      } catch (err) {
        setError('Failed to load accounts. Please try again.');
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Sorting state for table view
  const [sortingColumn, setSortingColumn] = useState<string>('name');
  const [sortingDescending, setSortingDescending] = useState(false);

  // Modal state for viewing account details
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Industry filter options
  // Memoized to prevent recreation on every render
  const industryOptions = useMemo(() => [
    { label: 'All Industries', value: '' },
    { label: 'Technology', value: Industry.Technology },
    { label: 'Healthcare', value: Industry.Healthcare },
    { label: 'Finance', value: Industry.Finance },
    { label: 'Retail', value: Industry.Retail },
    { label: 'Manufacturing', value: Industry.Manufacturing },
  ], []);

  // Debounce search query to reduce filtering frequency (300ms delay)
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Filter accounts by industry and search query
  // Memoized to prevent recalculation on every render
  const filteredAccounts = useMemo(() => {
    console.time('filterAccounts');
    let filtered = [...mockAccounts];

    // Filter by industry
    if (selectedIndustry) {
      filtered = filtered.filter(account => account.industry === selectedIndustry);
    }

    // Filter by search query (account name or domain)
    if (debouncedSearchQuery.trim()) {
      const normalizedQuery = debouncedSearchQuery.toLowerCase().trim();
      filtered = filtered.filter(account =>
        account.name.toLowerCase().includes(normalizedQuery) ||
        account.domain.toLowerCase().includes(normalizedQuery)
      );
    }

    console.timeEnd('filterAccounts');
    return filtered;
  }, [selectedIndustry, debouncedSearchQuery]);

  // Sort accounts for table view
  // Memoized to prevent recalculation on every render
  const sortedAccounts = useMemo(() => {
    const sorted = [...filteredAccounts];

    sorted.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortingColumn) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'industry':
          aValue = a.industry;
          bValue = b.industry;
          break;
        case 'annualRevenue':
          aValue = a.annualRevenue;
          bValue = b.annualRevenue;
          break;
        case 'employeeCount':
          aValue = a.employeeCount;
          bValue = b.employeeCount;
          break;
        case 'ownerName':
          aValue = a.ownerName.toLowerCase();
          bValue = b.ownerName.toLowerCase();
          break;
        case 'healthScore':
          aValue = a.healthScore;
          bValue = b.healthScore;
          break;
        case 'opportunityCount':
          aValue = a.opportunityCount;
          bValue = b.opportunityCount;
          break;
        case 'totalOpportunityValue':
          aValue = a.totalOpportunityValue;
          bValue = b.totalOpportunityValue;
          break;
        case 'lastActivityDate':
          aValue = new Date(a.lastActivityDate).getTime();
          bValue = new Date(b.lastActivityDate).getTime();
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      let comparison = 0;
      if (aValue < bValue) {
        comparison = -1;
      } else if (aValue > bValue) {
        comparison = 1;
      }

      return sortingDescending ? -comparison : comparison;
    });

    return sorted;
  }, [filteredAccounts, sortingColumn, sortingDescending]);

  // Get opportunities for selected account
  // Memoized to prevent recalculation on every render
  const accountOpportunities = useMemo(() => {
    if (!selectedAccount) return [];
    return mockOpportunities.filter(opp => opp.accountId === selectedAccount.id);
  }, [selectedAccount]);

  // Handle account click
  // Memoized with useCallback to prevent function recreation on every render
  const handleAccountClick = useCallback((account: Account) => {
    setSelectedAccount(account);
    setShowDetailsModal(true);
  }, []);

  // Handle sorting change
  // Memoized with useCallback to prevent function recreation on every render
  const handleSortingChange = useCallback((column: string, descending: boolean) => {
    setSortingColumn(column);
    setSortingDescending(descending);
  }, []);

  // Clear filters
  // Memoized with useCallback to prevent function recreation on every render
  const handleClearFilters = useCallback(() => {
    setSelectedIndustry('');
    setSearchQuery('');
  }, []);

  const hasActiveFilters = selectedIndustry !== '' || searchQuery.trim() !== '';

  // Handle retry
  // Memoized with useCallback to prevent function recreation on every render
  const handleRetry = useCallback(() => {
    setError(null);
    setLoading(true);
    setTimeout(() => setLoading(false), 400);
  }, []);

  // Show loading state
  if (loading) {
    return (
      <ContentLayout
        header={
          <Header
            variant="h1"
            description="Manage customer accounts and track account health"
          >
            Accounts
          </Header>
        }
      >
        <LoadingSpinner message="Loading accounts..." />
      </ContentLayout>
    );
  }

  // Show error state
  if (error) {
    return (
      <ContentLayout
        header={
          <Header
            variant="h1"
            description="Manage customer accounts and track account health"
          >
            Accounts
          </Header>
        }
      >
        <ErrorAlert
          header="Failed to load accounts"
          message={error}
          onRetry={handleRetry}
          showReload={true}
        />
      </ContentLayout>
    );
  }

  return (
    <>
      <ContentLayout
        header={
          <Header
            variant="h1"
            description="Manage customer accounts and track account health"
          >
            Accounts
          </Header>
        }
      >
        <SpaceBetween size="l">
          {/* Filters */}
          <Container>
            <SpaceBetween size="m">
              <Grid 
                gridDefinition={[
                  { colspan: { default: 12, xxs: 12, xs: 12, s: 4, m: 4 } },
                  { colspan: { default: 12, xxs: 12, xs: 12, s: 6, m: 6 } },
                  { colspan: { default: 12, xxs: 12, xs: 12, s: 2, m: 2 } },
                ]}
              >
                {/* Industry Filter */}
                <Select
                  selectedOption={
                    industryOptions.find(opt => opt.value === selectedIndustry) || industryOptions[0]
                  }
                  onChange={({ detail }) => setSelectedIndustry(detail.selectedOption.value as Industry | '')}
                  options={industryOptions}
                  placeholder="Filter by industry"
                  ariaLabel="Filter by industry"
                />

                {/* Search Input */}
                <Input
                  value={searchQuery}
                  onChange={({ detail }) => setSearchQuery(detail.value)}
                  placeholder="Search by account name or domain"
                  type="search"
                  clearAriaLabel="Clear search"
                  ariaLabel="Search accounts"
                />

                {/* Clear Filters Button */}
                <Button
                  onClick={handleClearFilters}
                  disabled={!hasActiveFilters}
                  ariaLabel="Clear filters"
                >
                  Clear filters
                </Button>
              </Grid>

              {/* Results count */}
              <Box variant="awsui-key-label">
                Showing {filteredAccounts.length} of {mockAccounts.length} accounts
              </Box>
            </SpaceBetween>
          </Container>

          {/* Accounts Table */}
          <AccountTable
            accounts={sortedAccounts}
            onRowClick={handleAccountClick}
            sortingColumn={sortingColumn}
            sortingDescending={sortingDescending}
            onSortingChange={handleSortingChange}
          />

          {/* Empty State */}
          {filteredAccounts.length === 0 && (
            <Container>
              <EmptyState
                title="No accounts found"
                description={
                  hasActiveFilters
                    ? 'No accounts match your current filters.'
                    : 'No accounts available.'
                }
                icon="🏢"
                suggestions={
                  hasActiveFilters
                    ? [
                        'Try selecting a different industry',
                        'Clear your search query',
                        'Remove all filters to see all accounts',
                      ]
                    : undefined
                }
                action={
                  hasActiveFilters
                    ? {
                        text: 'Clear filters',
                        onClick: handleClearFilters,
                      }
                    : undefined
                }
              />
            </Container>
          )}
        </SpaceBetween>
      </ContentLayout>

      {/* Account Details Modal */}
      <Modal
        visible={showDetailsModal}
        onDismiss={() => setShowDetailsModal(false)}
        header={selectedAccount?.name}
        size="large"
      >
        {selectedAccount && (
          <SpaceBetween size="l">
            {/* Account Information */}
            <Container header={<Header variant="h2">Account Information</Header>}>
              <Grid 
                gridDefinition={[
                  { colspan: { default: 12, xxs: 12, xs: 12, s: 6 } },
                  { colspan: { default: 12, xxs: 12, xs: 12, s: 6 } },
                ]}
              >
                <SpaceBetween size="s">
                  <Box>
                    <Box variant="awsui-key-label">Industry</Box>
                    <Box>{selectedAccount.industry}</Box>
                  </Box>
                  <Box>
                    <Box variant="awsui-key-label">Domain</Box>
                    <Box>{selectedAccount.domain}</Box>
                  </Box>
                  <Box>
                    <Box variant="awsui-key-label">Account Owner</Box>
                    <Box>{selectedAccount.ownerName}</Box>
                  </Box>
                </SpaceBetween>

                <SpaceBetween size="s">
                  <Box>
                    <Box variant="awsui-key-label">Annual Revenue</Box>
                    <Box>${(selectedAccount.annualRevenue / 1000000).toFixed(1)}M</Box>
                  </Box>
                  <Box>
                    <Box variant="awsui-key-label">Employees</Box>
                    <Box>{selectedAccount.employeeCount.toLocaleString()}</Box>
                  </Box>
                  <Box>
                    <Box variant="awsui-key-label">Health Score</Box>
                    <Box>{selectedAccount.healthScore}/100</Box>
                  </Box>
                </SpaceBetween>
              </Grid>
            </Container>

            {/* Related Opportunities */}
            <OpportunityTable
              opportunities={accountOpportunities}
              headerText="Related Opportunities"
              headerDescription={`${accountOpportunities.length} opportunities for this account`}
            />
          </SpaceBetween>
        )}
      </Modal>
    </>
  );
};

export default AccountsPage;
