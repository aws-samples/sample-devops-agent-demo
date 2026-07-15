/**
 * Mock Team Data
 * 
 * This file contains mock data for 12 sales representatives.
 * Team members are referenced by opportunities and accounts as owners.
 */

import { TeamMember } from '../types';

/**
 * 12 sales representatives with realistic performance metrics
 */
export const mockTeamMembers: TeamMember[] = [
  {
    id: 'tm-001',
    name: 'Sarah Chen',
    email: 'sarah.chen@anycompany.com',
    role: 'Account Executive',
    quota: 2000000,
    pipelineValue: 2450000,
    closedWonValue: 1850000,
    quotaAttainment: 92.5,
    winRate: 68,
    opportunityCount: 15,
    avatarUrl: '/avatars/sarah-chen.jpg',
  },
  {
    id: 'tm-002',
    name: 'Marcus Johnson',
    email: 'marcus.johnson@anycompany.com',
    role: 'Sales Manager',
    quota: 2500000,
    pipelineValue: 3100000,
    closedWonValue: 2200000,
    quotaAttainment: 88.0,
    winRate: 72,
    opportunityCount: 18,
    avatarUrl: '/avatars/marcus-johnson.jpg',
  },
  {
    id: 'tm-003',
    name: 'Jennifer Lee',
    email: 'jennifer.lee@anycompany.com',
    role: 'Account Executive',
    quota: 1800000,
    pipelineValue: 2100000,
    closedWonValue: 1650000,
    quotaAttainment: 91.7,
    winRate: 65,
    opportunityCount: 14,
    avatarUrl: '/avatars/jennifer-lee.jpg',
  },
  {
    id: 'tm-004',
    name: 'David Kim',
    email: 'david.kim@anycompany.com',
    role: 'Sales Rep',
    quota: 1500000,
    pipelineValue: 1750000,
    closedWonValue: 1200000,
    quotaAttainment: 80.0,
    winRate: 58,
    opportunityCount: 12,
    avatarUrl: '/avatars/david-kim.jpg',
  },
  {
    id: 'tm-005',
    name: 'Elena Rodriguez',
    email: 'elena.rodriguez@anycompany.com',
    role: 'Account Executive',
    quota: 2000000,
    pipelineValue: 2650000,
    closedWonValue: 1950000,
    quotaAttainment: 97.5,
    winRate: 75,
    opportunityCount: 16,
    avatarUrl: '/avatars/elena-rodriguez.jpg',
  },
  {
    id: 'tm-006',
    name: 'James Wilson',
    email: 'james.wilson@anycompany.com',
    role: 'Sales Rep',
    quota: 1500000,
    pipelineValue: 1600000,
    closedWonValue: 1100000,
    quotaAttainment: 73.3,
    winRate: 55,
    opportunityCount: 11,
    avatarUrl: '/avatars/james-wilson.jpg',
  },
  {
    id: 'tm-007',
    name: 'Aisha Mohammed',
    email: 'aisha.mohammed@anycompany.com',
    role: 'Account Executive',
    quota: 2000000,
    pipelineValue: 2300000,
    closedWonValue: 1750000,
    quotaAttainment: 87.5,
    winRate: 70,
    opportunityCount: 13,
    avatarUrl: '/avatars/aisha-mohammed.jpg',
  },
  {
    id: 'tm-008',
    name: 'Michael Brown',
    email: 'michael.brown@anycompany.com',
    role: 'Sales Rep',
    quota: 1500000,
    pipelineValue: 1850000,
    closedWonValue: 1350000,
    quotaAttainment: 90.0,
    winRate: 62,
    opportunityCount: 13,
    avatarUrl: '/avatars/michael-brown.jpg',
  },
  {
    id: 'tm-009',
    name: 'Sophia Anderson',
    email: 'sophia.anderson@anycompany.com',
    role: 'Account Executive',
    quota: 2000000,
    pipelineValue: 2550000,
    closedWonValue: 1900000,
    quotaAttainment: 95.0,
    winRate: 73,
    opportunityCount: 14,
    avatarUrl: '/avatars/sophia-anderson.jpg',
  },
  {
    id: 'tm-010',
    name: 'Carlos Martinez',
    email: 'carlos.martinez@anycompany.com',
    role: 'Sales Rep',
    quota: 1500000,
    pipelineValue: 1550000,
    closedWonValue: 1050000,
    quotaAttainment: 70.0,
    winRate: 52,
    opportunityCount: 10,
    avatarUrl: '/avatars/carlos-martinez.jpg',
  },
  {
    id: 'tm-011',
    name: 'Lisa Wang',
    email: 'lisa.wang@anycompany.com',
    role: 'Account Executive',
    quota: 2000000,
    pipelineValue: 2400000,
    closedWonValue: 1800000,
    quotaAttainment: 90.0,
    winRate: 68,
    opportunityCount: 15,
    avatarUrl: '/avatars/lisa-wang.jpg',
  },
  {
    id: 'tm-012',
    name: 'Ahmed Hassan',
    email: 'ahmed.hassan@anycompany.com',
    role: 'Sales Rep',
    quota: 1500000,
    pipelineValue: 1700000,
    closedWonValue: 1250000,
    quotaAttainment: 83.3,
    winRate: 60,
    opportunityCount: 12,
    avatarUrl: '/avatars/ahmed-hassan.jpg',
  },
];

/**
 * Helper function to get a team member by ID
 */
export const getTeamMemberById = (id: string): TeamMember | undefined => {
  return mockTeamMembers.find(member => member.id === id);
};

/**
 * Helper function to get a team member by name
 */
export const getTeamMemberByName = (name: string): TeamMember | undefined => {
  return mockTeamMembers.find(member => member.name === name);
};
