/**
 * Real-time Failure Events Subscription Hook
 * 
 * Uses AppSync GraphQL subscriptions to receive failure events in real-time.
 */

import { useState, useEffect, useCallback } from 'react';
import { generateClient } from 'aws-amplify/api';
import { FailureEvent } from './types';

// Use userPool auth mode for Cognito-authenticated subscriptions
const client = generateClient({ authMode: 'userPool' });

const SUBSCRIPTION_QUERY = `
  subscription OnFailureEvent {
    onFailureEvent {
      id
      timestamp
      scenarioType
      errorType
      errorMessage
      service
      correlationId
      rawMessage
    }
  }
`;

interface SubscriptionData {
  onFailureEvent: {
    id: string;
    timestamp: number;
    scenarioType: string;
    errorType: string;
    errorMessage: string;
    service?: string;
    correlationId?: string;
    rawMessage?: string;
  };
}

interface UseFailureEventsSubscriptionResult {
  events: FailureEvent[];
  isConnected: boolean;
  error: string | null;
  clearEvents: () => void;
}

export function useFailureEventsSubscription(
  maxEvents: number = 100
): UseFailureEventsSubscriptionResult {
  const [events, setEvents] = useState<FailureEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;

    const setupSubscription = () => {
      try {
        // In Amplify v6, graphql() returns an Observable for subscriptions
        const observable = client.graphql({ query: SUBSCRIPTION_QUERY });
        
        // Type assertion for subscription observable
        subscription = (observable as unknown as { subscribe: (handlers: {
          next: (value: { data: SubscriptionData }) => void;
          error: (err: Error) => void;
        }) => { unsubscribe: () => void } }).subscribe({
          next: ({ data }) => {
            if (data?.onFailureEvent) {
              const event = data.onFailureEvent;
              const failureEvent: FailureEvent = {
                id: event.id,
                timestamp: event.timestamp * 1000, // Convert to milliseconds
                scenarioType: event.scenarioType,
                errorType: event.errorType,
                errorMessage: event.errorMessage,
                service: event.service,
                correlationId: event.correlationId,
                rawMessage: event.rawMessage,
              };
              setEvents((prev) => [failureEvent, ...prev].slice(0, maxEvents));
            }
          },
          error: (err: Error) => {
            console.error('Subscription error:', err);
            setError(err.message || 'Subscription failed');
            setIsConnected(false);
          },
        });

        setIsConnected(true);
        setError(null);
      } catch (err) {
        console.error('Failed to setup subscription:', err);
        setError(err instanceof Error ? err.message : 'Failed to connect');
        setIsConnected(false);
      }
    };

    setupSubscription();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [maxEvents]);

  return { events, isConnected, error, clearEvents };
}

export default useFailureEventsSubscription;
