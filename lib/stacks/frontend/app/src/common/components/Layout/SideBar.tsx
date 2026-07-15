import "@aws-amplify/ui-react/styles.css";
import SideNavigation from "@cloudscape-design/components/side-navigation";
import "@cloudscape-design/global-styles/index.css";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const SideBar = () => {
    const location = useLocation();
    const [activeHref, setActiveHref] = useState(location.pathname);
    const navigate = useNavigate();

    useEffect(() => {
        setActiveHref(location.pathname);
    }, [location.pathname]);

    return (
        <SideNavigation
            header={{
                text: "AnyCompany CRM",
                href: "/crm"
            }}
            activeHref={activeHref}
            onFollow={(event) => {
                if (!event.detail.external) {
                    event.preventDefault();
                    setActiveHref(event.detail.href);
                    navigate(event.detail.href);
                }
            }}
            items={[
                {
                    type: "section" as const,
                    text: "Sales",
                    items: [
                        {
                            type: "link" as const,
                            text: "Pipeline",
                            href: "/crm/pipeline",
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
                        }
                    ]
                },
                { type: "divider" as const },
                {
                    type: "link" as const,
                    text: "GitLab",
                    href: "https://gitlab.aws.dev/genai-labs/templates/demo-starter-kit",
                    external: true,
                },
            ]}
        />
    );
};

export default SideBar;
