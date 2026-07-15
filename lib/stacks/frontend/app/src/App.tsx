import { useAuthenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import "@cloudscape-design/global-styles/index.css";
import Spinner from "@cloudscape-design/components/spinner";
import { I18nProvider } from "@cloudscape-design/components/i18n";

// Detect embed mode (iframe) and add class to body
if (new URLSearchParams(window.location.search).get('embed') === 'true') {
    document.body.classList.add('embed-mode');
}
import messages from "@cloudscape-design/components/i18n/messages/all.en";
import "@cloudscape-design/global-styles/index.css";
import { Amplify } from "aws-amplify";
import { fetchAuthSession } from "aws-amplify/auth";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { FlashbarProvider } from "./common/contexts/Flashbar";
import { ThemeProvider } from "./common/contexts/ThemeContext";
import { ErrorBoundary } from "./common/components";
import Error from "./pages/Error";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import CRM from "./pages/CRM";
import Landing from "./pages/Landing";
import UseCase from "./pages/UseCase";

const LOCALE = "en";

const currentOrigin = window.location.origin;

const apiConfig = {
    headers: async () => {
        return {
            Authorization: (await fetchAuthSession()).tokens?.idToken?.toString() ?? "",
        };
    },
};

Amplify.configure(
    {
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
    },
    {
        API: {
            REST: apiConfig,
            GraphQL: {
                headers: async () => {
                    const session = await fetchAuthSession();
                    return {
                        Authorization: session.tokens?.idToken?.toString() ?? "",
                    };
                },
            },
        },
    }
);

export default function App() {
    const { authStatus } = useAuthenticator((context) => [context.authStatus]);

    const router = createBrowserRouter([
        {
            path: "/",
            element: <Landing />,
            errorElement: <Error />,
        },
        {
            path: "/usecase",
            element: <UseCase />,
            errorElement: <Error />,
        },
        {
            path: "/crm/*",
            element: <CRM />,
            errorElement: <Error />,
        },
        {
            path: "*",
            element: <NotFound />,
        },
    ]);

    return (
        <ErrorBoundary>
            <ThemeProvider>
                <div>
                    {authStatus === "configuring" && <Spinner />}
                    {authStatus === "unauthenticated" && <Login />}
                    {authStatus === "authenticated" && (
                        <>
                            <I18nProvider locale={LOCALE} messages={[messages]}>
                                <FlashbarProvider>
                                    <RouterProvider router={router} />
                                </FlashbarProvider>
                            </I18nProvider>
                        </>
                    )}
                </div>
            </ThemeProvider>
        </ErrorBoundary>
    );
}
