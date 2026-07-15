/**
 * IndustryIcon Component
 * 
 * Displays an icon representing the industry type.
 * Falls back to text if icon image is not available.
 */

import React from 'react';
// Individual imports to avoid Cloudscape circular dependency issues with barrel exports
import Box from '@cloudscape-design/components/box';
import { Industry } from '../../types';

export interface IndustryIconProps {
  /** Industry type */
  industry: Industry;
  
  /** Icon size in pixels */
  size?: number;
  
  /** Whether to show label text */
  showLabel?: boolean;
}

/**
 * Get the icon path for an industry
 */
const getIndustryIconPath = (industry: Industry): string => {
  const industryMap: Record<Industry, string> = {
    [Industry.Technology]: '/crm/icons/technology.png',
    [Industry.Healthcare]: '/crm/icons/healthcare.png',
    [Industry.Finance]: '/crm/icons/finance.png',
    [Industry.Retail]: '/crm/icons/retail.png',
    [Industry.Manufacturing]: '/crm/icons/manufacturing.png',
  };
  return industryMap[industry];
};

/**
 * Get fallback emoji for an industry
 */
const getIndustryEmoji = (industry: Industry): string => {
  const emojiMap: Record<Industry, string> = {
    [Industry.Technology]: '💻',
    [Industry.Healthcare]: '🏥',
    [Industry.Finance]: '💰',
    [Industry.Retail]: '🛒',
    [Industry.Manufacturing]: '🏭',
  };
  return emojiMap[industry];
};

/**
 * IndustryIcon component
 */
export const IndustryIcon: React.FC<IndustryIconProps> = ({
  industry,
  size = 24,
  showLabel = false,
}) => {
  const [imageError, setImageError] = React.useState(false);
  const iconPath = getIndustryIconPath(industry);
  const emoji = getIndustryEmoji(industry);

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {!imageError ? (
        <img
          src={iconPath}
          alt={`${industry} icon`}
          style={{
            width: `${size}px`,
            height: `${size}px`,
            objectFit: 'contain',
          }}
          onError={() => setImageError(true)}
        />
      ) : (
        <Box fontSize="heading-s">{emoji}</Box>
      )}
      {showLabel && (
        <Box fontSize="body-m" margin={{ left: 'xs' }}>
          {industry}
        </Box>
      )}
    </div>
  );
};

export default IndustryIcon;
