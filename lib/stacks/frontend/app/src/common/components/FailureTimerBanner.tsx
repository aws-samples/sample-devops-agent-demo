/**
 * Global Failure Timer Banner
 * 
 * Displays a countdown timer when a failure scenario is active.
 * Shows on all CRM pages via the Layout component.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
// Individual imports to avoid Cloudscape circular dependency issues with barrel exports
import Box from '@cloudscape-design/components/box';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Button from '@cloudscape-design/components/button';
import ProgressBar from '@cloudscape-design/components/progress-bar';
import Link from '@cloudscape-design/components/link';
import { get } from 'aws-amplify/api';
import { useNavigate, useLocation } from 'react-router-dom';

// Timer duration in seconds (20 minutes)
const TIMER_DURATION_SECONDS = 20 * 60;

interface ActiveScenario {
  type: string;
  name: string;
  expiresAt: string;
}

interface SystemStatus {
  [key: string]: {
    enabled: boolean;
    severity: string;
    enabledAt?: string;
    expiresAt?: string;
  };
}

// Map scenario types to display names
const SCENARIO_NAMES: Record<string, string> = {
  snsSubscriptionErrors: 'SNS Subscription Errors',
  lambdaFailedDeployment: 'Lambda Failed Deployment',
  rdsIndexDrop: 'RDS Index Drop',
};

export const FailureTimerBanner: React.FC = () => {
  const [activeScenario, setActiveScenario] = useState<ActiveScenario | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show on the failure simulator page itself
  const isOnFailureSimulatorPage = location.pathname.includes('/failure-simulator');

  const fetchSystemStatus = useCallback(async () => {
    console.log('[FailureTimerBanner] Fetching system status...');
    try {
      const restOperation = get({
        apiName: 'restApi',
        path: '/admin/system-status',
      });
      
      const response = await restOperation.response;
      const rawText = await response.body.text();
      console.log('[FailureTimerBanner] Raw response:', rawText);
      
      const data = JSON.parse(rawText) as { scenarios: SystemStatus };
      
      console.log('[FailureTimerBanner] Parsed response:', JSON.stringify(data, null, 2));
      
      if (data?.scenarios && typeof data.scenarios === 'object') {
        // Find active scenario with expiresAt
        let found: ActiveScenario | null = null;
        
        const scenarioEntries = Object.entries(data.scenarios);
        console.log(`[FailureTimerBanner] Found ${scenarioEntries.length} scenarios`);
        
        for (const [type, scenarioData] of scenarioEntries) {
          console.log(`[FailureTimerBanner] Checking scenario ${type}:`, JSON.stringify(scenarioData));
          if (scenarioData && scenarioData.enabled === true && scenarioData.expiresAt) {
            found = {
              type,
              name: SCENARIO_NAMES[type] || type,
              expiresAt: scenarioData.expiresAt,
            };
            console.log('[FailureTimerBanner] Found active scenario:', found);
            break;
          }
        }
        
        setActiveScenario(found);
        if (!found) {
          console.log('[FailureTimerBanner] No active scenarios with expiresAt found');
        }
      } else {
        console.log('[FailureTimerBanner] No scenarios in response or invalid format');
        setActiveScenario(null);
      }
    } catch (err) {
      // Log error details for debugging
      console.error('[FailureTimerBanner] Status check failed:', err);
      if (err instanceof Error) {
        console.error('[FailureTimerBanner] Error message:', err.message);
        console.error('[FailureTimerBanner] Error stack:', err.stack);
      }
    }
  }, []);

  // Poll for system status
  useEffect(() => {
    fetchSystemStatus();
    
    // Poll every 30 seconds
    pollRef.current = setInterval(fetchSystemStatus, 30000);
    
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, [fetchSystemStatus]);

  // Countdown timer
  useEffect(() => {
    if (!activeScenario?.expiresAt) {
      setRemainingSeconds(0);
      return;
    }

    const calculateRemaining = () => {
      const now = new Date().getTime();
      const expiry = new Date(activeScenario.expiresAt).getTime();
      return Math.max(0, Math.floor((expiry - now) / 1000));
    };

    setRemainingSeconds(calculateRemaining());

    intervalRef.current = setInterval(() => {
      const remaining = calculateRemaining();
      setRemainingSeconds(remaining);
      
      if (remaining <= 0) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        // Refresh status when timer expires
        fetchSystemStatus();
      }
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [activeScenario, fetchSystemStatus]);

  // Don't render if no active scenario, timer expired, or on failure simulator page
  if (!activeScenario || remainingSeconds <= 0 || isOnFailureSimulatorPage) {
    return null;
  }

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const progress = (remainingSeconds / TIMER_DURATION_SECONDS) * 100;

  return (
    <Box
      padding={{ vertical: 's', horizontal: 'l' }}
      margin={{ bottom: 's' }}
    >
      <div style={{
        background: 'linear-gradient(90deg, #ff9900 0%, #ffb84d 100%)',
        borderRadius: '8px',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px',
      }}>
        <SpaceBetween direction="horizontal" size="m" alignItems="center">
          <Box color="text-status-warning" fontWeight="bold">
            ⚠️ Active Failure:
          </Box>
          <Box fontWeight="bold" color="text-status-warning">
            {activeScenario.name}
          </Box>
        </SpaceBetween>
        
        <SpaceBetween direction="horizontal" size="m" alignItems="center">
          <Box>
            <SpaceBetween direction="horizontal" size="xs" alignItems="center">
              <Box variant="small">Auto-disable in:</Box>
              <Box fontSize="heading-m" fontWeight="bold">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </Box>
            </SpaceBetween>
            <div style={{ width: '150px', marginTop: '4px' }}>
              <ProgressBar value={progress} variant="standalone" />
            </div>
          </Box>
          
          <Button
            variant="link"
            onClick={() => navigate('/crm/failure-simulator')}
          >
            Manage →
          </Button>
        </SpaceBetween>
      </div>
    </Box>
  );
};

export default FailureTimerBanner;
