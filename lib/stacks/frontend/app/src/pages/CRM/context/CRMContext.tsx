import React, { createContext, useContext, useState, ReactNode } from 'react';
import { TeamMember, FilterState } from '../types';
import { mockTeamMembers } from '../data/mockTeamData';

interface CRMContextType {
    currentUser: TeamMember;
    setCurrentUser: (user: TeamMember) => void;
    globalFilters: FilterState;
    setGlobalFilters: (filters: FilterState) => void;
    preferences: UserPreferences;
    setPreferences: (preferences: UserPreferences) => void;
}

interface UserPreferences {
    defaultView: 'table' | 'cards';
    itemsPerPage: number;
    dateFormat: 'relative' | 'absolute';
    currencyFormat: 'USD';
}

const defaultPreferences: UserPreferences = {
    defaultView: 'table',
    itemsPerPage: 50,
    dateFormat: 'relative',
    currencyFormat: 'USD',
};

const defaultFilters: FilterState = {
    dateRange: {
        start: new Date(new Date().getFullYear(), 0, 1), // Start of current year
        end: new Date(new Date().getFullYear(), 11, 31), // End of current year
    },
    stage: [],
    owner: [],
    searchQuery: '',
    forecastCategory: [],
    industry: [],
};

// Default to first sales rep as current user
const defaultUser = mockTeamMembers[0];

const CRMContext = createContext<CRMContextType | undefined>(undefined);

export const CRMProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<TeamMember>(defaultUser);
    const [globalFilters, setGlobalFilters] = useState<FilterState>(defaultFilters);
    const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);

    return (
        <CRMContext.Provider
            value={{
                currentUser,
                setCurrentUser,
                globalFilters,
                setGlobalFilters,
                preferences,
                setPreferences,
            }}
        >
            {children}
        </CRMContext.Provider>
    );
};

export const useCRM = (): CRMContextType => {
    const context = useContext(CRMContext);
    if (context === undefined) {
        throw new Error('useCRM must be used within a CRMProvider');
    }
    return context;
};
