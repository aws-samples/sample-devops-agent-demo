/**
 * CurrencyDisplay Component
 * 
 * Displays formatted currency values with consistent styling.
 * Supports compact notation for large values and color coding for positive/negative amounts.
 */

import React from 'react';
// Individual imports to avoid Cloudscape circular dependency issues with barrel exports
import Box from '@cloudscape-design/components/box';
import { formatCurrency, formatCompactCurrency } from '../../utils/formatters';

export interface CurrencyDisplayProps {
  /** Amount to display in USD */
  amount: number;
  
  /** Use compact notation (K/M/B) for large values */
  compact?: boolean;
  
  /** Show color coding (green for positive, red for negative) */
  colorCoded?: boolean;
  
  /** Font size variant */
  size?: 'small' | 'medium' | 'large';
  
  /** Additional CSS class name */
  className?: string;
}

/**
 * CurrencyDisplay component for formatted currency values
 */
export const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({
  amount,
  compact = false,
  colorCoded = false,
  size = 'medium',
  className,
}) => {
  const formattedValue = compact ? formatCompactCurrency(amount) : formatCurrency(amount);
  
  // Determine color based on amount
  let color: 'text-status-error' | 'text-status-success' | undefined;
  if (colorCoded) {
    if (amount < 0) {
      color = 'text-status-error';
    } else if (amount > 0) {
      color = 'text-status-success';
    }
  }
  
  return (
    <Box
      color={color}
      fontSize={size === 'large' ? 'heading-l' : size === 'small' ? 'body-s' : 'body-m'}
      fontWeight={size === 'large' ? 'bold' : 'normal'}
      className={className}
      display="inline"
    >
      {formattedValue}
    </Box>
  );
};

export default CurrencyDisplay;
