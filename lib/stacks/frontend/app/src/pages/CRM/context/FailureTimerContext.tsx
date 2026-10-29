/**
 * Global Failure Timer Context
 * 
 * Provides failure scenario state across all CRM pages.
 * Polls the backend every 30 seconds to sync timer state.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { get } from 'aws-amplify/api';

interface ActiveScenario {
  type: string;
  name: string;
  expiresAt: string;
  remainingSeconds: number;
}

interface FailureTimerContextType {
  activeScenario: ActiveScenario | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const FailureTimerContext = createContext<FailureTimerContextType | undefined>(undefined);

// Map scenario types to display names
const SCENARIO_NAMES: Record<string, string> = {
  snsSubscriptionErrors: 'SNS Subscription Errors',
  lambdaFailedDeployment: 'Lambda Failed Deployment',
  lambdaThrottling: 'Lambda Throttling',
  rdsIndexDrop: 'RDS Index Drop',
};

export const FailureTimerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeScenario, setActiveScenario] = useState<ActiveScenario | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const response = await get({
        apiName: 'restApi',
        path: '/admin/system-status',
      }).response;
      
      const data = await response.body.json() as { 
        scenarios: Record<string, { 
          enabled: boolean; 
          expiresAt?: string; 
          remainingSeconds?: number;
        }> 
      };
      
      if (data?.scenarios) {
        // Find the active scenario
        for (const [type, scenario] of Object.entries(data.scenarios)) {
          if (scenario.enabled && scenario.expiresAt) {
            setActiveScenario({
              type,
              name: SCENARIO_NAMES[type] || type,
              expiresAt: scenario.expiresAt,
              remainingSeconds: scenario.remainingSeconds || 0,
            });
            return;
          }
        }
      }
      // No active scenario found
      setActiveScenario(null);
    } catch (err) {
      console.log('[FailureTimerContext] Error fetching status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch and polling
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  return (
    <FailureTimerContext.Provider value={{ activeScenario, loading, refresh: fetchStatus }}>
      {children}
    </FailureTimerContext.Provider>
  );
};

export const useFailureTimer = (): FailureTimerContextType => {
  const context = useContext(FailureTimerContext);
  if (context === undefined) {
    throw new Error('useFailureTimer must be used within a FailureTimerProvider');
  }
  return context;
};
