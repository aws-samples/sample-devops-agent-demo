import { TopNavigation } from "@cloudscape-design/components";
import { Mode, Density } from "@cloudscape-design/global-styles";
import { getCurrentUser, signOut } from "aws-amplify/auth";
import { useEffect, useState } from "react";
import AboutModal from "./AboutModal.tsx";
import { useTheme, COLOR_THEMES, ColorTheme } from "../../../contexts/ThemeContext";

const APP_NAME = "AnyCompany CRM";
const CRM_LOGO = "/crm/branding/logo-320.png";

const TopBar = () => {
    const { mode, density, colorTheme, toggleMode, toggleDensity, setColorTheme } = useTheme();

    const [email, setEmail] = useState<string>("");
    const [showAboutModal, setShowAboutModal] = useState(false);

    useEffect(() => {
        const getEmail = async () => {
            const user = await getCurrentUser();
            if (user.username.startsWith("Amazon")) {
                setEmail(`${user.username.split("_")[1]}@amazon.com`);
            } else {
                setEmail(user.signInDetails?.loginId || user.username);
            }
        };
        getEmail();
    }, []);

    const colorThemeItems = (Object.keys(COLOR_THEMES) as ColorTheme[]).map((key) => ({
        id: `color-${key}`,
        text: `${colorTheme === key ? '● ' : '○ '}${COLOR_THEMES[key].name}`,
    }));

    const currentThemeConfig = COLOR_THEMES[colorTheme];

    return (
        <div
            style={{
                borderBottom: `3px solid ${currentThemeConfig.primaryColor}`,
            }}
        >
            <TopNavigation
                identity={{
                    href: "/",
                    title: APP_NAME,
                    logo: {
                        src: CRM_LOGO,
                        alt: APP_NAME,
                    },
                }}
                utilities={[
                    {
                        type: "menu-dropdown",
                        iconName: "settings",
                        ariaLabel: "Settings",
                        title: "Settings",
                        onItemClick: ({ detail }) => {
                            if (detail.id === "switch-theme") {
                                toggleMode();
                            } else if (detail.id === "switch-density") {
                                toggleDensity();
                            } else if (detail.id.startsWith("color-")) {
                                const theme = detail.id.replace("color-", "") as ColorTheme;
                                setColorTheme(theme);
                            } else if (detail.id === "about") {
                                setShowAboutModal(true);
                            }
                        },
                        items: [
                            {
                                id: "switch-theme",
                                text: mode === Mode.Light ? "🌑  Dark Mode" : "☀️  Light Mode",
                            },
                            {
                                id: "switch-density",
                                text: density === Density.Comfortable ? "📐  Compact View" : "📏  Comfortable View",
                            },
                            {
                                id: "color-themes",
                                text: "🎨  Color Theme",
                                items: colorThemeItems,
                            },
                            {
                                id: "about",
                                text: "About",
                            },
                        ],
                    },
                    {
                        type: "menu-dropdown",
                        text: email || "User",
                        iconName: "user-profile",
                        items: [
                            {
                                id: "user",
                                text: email,
                                items: [{ id: "signout", text: "Sign out" }],
                            },
                        ],
                        onItemClick: async ({ detail }) => {
                            if (detail.id === "signout") {
                                try {
                                    await signOut();
                                } catch (error) {
                                    console.log("Failed to sign out: ", error);
                                }
                            }
                        },
                    },
                ]}
            />
            <AboutModal
                visible={showAboutModal}
                onDismiss={() => setShowAboutModal(false)}
                appName={APP_NAME}
            />
        </div>
    );
};

export default TopBar;
