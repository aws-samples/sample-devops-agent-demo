/**
 * AccountTable Component
 * 
 * Displays accounts in a table format with sortable columns.
 * Shows account name, industry, revenue, employee count, owner, health status,
 * opportunity count, and total opportunity value.
 */

// Individual imports to avoid Cloudscape circular dependency issues with barrel exports
import Table from '@cloudscape-design/components/table';
import Box from '@cloudscape-design/components/box';
import { Account } from '../../types';
import { AccountHealthBadge } from './AccountHealthBadge';
import { IndustryIcon } from '../shared/IndustryIcon';
import { EmptyState } from '../shared/EmptyState';
import { formatCurrency, formatNumber, formatDate } from '../../utils/formatters';

interface AccountTableProps {
  accounts: Account[];
  loading?: boolean;
  onRowClick?: (account: Account) => void;
  sortingColumn?: string;
  sortingDescending?: boolean;
  onSortingChange?: (column: string, descending: boolean) => void;
}

export const AccountTable: React.FC<AccountTableProps> = ({
  accounts,
  loading = false,
  onRowClick,
  sortingColumn,
  sortingDescending,
  onSortingChange,
}) => {
  return (
    <Table
      columnDefinitions={[
        {
          id: 'name',
          header: 'Account Name',
          cell: (account: Account) => (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {account.logoUrl && (
                <div style={{ marginRight: '12px' }}>
                  <img 
                    src={account.logoUrl} 
                    alt={`${account.name} logo`}
                    style={{ 
                      width: '32px', 
                      height: '32px', 
                      objectFit: 'contain',
                      borderRadius: '4px'
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
              <span>{account.name}</span>
            </div>
          ),
          sortingField: 'name',
          width: 250,
        },
        {
          id: 'industry',
          header: 'Industry',
          cell: (account: Account) => (
            <IndustryIcon industry={account.industry} size={20} showLabel />
          ),
          sortingField: 'industry',
          width: 150,
        },
        {
          id: 'annualRevenue',
          header: 'Annual Revenue',
          cell: (account: Account) => formatCurrency(account.annualRevenue),
          sortingField: 'annualRevenue',
          width: 150,
        },
        {
          id: 'employeeCount',
          header: 'Employees',
          cell: (account: Account) => formatNumber(account.employeeCount),
          sortingField: 'employeeCount',
          width: 100,
        },
        {
          id: 'ownerName',
          header: 'Owner',
          cell: (account: Account) => account.ownerName,
          sortingField: 'ownerName',
          width: 150,
        },
        {
          id: 'healthStatus',
          header: 'Health',
          cell: (account: Account) => (
            <AccountHealthBadge health={account.healthStatus} score={account.healthScore} />
          ),
          sortingField: 'healthScore',
          width: 140,
        },
        {
          id: 'opportunityCount',
          header: 'Opportunities',
          cell: (account: Account) => (
            <Box textAlign="right">{account.opportunityCount}</Box>
          ),
          sortingField: 'opportunityCount',
          width: 120,
        },
        {
          id: 'totalOpportunityValue',
          header: 'Total Value',
          cell: (account: Account) => (
            <Box textAlign="right">{formatCurrency(account.totalOpportunityValue)}</Box>
          ),
          sortingField: 'totalOpportunityValue',
          width: 150,
        },
        {
          id: 'lastActivityDate',
          header: 'Last Activity',
          cell: (account: Account) => formatDate(account.lastActivityDate, 'MM/dd/yyyy'),
          sortingField: 'lastActivityDate',
          width: 120,
        },
      ]}
      items={accounts}
      loading={loading}
      loadingText="Loading accounts..."
      sortingColumn={
        sortingColumn
          ? {
              sortingField: sortingColumn,
            }
          : undefined
      }
      sortingDescending={sortingDescending}
      onSortingChange={(event) => {
        if (onSortingChange && event.detail.sortingColumn?.sortingField) {
          onSortingChange(
            event.detail.sortingColumn.sortingField,
            event.detail.isDescending ?? false
          );
        }
      }}
      onRowClick={(event) => {
        if (onRowClick) {
          onRowClick(event.detail.item);
        }
      }}
      trackBy="id"
      empty={
        <EmptyState
          title="No accounts found"
          description="No accounts match the current filters."
          icon="🏢"
          illustrationUrl="/crm/illustrations/no-accounts.png"
          suggestions={[
            'Clear filters to see all accounts',
            'Try a different industry filter',
            'Adjust your search term',
          ]}
        />
      }
      variant="container"
      stickyHeader
    />
  );
};
