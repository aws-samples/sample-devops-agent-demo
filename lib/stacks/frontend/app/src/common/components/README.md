# Common Components

This directory contains reusable components used across the application for error handling, loading states, and user feedback.

## Components

### ErrorBoundary

A React error boundary component that catches JavaScript errors anywhere in the child component tree and displays a fallback UI.

**Usage:**
```tsx
import { ErrorBoundary } from '../../common/components';

<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

**Features:**
- Catches component errors and prevents app crashes
- Displays user-friendly error message
- Provides "Try again" and "Reload page" actions
- Shows error details in development mode
- Supports custom fallback UI

**Props:**
- `children`: ReactNode - Components to wrap
- `fallback?`: ReactNode - Custom fallback UI (optional)

### LoadingSpinner

A loading spinner component with optional message using Cloudscape Spinner.

**Usage:**
```tsx
import { LoadingSpinner } from '../../common/components';

<LoadingSpinner message="Loading data..." size="large" />
```

**Features:**
- Cloudscape-styled spinner
- Customizable size and message
- Optional centering
- Consistent loading experience

**Props:**
- `message?`: string - Loading message (default: "Loading...")
- `size?`: 'normal' | 'big' | 'large' - Spinner size (default: 'large')
- `centered?`: boolean - Center vertically (default: true)

### ErrorAlert

An error alert component using Cloudscape Alert for displaying error messages.

**Usage:**
```tsx
import { ErrorAlert } from '../../common/components';

<ErrorAlert
  header="Failed to load data"
  message="An error occurred while fetching data."
  onRetry={handleRetry}
  showReload={true}
/>
```

**Features:**
- Cloudscape-styled alert
- Dismissible option
- Retry and reload actions
- Warning and error types
- Consistent error messaging

**Props:**
- `header?`: string - Error header (default: "Error")
- `message`: string - Error message (required)
- `type?`: 'error' | 'warning' - Alert type (default: 'error')
- `onRetry?`: () => void - Retry callback
- `onDismiss?`: () => void - Dismiss callback
- `showReload?`: boolean - Show reload button (default: false)
- `className?`: string - Additional CSS class

## Usage Patterns

### Page-Level Loading and Error States

All CRM pages follow this pattern:

```tsx
import { LoadingSpinner, ErrorAlert } from '../../common/components';

export const MyPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        setLoading(false);
      } catch (err) {
        setError('Failed to load data. Please try again.');
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    setTimeout(() => setLoading(false), 500);
  };

  if (loading) {
    return (
      <ContentLayout header={<Header>My Page</Header>}>
        <LoadingSpinner message="Loading data..." />
      </ContentLayout>
    );
  }

  if (error) {
    return (
      <ContentLayout header={<Header>My Page</Header>}>
        <ErrorAlert
          header="Failed to load"
          message={error}
          onRetry={handleRetry}
          showReload={true}
        />
      </ContentLayout>
    );
  }

  return (
    <ContentLayout header={<Header>My Page</Header>}>
      {/* Page content */}
    </ContentLayout>
  );
};
```

### Table Loading States

Tables use the built-in Cloudscape Table loading prop:

```tsx
<OpportunityTable
  opportunities={data}
  loading={isLoading}
  headerText="Opportunities"
/>
```

### Empty States

Use the EmptyState component from CRM shared components:

```tsx
import { EmptyState } from './components/shared';

<EmptyState
  title="No opportunities found"
  description="No opportunities match the current filters."
  icon="🔍"
  suggestions={[
    'Clear some filters to see more results',
    'Adjust the date range',
    'Try a different search term',
  ]}
  action={{
    text: 'Clear filters',
    onClick: handleClearFilters,
  }}
/>
```

## Error Boundary Placement

Error boundaries are placed at strategic levels:

1. **App Level** (`App.tsx`): Catches errors in the entire application
2. **Route Level** (`CRM/index.tsx`): Catches errors in CRM routes
3. **Component Level**: Can be added around specific components as needed

## Best Practices

1. **Always show loading states** for async operations
2. **Provide retry actions** for recoverable errors
3. **Use consistent error messages** across the app
4. **Show helpful suggestions** in empty states
5. **Test error boundaries** by throwing errors in development
6. **Keep loading times short** (< 2 seconds target)
7. **Use skeleton loaders** for tables (Cloudscape built-in)
8. **Provide clear feedback** for all user actions

## Testing

To test error boundaries in development:

```tsx
// Temporarily add this to a component
if (process.env.NODE_ENV === 'development') {
  throw new Error('Test error boundary');
}
```

To test loading states:

```tsx
// Increase the timeout temporarily
await new Promise(resolve => setTimeout(resolve, 5000));
```

## Future Enhancements

- Add toast notifications for success messages
- Implement skeleton loaders for cards
- Add progress indicators for multi-step operations
- Implement optimistic UI updates
- Add network status detection
- Implement retry with exponential backoff
