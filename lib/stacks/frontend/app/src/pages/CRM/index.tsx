import React from "react";
// Individual imports to avoid Cloudscape circular dependency issues with barrel exports
import BreadcrumbGroup from "@cloudscape-design/components/breadcrumb-group";
import ContentLayout from "@cloudscape-design/components/content-layout";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { useLocation, useNavigate, Routes, Route } from "react-router-dom";
import Layout from "../../common/components/Layout";
import { ErrorBoundary } from "../../common/components";
import CRMNavigation from "./components/layout/CRMNavigation";
import { CRMProvider } from "./context/CRMContext";
import { FailureTimerProvider } from "./context/FailureTimerContext";
import PipelinePage from "./PipelinePage";
import AccountsPage from "./AccountsPage";
import MyOpportunitiesPage from "./MyOpportunitiesPage";
import TeamPerformancePage from "./TeamPerformancePage";
import FailureSimulatorPage from "./FailureSimulatorPage";
import CloudWatchPage from "./CloudWatchPage";
import ServiceNowPage from "./ServiceNowPage";
import CrossViewPage from "./CrossViewPage";

const CRM = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const getBreadcrumbs = () => {
        const pathSegments = location.pathname.split('/').filter(Boolean);
        const breadcrumbs = [
            { text: "Home", href: "/" },
            { text: "AnyCompany CRM", href: "/crm" }
        ];

        if (pathSegments.length > 1) {
            const page = pathSegments[1];
            switch (page) {
                case 'pipeline':
                    breadcrumbs.push({ text: "Pipeline", href: "/crm/pipeline" });
                    break;
                case 'accounts':
                    breadcrumbs.push({ text: "Accounts", href: "/crm/accounts" });
                    break;
                case 'my-opportunities':
                    breadcrumbs.push({ text: "My Opportunities", href: "/crm/my-opportunities" });
                    break;
                case 'team':
                    breadcrumbs.push({ text: "Team Performance", href: "/crm/team" });
                    break;
                case 'failure-simulator':
                    breadcrumbs.push({ text: "Failure Simulator", href: "/crm/failure-simulator" });
                    break;
                case 'cloudwatch':
                    breadcrumbs.push({ text: "CloudWatch", href: "/crm/cloudwatch" });
                    break;
                case 'servicenow':
                    breadcrumbs.push({ text: "ServiceNow", href: "/crm/servicenow" });
                    break;
                case 'cross-view':
                    breadcrumbs.push({ text: "Cross View", href: "/crm/cross-view" });
                    break;
                default:
                    breadcrumbs.push({ text: page, href: location.pathname });
            }
        }

        return breadcrumbs;
    };

    const isCrossView = location.pathname === '/crm' || location.pathname === '/crm/cross-view';

    return (
        <FailureTimerProvider>
            <CRMProvider>
                <Layout
                    navigation={<CRMNavigation />}
                    breadcrumbs={
                        !isCrossView ? (
                            <BreadcrumbGroup
                                items={getBreadcrumbs()}
                                onFollow={(event) => {
                                    event.preventDefault();
                                    navigate(event.detail.href);
                                }}
                            />
                        ) : undefined
                    }
                    content={
                        isCrossView ? (
                            <ErrorBoundary>
                                <CrossViewPage />
                            </ErrorBoundary>
                        ) : (
                            <ContentLayout>
                                <SpaceBetween size="l">
                                    <ErrorBoundary>
                                        <Routes>
                                            <Route index element={<CrossViewPage />} />
                                            <Route path="pipeline" element={<PipelinePage />} />
                                            <Route path="accounts" element={<AccountsPage />} />
                                            <Route path="my-opportunities" element={<MyOpportunitiesPage />} />
                                            <Route path="team" element={<TeamPerformancePage />} />
                                            <Route path="failure-simulator" element={<FailureSimulatorPage />} />
                                            <Route path="cloudwatch" element={<CloudWatchPage />} />
                                            <Route path="servicenow" element={<ServiceNowPage />} />
                                            <Route path="cross-view" element={<CrossViewPage />} />
                                        </Routes>
                                    </ErrorBoundary>
                                </SpaceBetween>
                            </ContentLayout>
                        )
                    }
                />
            </CRMProvider>
        </FailureTimerProvider>
    );
};

export default CRM;
