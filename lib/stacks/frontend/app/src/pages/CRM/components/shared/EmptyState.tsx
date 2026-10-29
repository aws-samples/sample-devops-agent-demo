/**
 * EmptyState Component
 * 
 * Displays friendly empty state messages when no data is available.
 * Supports custom messages, icons, and action buttons.
 */

import React from 'react';
// Individual imports to avoid Cloudscape circular dependency issues with barrel exports
import Box from '@cloudscape-design/components/box';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Button from '@cloudscape-design/components/button';

export interface EmptyStateProps {
  /** Title for the empty state */
  title: string;
  
  /** Description or helpful message */
  description?: string;
  
  /** Optional action button */
  action?: {
    text: string;
    onClick: () => void;
  };
  
  /** Icon to display (emoji or text) */
  icon?: string;
  
  /** Optional illustration image URL */
  illustrationUrl?: string;
  
  /** Additional CSS class name */
  className?: string;
  
  /** Suggestions for the user */
  suggestions?: string[];
}

/**
 * EmptyState component for no-data scenarios
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  action,
  icon = '📭',
  illustrationUrl,
  className,
  suggestions,
}) => {
  const [imageError, setImageError] = React.useState(false);
  return (
    <Box
      textAlign="center"
      padding={{ vertical: 'xxxl', horizontal: 'l' }}
      className={className}
    >
      <SpaceBetween size="l">
        {/* Icon or Illustration */}
        {illustrationUrl && !imageError ? (
          <Box textAlign="center">
            <img
              src={illustrationUrl}
              alt={title}
              style={{
                maxWidth: '400px',
                width: '100%',
                height: 'auto',
              }}
              onError={() => setImageError(true)}
            />
          </Box>
        ) : (
          <Box fontSize="display-l" color="text-status-inactive">
            {icon}
          </Box>
        )}
        
        {/* Title */}
        <Box
          variant="h2"
          fontSize="heading-l"
          fontWeight="bold"
          color="text-label"
        >
          {title}
        </Box>
        
        {/* Description */}
        {description && (
          <Box
            variant="p"
            fontSize="body-m"
            color="text-body-secondary"
          >
            {description}
          </Box>
        )}
        
        {/* Suggestions */}
        {suggestions && suggestions.length > 0 && (
          <Box textAlign="left">
            <Box variant="p" fontSize="body-s" color="text-body-secondary">
              Try:
            </Box>
            <SpaceBetween size="xxs">
              {suggestions.map((suggestion, index) => (
                <Box key={index} variant="p" fontSize="body-s" color="text-body-secondary">
                  • {suggestion}
                </Box>
              ))}
            </SpaceBetween>
          </Box>
        )}
        
        {/* Action Button */}
        {action && (
          <Box>
            <Button onClick={action.onClick}>
              {action.text}
            </Button>
          </Box>
        )}
      </SpaceBetween>
    </Box>
  );
};

export default EmptyState;
