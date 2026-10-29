/**
 * Standalone CRM entry point — renders CRM pages without Tailwind CSS.
 * Used by the iframe in the UseCase page to avoid Tailwind/Cloudscape conflicts.
 */
import React from "react";
import ReactDOM from "react-dom/client";
import "@aws-amplify/ui-react/styles.css";
import "@cloudscape-design/global-styles/index.css";
import { I18nProvider } from "@cloudscape-design/components/i18n";
import messages from "@cloudscape-design/components/i18n/messages/all.en";
import { Authenticator } from "@aws-amplify/ui-react";
import { Amplify } from "aws-amplify";
import { fetchAuthSession } from "aws-amplify/auth";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import CRM from "./pages/CRM";

const currentOrigin = window.location.origin;

Amplify.configure({
    Auth: {
        Cognito: {
            userPoolId: import.meta.env.VITE_USER_POOL_ID,
            userPoolClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID,
            identityPoolId: import.meta.env.VITE_IDENTITY_POOL_ID,
            allowGuestAccess: false,
            loginWith: {
                oauth: {
                    domain: import.meta.env.VITE_USER_POOL_DOMAIN_URL,
                    scopes: ["openid"],
                    redirectSignIn: [currentOrigin],
                    redirectSignOut: [currentOrigin],
                    responseType: "code",
                },
            },
        },
    },
    API: {
        REST: {
            restApi: {
                endpoint: String(import.meta.env.VITE_REST_API_URL).slice(0, -1),
            },
        },
        GraphQL: {
            endpoint: import.meta.env.VITE_APPSYNC_API_URL,
            region: import.meta.env.VITE_REGION,
            defaultAuthMode: "userPool",
        },
    },
}, {
    API: {
        REST: {
            headers: async () => ({
                Authorization: (await fetchAuthSession()).tokens?.idToken?.toString() ?? "",
            }),
        },
        GraphQL: {
            headers: async () => {
                const session = await fetchAuthSession();
                return { Authorization: session.tokens?.idToken?.toString() ?? "" };
            },
        },
    },
});

ReactDOM.createRoot(document.getElementById("crm-root")!).render(
    <React.StrictMode>
        <Authenticator.Provider>
            <I18nProvider locale="en" messages={[messages]}>
                <BrowserRouter basename="/crm-standalone">
                    <Routes>
                        <Route path="/*" element={<CRM />} />
                    </Routes>
                </BrowserRouter>
            </I18nProvider>
        </Authenticator.Provider>
    </React.StrictMode>
);
