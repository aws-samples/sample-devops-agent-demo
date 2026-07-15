/**
 * ErrorAlert Component
 * 
 * Displays error messages using Cloudscape Alert component.
 * Supports different error types and recovery actions.
 */

import React from 'react';
// Individual imports to avoid Cloudscape circular dependency issues with barrel exports
import Alert from '@cloudscape-design/components/alert';
import Button from '@cloudscape-design/components/button';
import SpaceBetween from '@cloudscape-design/components/space-between';

export interface ErrorAlertProps {
  /** Error message header */
  header?: string;
  
  /** Error message details */
  message: string;
  
  /** Error type */
  type?: 'error' | 'warning';
  
  /** Retry action */
  onRetry?: () => void;
  
  /** Dismiss action */
  onDismiss?: () => void;
  
  /** Show reload button */
  showReload?: boolean;
  
  /** Additional CSS class name */
  className?: string;
}

/**
 * ErrorAlert component for displaying error messages
 */
export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  header = 'Error',
  message,
  type = 'error',
  onRetry,
  onDismiss,
  showReload = false,
  className,
}) => {
  const handleReload = () => {
    window.location.reload();
  };

  return (
    <Alert
      type={type}
      header={header}
      dismissible={!!onDismiss}
      onDismiss={onDismiss}
      className={className}
      action={
        (onRetry || showReload) ? (
          <SpaceBetween direction="horizontal" size="xs">
            {onRetry && (
              <Button onClick={onRetry}>Retry</Button>
            )}
            {showReload && (
              <Button onClick={handleReload}>Reload page</Button>
            )}
          </SpaceBetween>
        ) : undefined
      }
    >
      {message}
    </Alert>
  );
};

export default ErrorAlert;
