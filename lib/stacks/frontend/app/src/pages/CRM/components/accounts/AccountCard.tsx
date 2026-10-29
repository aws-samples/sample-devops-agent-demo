/**
 * AccountCard Component
 * 
 * Displays account information in a card format for card view.
 * Shows account name, industry, revenue, employee count, owner, health status,
 * and associated opportunity metrics.
 * 
 * Optimized with React.memo to prevent unnecessary re-renders.
 */

import React from 'react';
// Individual imports to avoid Cloudscape circular dependency issues with barrel exports
import Box from '@cloudscape-design/components/box';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Link from '@cloudscape-design/components/link';
import { Account } from '../../types';
import { AccountHealthBadge } from './AccountHealthBadge';
import { IndustryIcon } from '../shared/IndustryIcon';
import { formatCurrency, formatNumber } from '../../utils/formatters';

interface AccountCardProps {
  account: Account;
  onClick?: (account: Account) => void;
}

export const AccountCard: React.FC<AccountCardProps> = React.memo(({ account, onClick }) => {
  const handleClick = () => {
    if (onClick) {
      onClick(account);
    }
  };

  return (
    <div
      style={{
        padding: '20px',
        backgroundColor: 'var(--color-background-container-content)',
        borderRadius: '8px',
        border: '1px solid var(--color-border-divider-default)',
        cursor: onClick ? 'pointer' : 'default',
      }}
      onClick={handleClick}
      data-testid={`account-card-${account.id}`}
    >
      <SpaceBetween size="m">
        {/* Company Logo and Account Name */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {account.logoUrl && (
            <div style={{ marginRight: '12px' }}>
              <img 
                src={account.logoUrl} 
                alt={`${account.name} logo`}
                style={{ 
                  width: '48px', 
                  height: '48px', 
                  objectFit: 'contain',
                  borderRadius: '4px'
                }}
                onError={(e) => {
                  // Hide image if it fails to load
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
          <div style={{ flex: 1 }}>
            <SpaceBetween size="xs">
              <Box fontSize="heading-m" fontWeight="bold">
                {onClick ? (
                  <Link variant="primary" onFollow={handleClick}>
                    {account.name}
                  </Link>
                ) : (
                  account.name
                )}
              </Box>
              <AccountHealthBadge health={account.healthStatus} score={account.healthScore} />
            </SpaceBetween>
          </div>
        </div>

        {/* Account Details */}
        <Box>
          <SpaceBetween size="xs">
            <Box>
              <Box variant="awsui-key-label" fontSize="body-s" color="text-label">
                Industry
              </Box>
              <Box fontSize="body-m">
                <IndustryIcon industry={account.industry} size={20} showLabel />
              </Box>
            </Box>

            <Box>
              <Box variant="awsui-key-label" fontSize="body-s" color="text-label">
                Annual Revenue
              </Box>
              <Box fontSize="body-m">{formatCurrency(account.annualRevenue)}</Box>
            </Box>

            <Box>
              <Box variant="awsui-key-label" fontSize="body-s" color="text-label">
                Employees
              </Box>
              <Box fontSize="body-m">{formatNumber(account.employeeCount)}</Box>
            </Box>

            <Box>
              <Box variant="awsui-key-label" fontSize="body-s" color="text-label">
                Account Owner
              </Box>
              <Box fontSize="body-m">{account.ownerName}</Box>
            </Box>
          </SpaceBetween>
        </Box>

        {/* Opportunity Metrics */}
        <div
          style={{
            padding: '12px',
            backgroundColor: 'var(--color-background-container-header)',
            borderRadius: '8px',
          }}
        >
          <SpaceBetween size="xs">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Box fontSize="body-s" color="text-label">
                Opportunities
              </Box>
              <Box fontSize="body-s" fontWeight="bold">
                {account.opportunityCount}
              </Box>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Box fontSize="body-s" color="text-label">
                Total Value
              </Box>
              <Box fontSize="body-s" fontWeight="bold">
                {formatCurrency(account.totalOpportunityValue)}
              </Box>
            </div>
          </SpaceBetween>
        </div>
      </SpaceBetween>
    </div>
  );
});

AccountCard.displayName = 'AccountCard';
