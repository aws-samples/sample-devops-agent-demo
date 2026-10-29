/**
 * Opportunity Table Component
 * 
 * Displays a sortable, paginated table of sales opportunities with the following columns:
 * - Name
 * - Account
 * - Amount
 * - Close Date
 * - Stage
 * - Next Step
 * - Recent Activity
 * - Forecast Category
 * - Owner
 * 
 * Features:
 * - Sortable columns
 * - Pagination (50 items per page)
 * - Row click for details (future enhancement)
 * - Responsive design with horizontal scroll on mobile
 * - Uses Cloudscape Table component
 */

import React, { useState } from 'react';
// Individual imports to avoid Cloudscape circular dependency issues with barrel exports
import Table from '@cloudscape-design/components/table';
import Box from '@cloudscape-design/components/box';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Header from '@cloudscape-design/components/header';
import Icon from '@cloudscape-design/components/icon';
import Pagination from '@cloudscape-design/components/pagination';
import Badge from '@cloudscape-design/components/badge';
import { Opportunity } from '../../types';
import { CurrencyDisplay, DateDisplay, StatusBadge, EmptyState } from '../shared';
import { formatRelativeDate } from '../../utils/formatters';

export interface OpportunityTableProps {
  /** Array of opportunities to display */
  opportunities: Opportunity[];
  
  /** Callback when a row is clicked */
  onRowClick?: (opportunity: Opportunity) => void;
  
  /** Loading state */
  loading?: boolean;
  
  /** Optional header text */
  headerText?: string;
  
  /** Optional header description */
  headerDescription?: string;
}

/**
 * OpportunityTable Component
 * 
 * A comprehensive table for displaying and managing sales opportunities.
 * Supports sorting, pagination, and responsive design.
 */
export const OpportunityTable: React.FC<OpportunityTableProps> = ({
  opportunities,
  onRowClick,
  loading = false,
  headerText = 'Opportunities',
  headerDescription,
}) => {
  // Pagination state
  const [currentPageIndex, setCurrentPageIndex] = useState(1);
  const pageSize = 50;
  
  // Sorting state
  const [sortingColumn, setSortingColumn] = useState<string>('closeDate');
  const [sortingDescending, setSortingDescending] = useState(false);

  // Sort opportunities
  const sortedOpportunities = React.useMemo(() => {
    const sorted = [...opportunities];
    
    sorted.sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (sortingColumn) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'accountName':
          aValue = a.accountName.toLowerCase();
          bValue = b.accountName.toLowerCase();
          break;
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'closeDate':
          aValue = new Date(a.closeDate).getTime();
          bValue = new Date(b.closeDate).getTime();
          break;
        case 'stage':
          aValue = a.stage;
          bValue = b.stage;
          break;
        case 'forecastCategory':
          aValue = a.forecastCategory;
          bValue = b.forecastCategory;
          break;
        case 'ownerName':
          aValue = a.ownerName.toLowerCase();
          bValue = b.ownerName.toLowerCase();
          break;
        case 'recentActivityDate':
          aValue = new Date(a.recentActivityDate).getTime();
          bValue = new Date(b.recentActivityDate).getTime();
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortingDescending ? 1 : -1;
      if (aValue > bValue) return sortingDescending ? -1 : 1;
      return 0;
    });
    
    return sorted;
  }, [opportunities, sortingColumn, sortingDescending]);

  // Paginate opportunities
  const paginatedOpportunities = React.useMemo(() => {
    const startIndex = (currentPageIndex - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return sortedOpportunities.slice(startIndex, endIndex);
  }, [sortedOpportunities, currentPageIndex]);

  // Handle sorting
  const handleSortingChange = (event: any) => {
    const { sortingColumn: newSortingColumn, isDescending } = event.detail;
    setSortingColumn(newSortingColumn.sortingField);
    setSortingDescending(isDescending || false);
  };

  // Check if opportunity is overdue
  const isOverdue = (opportunity: Opportunity): boolean => {
    const now = new Date();
    const closeDate = new Date(opportunity.closeDate);
    return closeDate < now && 
           opportunity.stage !== 'Closed Won' && 
           opportunity.stage !== 'Closed Lost';
  };

  // Column definitions
  const columnDefinitions = [
    {
      id: 'name',
      header: 'Opportunity Name',
      cell: (item: Opportunity) => (
        <SpaceBetween direction="horizontal" size="xs">
          <Box
            variant="span"
            fontWeight="bold"
            fontSize="body-m"
          >
            <span style={{ color: '#0972D3' }}>{item.name}</span>
          </Box>
          {isOverdue(item) && (
            <Badge color="red">Overdue</Badge>
          )}
        </SpaceBetween>
      ),
      sortingField: 'name',
      width: 250,
      minWidth: 200,
    },
    {
      id: 'accountName',
      header: 'Account',
      cell: (item: Opportunity) => item.accountName,
      sortingField: 'accountName',
      width: 200,
      minWidth: 150,
    },
    {
      id: 'amount',
      header: 'Amount',
      cell: (item: Opportunity) => (
        <CurrencyDisplay amount={item.amount} />
      ),
      sortingField: 'amount',
      width: 150,
      minWidth: 120,
    },
    {
      id: 'stage',
      header: 'Stage',
      cell: (item: Opportunity) => (
        <StatusBadge status={item.stage} type="stage" />
      ),
      sortingField: 'stage',
      width: 140,
      minWidth: 120,
    },
    {
      id: 'nextStep',
      header: 'Suggested Next Step',
      cell: (item: Opportunity) => (
          <SpaceBetween size={'xs'} direction={'horizontal'}>
              <div style={{ color: '#7D2AE8' }}>
                  <Icon name={'gen-ai'} size={'small'}  />
              </div>
              <Box variant="span" fontSize="body-s">
                  {item.nextStep}
              </Box>
          </SpaceBetween>
      ),
      width: 250,
      minWidth: 200,
    },
    {
      id: 'recentActivity',
      header: 'Recent Activity',
      cell: (item: Opportunity) => (
        <SpaceBetween size="xxs">
          <Box variant="span" fontSize="body-s">
            {item.recentActivity}
          </Box>
          <Box variant="span" fontSize="body-s" color="text-status-inactive">
            {formatRelativeDate(item.recentActivityDate)}
          </Box>
        </SpaceBetween>
      ),
      sortingField: 'recentActivityDate',
      width: 220,
      minWidth: 180,
    },
    {
      id: 'forecastCategory',
      header: 'Forecast',
      cell: (item: Opportunity) => (
        <StatusBadge status={item.forecastCategory} type="forecast" />
      ),
      sortingField: 'forecastCategory',
      width: 120,
      minWidth: 100,
    },
      {
          id: 'closeDate',
          header: 'Close Date',
          cell: (item: Opportunity) => (
              <DateDisplay date={item.closeDate} format="MMM d, yyyy" />
          ),
          sortingField: 'closeDate',
          width: 130,
          minWidth: 120,
      },
    {
      id: 'ownerName',
      header: 'Owner',
      cell: (item: Opportunity) => item.ownerName,
      sortingField: 'ownerName',
      width: 150,
      minWidth: 120,
    },
  ];

  return (
    <Table
      columnDefinitions={columnDefinitions}
      items={paginatedOpportunities}
      loading={loading}
      loadingText="Loading opportunities..."
      sortingColumn={columnDefinitions.find(col => col.sortingField === sortingColumn)}
      sortingDescending={sortingDescending}
      onSortingChange={handleSortingChange}
      variant="container"
      stickyHeader
      resizableColumns
      wrapLines={false}
      stripedRows
      onRowClick={onRowClick ? (event) => {
        if (event.detail.item) {
          onRowClick(event.detail.item);
        }
      } : undefined}
      header={
        <Header
          counter={`(${opportunities.length})`}
          description={headerDescription}
        >
          {headerText}
        </Header>
      }
      pagination={
        <Pagination
          currentPageIndex={currentPageIndex}
          pagesCount={Math.ceil(sortedOpportunities.length / pageSize)}
          onChange={({ detail }) => setCurrentPageIndex(detail.currentPageIndex)}
          ariaLabels={{
            nextPageLabel: 'Next page',
            previousPageLabel: 'Previous page',
            pageLabel: (pageNumber) => `Page ${pageNumber}`,
          }}
        />
      }
      empty={
        <EmptyState
          title="No opportunities found"
          description="No opportunities match the current filters."
          icon="🔍"
          illustrationUrl="/crm/illustrations/no-opportunities.png"
          suggestions={[
            'Clear some filters to see more results',
            'Adjust the date range',
            'Try a different search term',
          ]}
        />
      }
    />
  );
};

export default OpportunityTable;
