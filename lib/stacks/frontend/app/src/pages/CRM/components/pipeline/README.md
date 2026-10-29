# Pipeline Components

This directory contains components specific to the Pipeline dashboard view.

## Components

### StageMetrics

Displays horizontal cards showing key pipeline stage metrics.

**Props:**
- `metrics: PipelineMetrics` - Pipeline metrics to display

**Features:**
- Color-coded metrics (green for positive, red for negative)
- Responsive layout with Cloudscape ColumnLayout
- Compact currency formatting

### OpportunityTable

A comprehensive table for displaying and managing sales opportunities.

**Props:**
- `opportunities: Opportunity[]` - Array of opportunities to display
- `onRowClick?: (opportunity: Opportunity) => void` - Optional callback when a row is clicked
- `loading?: boolean` - Loading state
- `headerText?: string` - Optional header text (default: "Opportunities")
- `headerDescription?: string` - Optional header description

**Features:**
- **Sortable columns**: Click column headers to sort
- **Pagination**: 50 items per page
- **Responsive design**: Horizontal scroll on mobile
- **Row click**: Optional click handler for future detail view
- **Empty state**: Friendly message when no opportunities match filters
- **Loading state**: Spinner while data loads

**Columns:**
1. **Opportunity Name** - Bold, link-colored text
2. **Account** - Account name
3. **Amount** - Formatted currency (USD)
4. **Close Date** - Formatted date (MMM d, yyyy)
5. **Stage** - Color-coded badge
6. **Next Step** - Next action description
7. **Recent Activity** - Activity description with relative time
8. **Forecast** - Forecast category badge
9. **Owner** - Owner name

**Usage Example:**

```typescript
import { OpportunityTable } from './components/pipeline';
import { mockOpportunities } from './data/mockOpportunities';

function PipelinePage() {
  const handleRowClick = (opportunity: Opportunity) => {
    console.log('Clicked:', opportunity.name);
    // Navigate to detail view or open modal
  };

  return (
    <OpportunityTable
      opportunities={mockOpportunities}
      onRowClick={handleRowClick}
      loading={false}
      headerText="My Opportunities"
      headerDescription="View and manage your sales pipeline"
    />
  );
}
```

**Sorting:**
- Default sort: Close Date (ascending)
- Sortable columns: Name, Account, Amount, Close Date, Stage, Forecast, Owner, Recent Activity
- Click column header to toggle sort direction

**Pagination:**
- 50 items per page
- Navigation controls at bottom of table
- Shows current page and total pages

**Responsive Behavior:**
- Desktop (>1024px): Full table with all columns visible
- Tablet (768-1024px): Horizontal scroll enabled
- Mobile (<768px): Horizontal scroll with sticky first column

### OpportunityFilters

A comprehensive filter panel for opportunity pipeline management.

**Props:**
- `filters: FilterState` - Current filter state object
- `onFilterChange: (filters: FilterState) => void` - Callback when filters change
- `showForecastFilter?: boolean` - Optional: Show forecast category filter (default: false)

**Filter State Interface:**
```typescript
interface FilterState {
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  stage: OpportunityStage[];
  owner: string[];
  forecastCategory: ForecastCategory[];
  searchQuery: string;
}
```

**Features:**
- **Search input**: Text search across opportunity name, account name, and owner
- **Date range picker**: Filter by close date with relative and absolute options
- **Stage multiselect**: Filter by one or more pipeline stages
- **Owner multiselect**: Filter by one or more opportunity owners
- **Forecast multiselect**: Optional filter by forecast category
- **Clear filters button**: Reset all filters to default state
- **Active filter indicator**: Button disabled when no filters active

**Usage Example:**

```typescript
import { OpportunityFilters } from './components/pipeline';
import { useState } from 'react';

function PipelinePage() {
  const [filters, setFilters] = useState({
    dateRange: { start: null, end: null },
    stage: [],
    owner: [],
    forecastCategory: [],
    searchQuery: '',
  });

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    // Apply filters to opportunities data
  };

  return (
    <OpportunityFilters
      filters={filters}
      onFilterChange={handleFilterChange}
      showForecastFilter={true}
    />
  );
}
```

**Filter Behavior:**
- **Search**: Debounced text search (filters as you type)
- **Date Range**: Supports relative ranges (last 7/30/90 days, next 30/90 days) and absolute dates
- **Multiselect**: Token limit of 3 visible, with auto-filtering for easy selection
- **Clear Filters**: Resets all filters to empty/null state

**Date Range Options:**
- Previous 7 days
- Previous 30 days
- Previous 90 days
- Next 30 days
- Next 90 days
- Custom absolute range

**Integration with OpportunityTable:**

```typescript
import { OpportunityFilters, OpportunityTable } from './components/pipeline';
import { filterOpportunities } from './utils/filters';

function PipelinePage() {
  const [filters, setFilters] = useState({...});
  
  // Apply filters to opportunities
  const filteredOpportunities = filterOpportunities(
    mockOpportunities,
    filters
  );

  return (
    <>
      <OpportunityFilters
        filters={filters}
        onFilterChange={setFilters}
      />
      <OpportunityTable
        opportunities={filteredOpportunities}
      />
    </>
  );
}
```

## Testing

To test the pipeline components:

**OpportunityTable:**
1. Import mock data: `import { mockOpportunities } from '../../data/mockOpportunities';`
2. Render the component with mock data
3. Test sorting by clicking column headers
4. Test pagination by navigating pages
5. Test row click by providing an `onRowClick` handler
6. Test empty state by passing an empty array
7. Test loading state by setting `loading={true}`

**OpportunityFilters:**
1. Initialize filter state with default values
2. Test search input by typing queries
3. Test date range picker with relative and absolute ranges
4. Test stage multiselect by selecting/deselecting stages
5. Test owner multiselect by selecting/deselecting owners
6. Test clear filters button (should reset all filters)
7. Verify onFilterChange callback receives correct filter state
8. Test with `showForecastFilter={true}` to enable forecast filtering

## Dependencies

- `@cloudscape-design/components` - Table, Box, SpaceBetween, Header, Pagination
- `date-fns` - Date formatting (via formatters utility)
- CRM shared components: CurrencyDisplay, DateDisplay, StatusBadge
- CRM utilities: formatRelativeDate

## Future Enhancements

- [ ] Column visibility preferences
- [ ] Export to CSV
- [ ] Bulk actions (select multiple rows)
- [ ] Inline editing
- [ ] Drag-and-drop to change stage
- [ ] Keyboard navigation
- [ ] Column resizing persistence
