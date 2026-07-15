/**
 * ErrorBoundary Component
 * 
 * React error boundary to catch and handle component errors gracefully.
 * Displays a friendly error message and provides recovery options.
 */

import React, { Component, ReactNode } from 'react';
// Individual imports to avoid Cloudscape circular dependency issues with barrel exports
import Alert from '@cloudscape-design/components/alert';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import SpaceBetween from '@cloudscape-design/components/space-between';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * ErrorBoundary class component
 * 
 * Catches errors in child components and displays a fallback UI.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(_error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <Box padding={{ vertical: 'xxxl', horizontal: 'l' }}>
          <SpaceBetween size="l">
            <Alert
              type="error"
              header="Something went wrong"
              action={
                <SpaceBetween direction="horizontal" size="xs">
                  <Button onClick={this.handleReset}>Try again</Button>
                  <Button onClick={this.handleReload}>Reload page</Button>
                </SpaceBetween>
              }
            >
              <SpaceBetween size="s">
                <Box>
                  An unexpected error occurred while rendering this component.
                  Please try again or reload the page.
                </Box>
                {import.meta.env.DEV && this.state.error && (
                  <Box>
                    <Box variant="strong">Error details:</Box>
                    <Box fontSize="body-s">
                      <code>{this.state.error.toString()}</code>
                    </Box>
                  </Box>
                )}
              </SpaceBetween>
            </Alert>
          </SpaceBetween>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
