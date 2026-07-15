# AnyCompany CRM - Sales Opportunity Management Platform

## Overview

AnyCompany CRM is a modern, enterprise-grade sales opportunity management platform built with React, TypeScript, and AWS Cloudscape Design System. This platform represents the **"before BigWeaver"** state - a fully functional CRM system that is intentionally missing email automation features.

## Purpose

This platform serves as the base application for demonstrating SuperAgents capabilities, specifically showcasing **BigWeaver's ability to add cross-repository features**. The platform is production-ready and feature-complete, except for email automation functionality that BigWeaver will add across multiple repositories.

## Current Features (Before BigWeaver)

### ✅ Pipeline Dashboard
- **Stage Metrics**: Visual cards showing Open Pipeline, New, Won, Lost, Overdue opportunities
- **Advanced Filtering**: Filter by date range, stage, owner, forecast category
- **Search**: Full-text search across opportunity names, accounts, and owners
- **Sortable Table**: Sort by any column (amount, close date, stage, etc.)
- **Real-time Metrics**: Automatically calculated pipeline health indicators

### ✅ Account Management
- **Account Health Tracking**: Green/Yellow/Red health indicators based on activity
- **Industry Segmentation**: Filter accounts by Technology, Healthcare, Finance, Retail, Manufacturing
- **View Modes**: Toggle between card and table views
- **Related Opportunities**: Click any account to see associated opportunities
- **Account Metrics**: Annual revenue, employee count, total opportunity value

### ✅ My Opportunities
- **Personal Pipeline**: Filter opportunities by current user
- **Quota Attainment**: Visual progress bar showing quota achievement
- **Weighted Forecast**: Probability-adjusted pipeline value
- **Overdue Alerts**: Automatic highlighting of opportunities past close date
- **Personal Metrics**: Pipeline value, closed won, win rate

### ✅ Team Performance
- **Team Metrics**: Aggregate pipeline value, win rate, average deal size
- **Individual Rep Cards**: Performance metrics for each team member
- **Performance Charts**: Pipeline trends and win rate visualizations
- **Time Period Filtering**: View metrics by quarter, month, or year
- **Quota Tracking**: Team-wide and individual quota attainment

### ✅ Responsive Design
- **Mobile Optimized**: Full functionality on phones and tablets
- **Adaptive Layouts**: Automatically adjusts to screen size
- **Touch-Friendly**: Optimized for touch interactions
- **Horizontal Scrolling**: Tables scroll on small screens

### ✅ Performance Optimized
- **Fast Load Times**: < 2 second page loads
- **Instant Filtering**: < 500ms filter response
- **Memoized Calculations**: Optimized re-renders
- **Debounced Search**: Smooth search experience

## Missing Features (BigWeaver Will Add)

### ❌ Email Automation
The following features are **intentionally missing** to demonstrate BigWeaver's cross-repo capabilities:

1. **Email Templates** (Web Frontend Repo)
   - Template management UI
   - Template editor with variables
   - Template preview functionality

2. **Email Sending** (Email Service Repo)
   - Send emails from opportunities
   - Automated follow-up emails based on stage
   - Email scheduling and queuing

3. **Email Tracking** (Notification Service Repo)
   - Email open tracking
   - Click tracking
   - Activity timeline integration

4. **Email Analytics** (Analytics Engine Repo)
   - Email performance metrics
   - Response rate tracking
   - A/B testing results

5. **Email Reminders** (Notification Service Repo)
   - Automated reminder emails
   - Overdue opportunity alerts
   - Follow-up scheduling

6. **Shared Email Components** (Shared UI Components Repo)
   - Email composer widget
   - Email activity feed
   - Email template selector

## Technology Stack

### Frontend
- **React 18+**: Modern component-based UI
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and dev server
- **React Router**: Client-side routing

### UI Framework
- **AWS Cloudscape Design System**: Enterprise-grade components
- **Cloudscape Charts**: Data visualization
- **Responsive Grid**: Mobile-first layouts

### State Management
- **React Context**: Global state management
- **Local State**: Component-level state with hooks
- **No Redux**: Simplified state management

### Data & Utilities
- **date-fns**: Date formatting and manipulation
- **Mock Data**: Realistic CRM data for demo

## Project Structure

```
src/
├── pages/
│   └── CRM/
│       ├── PipelinePage.tsx          # Main pipeline dashboard
│       ├── AccountsPage.tsx          # Account management
│       ├── MyOpportunitiesPage.tsx   # Personal pipeline
│       ├── TeamPerformancePage.tsx   # Team metrics
│       ├── components/
│       │   ├── pipeline/             # Pipeline components
│       │   ├── accounts/             # Account components
│       │   ├── team/                 # Team components
│       │   ├── shared/               # Shared components
│       │   └── layout/               # Layout components
│       ├── data/
│       │   ├── mockOpportunities.ts  # 150 opportunities
│       │   ├── mockAccounts.ts       # 75 accounts
│       │   └── mockTeamData.ts       # 12 team members
│       ├── utils/
│       │   ├── formatters.ts         # Currency, date formatting
│       │   ├── calculations.ts       # Pipeline metrics
│       │   └── filters.ts            # Filtering logic
│       ├── context/
│       │   └── CRMContext.tsx        # CRM state management
│       └── types.ts                  # TypeScript interfaces
├── common/
│   └── components/                   # Shared app components
└── App.tsx                           # Root component
```

## Data Models

### Opportunity
- ID, name, account reference
- Amount, close date, stage
- Next step, recent activity
- Forecast category, probability
- Owner reference

### Account
- ID, name, domain, industry
- Annual revenue, employee count
- Health status, health score
- Owner reference
- Opportunity count and total value

### Team Member
- ID, name, email, role
- Quota, pipeline value
- Closed won value, win rate
- Quota attainment percentage

## Mock Data

The platform includes realistic mock data for demo purposes:

- **150 Opportunities**: Distributed across all stages with realistic amounts ($10K - $500K)
- **75 Accounts**: Across 5 industries with realistic company names
- **12 Team Members**: Sales reps and managers with performance metrics
- **Consistent Relationships**: Opportunities link to accounts, accounts link to owners

All data represents **AnyCompany CRM FY25 Q2** performance.

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Modern web browser

### Installation

```bash
# Install dependencies
npm install

# Start dev server
npm run -w frontend dev

# Build for production
npm run -w frontend build

# Preview production build
npm run -w frontend preview
```

### Development

```bash
# Run dev server (http://localhost:5173)
npm run -w frontend dev

# Run tests
npm run -w frontend test

# Run linter
npm run -w frontend lint

# Type check
npm run -w frontend type-check
```

## Demo Preparation

See [DEMO-PREPARATION.md](./DEMO-PREPARATION.md) for comprehensive demo preparation checklist and talking points.

### Quick Demo Flow

1. **Pipeline Dashboard**: Show filtering, search, and stage metrics
2. **Accounts Page**: Demonstrate health tracking and industry filtering
3. **My Opportunities**: Highlight quota attainment and overdue alerts
4. **Team Performance**: Show team metrics and performance charts
5. **Transition**: "Now let's see BigWeaver add email automation across 3 repos..."

## BigWeaver Integration Points

When BigWeaver adds email automation, it will modify these areas:

### Web Frontend (This Repo)
- Add email template management UI
- Add email composer component
- Add email activity timeline
- Add email settings page

### Email Service (New Repo)
- Create email sending service
- Implement template rendering
- Add email queue management
- Implement delivery tracking

### Notification Service (New Repo)
- Create reminder scheduling
- Implement email triggers
- Add activity logging
- Create notification preferences

### API Gateway (Existing Repo)
- Add email endpoints
- Implement authentication
- Add rate limiting
- Create webhook handlers

### Analytics Engine (New Repo)
- Track email opens/clicks
- Calculate response rates
- Generate email reports
- A/B test tracking

### Shared UI Components (New Repo)
- Email composer widget
- Email activity feed
- Email template selector
- Email preview component

## Architecture

### Current Architecture (Before BigWeaver)
```
┌─────────────────────────────────────┐
│     AnyCompany CRM Web App          │
│   (React + TypeScript + Vite)       │
├─────────────────────────────────────┤
│  Pipeline | Accounts | Team | My    │
│  Dashboard  Management  Perf  Opps  │
├─────────────────────────────────────┤
│     Shared Components Layer         │
│  (Tables, Cards, Filters, Charts)   │
├─────────────────────────────────────┤
│      Data Management Layer          │
│   (Mock Data, State, Utils)         │
└─────────────────────────────────────┘
```

### Future Architecture (After BigWeaver)
```
┌─────────────────────────────────────┐
│     AnyCompany CRM Web App          │
│   + Email Template UI               │
├─────────────────────────────────────┤
│         API Gateway                 │
│   + Email Endpoints                 │
├─────────────────────────────────────┤
│  ┌──────────┐  ┌──────────────┐    │
│  │  Email   │  │ Notification │    │
│  │ Service  │  │   Service    │    │
│  └──────────┘  └──────────────┘    │
├─────────────────────────────────────┤
│      Analytics Engine               │
│   + Email Tracking                  │
└─────────────────────────────────────┘
```

## Performance Targets

- ✅ Page load time: < 2 seconds
- ✅ Filter response: < 500ms
- ✅ Search response: < 300ms (debounced)
- ✅ Table sorting: Instant
- ✅ Navigation: Instant

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Accessibility

- WCAG 2.1 AA compliant
- Keyboard navigation support
- Screen reader compatible
- Proper ARIA labels
- Color contrast compliant

## Contributing

This is a demo platform. For production use, consider:

1. Replace mock data with real API calls
2. Add authentication and authorization
3. Implement data persistence
4. Add comprehensive error handling
5. Implement audit logging
6. Add data validation
7. Implement rate limiting
8. Add monitoring and alerting

## License

Apache License Version 2.0

## Support

For questions or issues, contact the AWS Technical Product Marketing team.

---

**Remember**: This platform is intentionally missing email automation features. That's the whole point - to demonstrate BigWeaver's ability to add cross-repository features!
