import { Badge, SideNavigation } from "@cloudscape-design/components";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { mockOpportunities } from "../../data/mockOpportunities";
import { formatCurrency } from "../../utils/formatters";

interface CRMNavigationProps {
    activeHref?: string;
}

const CRMNavigation = ({ activeHref: propActiveHref }: CRMNavigationProps) => {
    const location = useLocation();
    const navigate = useNavigate();
    const [activeHref, setActiveHref] = useState(propActiveHref || location.pathname);

    useEffect(() => {
        setActiveHref(location.pathname);
    }, [location.pathname]);

    // Calculate opportunity count and pipeline value
    const opportunityCount = mockOpportunities.length;
    const pipelineValue = mockOpportunities
        .filter(opp => opp.stage !== 'Closed Won' && opp.stage !== 'Closed Lost')
        .reduce((sum, opp) => sum + opp.amount, 0);

    const handleNavigationChange = (event: any) => {
        if (!event.detail.external) {
            event.preventDefault();
            const href = event.detail.href;
            setActiveHref(href);
            navigate(href);
        }
    };

    return (
        <SideNavigation
            header={{
                text: "AnyCompany CRM",
                href: "/crm"
            }}
            activeHref={activeHref}
            onFollow={handleNavigationChange}
            items={[
                {
                    type: "section" as const,
                    text: "App",
                    items: [
                        {
                            type: "link" as const,
                            text: "Pipeline",
                            href: "/crm/pipeline",
                            info: <Badge color="blue">{opportunityCount}</Badge>
                        },
                        {
                            type: "link" as const,
                            text: "Accounts",
                            href: "/crm/accounts",
                        },
                        {
                            type: "link" as const,
                            text: "My Opportunities",
                            href: "/crm/my-opportunities",
                        },
                        {
                            type: "link" as const,
                            text: "Team Performance",
                            href: "/crm/team",
                        },
                        { type: "divider" as const },
                        {
                            type: "link" as const,
                            text: `Pipeline Value: ${formatCurrency(pipelineValue)}`,
                            href: "#",
                            info: <Badge color="green">Live</Badge>
                        }
                    ]
                },
                { type: "divider" as const },
                {
                    type: "section" as const,
                    text: "DevOps Agent",
                    items: [
                        {
                            type: "link" as const,
                            text: "Failure Simulator",
                            href: "/crm",
                        },
                    ]
                }
            ]}
        />
    );
};

export default CRMNavigation;
