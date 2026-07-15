/**
 * API Service
 * 
 * Service layer for making API calls to the CRM backend.
 * Uses AWS Amplify REST API client with automatic authentication.
 */

import { get } from 'aws-amplify/api';
import { Opportunity } from '../pages/CRM/types';

/**
 * Fetch all opportunities from the API
 * 
 * @param accountId - Optional account ID to filter opportunities
 * @returns Promise resolving to array of opportunities
 */
export async function fetchOpportunities(accountId?: string): Promise<Opportunity[]> {
  try {
    const path = accountId 
      ? `/opportunities?accountId=${accountId}` 
      : '/opportunities';
    
    const restOperation = get({
      apiName: 'restApi',
      path,
    });

    const response = await restOperation.response;
    const data = await response.body.json();
    
    // Parse date strings back to Date objects
    const opportunities = (data as any[]).map(opp => ({
      ...opp,
      closeDate: new Date(opp.closeDate),
      recentActivityDate: new Date(opp.recentActivityDate),
      createdDate: new Date(opp.createdDate),
      lastModifiedDate: new Date(opp.lastModifiedDate),
    }));
    
    return opportunities;
  } catch (error) {
    console.error('Error fetching opportunities:', error);
    throw new Error('Failed to fetch opportunities from API');
  }
}

/**
 * Search opportunities using full-text search
 * 
 * @param searchQuery - Search query string
 * @param accountId - Optional account ID to filter opportunities
 * @returns Promise resolving to array of opportunities with relevance scores
 */
export async function searchOpportunities(searchQuery: string, accountId?: string): Promise<Opportunity[]> {
  try {
    if (!searchQuery.trim()) {
      return [];
    }

    const params = new URLSearchParams();
    params.append('q', searchQuery.trim());
    if (accountId) {
      params.append('accountId', accountId);
    }
    
    const path = `/opportunities/search?${params.toString()}`;
    
    const restOperation = get({
      apiName: 'restApi',
      path,
    });

    const response = await restOperation.response;
    const data = await response.body.json();
    
    // Parse date strings back to Date objects
    const opportunities = (data as any[]).map(opp => ({
      ...opp,
      closeDate: new Date(opp.closeDate),
      recentActivityDate: new Date(opp.recentActivityDate),
      createdDate: new Date(opp.createdDate),
      lastModifiedDate: new Date(opp.lastModifiedDate),
    }));
    
    return opportunities;
  } catch (error) {
    console.error('Error searching opportunities:', error);
    throw new Error('Failed to search opportunities from API');
  }
}

/**
 * Fetch a single opportunity by ID
 * 
 * @param opportunityId - The opportunity ID
 * @returns Promise resolving to the opportunity or null if not found
 */
export async function fetchOpportunity(opportunityId: string): Promise<Opportunity | null> {
  try {
    const restOperation = get({
      apiName: 'restApi',
      path: `/opportunities/${opportunityId}`,
    });

    const response = await restOperation.response;
    const data = await response.body.json();
    
    if (!data) {
      return null;
    }
    
    // Parse date strings back to Date objects
    return {
      ...data,
      closeDate: new Date(data.closeDate),
      recentActivityDate: new Date(data.recentActivityDate),
      createdDate: new Date(data.createdDate),
      lastModifiedDate: new Date(data.lastModifiedDate),
    } as Opportunity;
  } catch (error) {
    console.error(`Error fetching opportunity ${opportunityId}:`, error);
    throw new Error('Failed to fetch opportunity from API');
  }
}
