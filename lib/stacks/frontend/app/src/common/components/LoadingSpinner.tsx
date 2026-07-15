/**
 * LoadingSpinner Component
 * 
 * Displays a loading spinner with optional message.
 * Uses Cloudscape Spinner component.
 */

import React from 'react';
// Individual imports to avoid Cloudscape circular dependency issues with barrel exports
import Box from '@cloudscape-design/components/box';
import Spinner from '@cloudscape-design/components/spinner';
import SpaceBetween from '@cloudscape-design/components/space-between';

export interface LoadingSpinnerProps {
  /** Loading message to display */
  message?: string;
  
  /** Size of the spinner */
  size?: 'normal' | 'big' | 'large';
  
  /** Center the spinner vertically */
  centered?: boolean;
}

/**
 * LoadingSpinner component for data fetching states
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading...',
  size = 'large',
  centered = true,
}) => {
  const content = (
    <SpaceBetween size="m" alignItems="center">
      <Spinner size={size} />
      {message && (
        <Box
          variant="p"
          fontSize="body-m"
          color="text-body-secondary"
          textAlign="center"
        >
          {message}
        </Box>
      )}
    </SpaceBetween>
  );

  if (centered) {
    return (
      <Box
        textAlign="center"
        padding={{ vertical: 'xxxl', horizontal: 'l' }}
      >
        {content}
      </Box>
    );
  }

  return <Box textAlign="center">{content}</Box>;
};

export default LoadingSpinner;
