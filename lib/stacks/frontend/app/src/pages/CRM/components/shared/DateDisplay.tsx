/**
 * DateDisplay Component
 * 
 * Displays formatted dates with multiple format options.
 * Supports relative dates (e.g., "2 days ago") and custom format strings.
 */

import React from 'react';
// Individual imports to avoid Cloudscape circular dependency issues with barrel exports
import Box from '@cloudscape-design/components/box';
import { formatDate, formatRelativeDate } from '../../utils/formatters';

export interface DateDisplayProps {
  /** Date to display */
  date: Date | string;
  
  /** Display format: 'short' (MM/DD/YYYY), 'long' (Month DD, YYYY), 'relative' (X days ago), or custom format string */
  format?: 'short' | 'long' | 'relative' | string;
  
  /** Show warning color for overdue dates (only works with Date objects) */
  warnIfOverdue?: boolean;
  
  /** Font size variant */
  size?: 'small' | 'medium';
  
  /** Additional CSS class name */
  className?: string;
}

/**
 * DateDisplay component for formatted dates
 */
export const DateDisplay: React.FC<DateDisplayProps> = ({
  date,
  format = 'short',
  warnIfOverdue = false,
  size = 'medium',
  className,
}) => {
  // Convert string to Date if needed
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Determine format string
  let formattedValue: string;
  switch (format) {
    case 'short':
      formattedValue = formatDate(dateObj, 'MM/dd/yyyy');
      break;
    case 'long':
      formattedValue = formatDate(dateObj, 'MMM d, yyyy');
      break;
    case 'relative':
      formattedValue = formatRelativeDate(dateObj);
      break;
    default:
      formattedValue = formatDate(dateObj, format);
  }
  
  // Check if date is overdue
  const isOverdue = warnIfOverdue && dateObj < new Date();
  
  return (
    <Box
      color={isOverdue ? 'text-status-error' : undefined}
      fontSize={size === 'small' ? 'body-s' : 'body-m'}
      className={className}
      display="inline"
    >
      {formattedValue}
    </Box>
  );
};

export default DateDisplay;
