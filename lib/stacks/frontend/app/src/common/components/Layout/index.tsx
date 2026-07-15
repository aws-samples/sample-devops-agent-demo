import "@aws-amplify/ui-react/styles.css";
// Individual imports to avoid Cloudscape circular dependency issues with barrel exports
import AppLayout, { AppLayoutProps } from "@cloudscape-design/components/app-layout";
import Flashbar from "@cloudscape-design/components/flashbar";
import "@cloudscape-design/global-styles/index.css";
import { useContext, useState } from "react";
import { FlashbarContext } from "../../contexts/Flashbar";
import SideBar from "./SideBar";
import TopBar from "./TopBar";

const Layout = (props: AppLayoutProps) => {
    const isEmbed = new URLSearchParams(window.location.search).get('embed') === 'true';
    const [navigationOpen, setNavigationOpen] = useState<boolean>(isEmbed);
    const { flashbarItems, removeFlashbarItem } = useContext(FlashbarContext);

    return (
        <>
            <TopBar />
            <AppLayout
                navigation={<SideBar />}
                navigationOpen={navigationOpen}
                onNavigationChange={({ detail }) => setNavigationOpen(detail.open)}
                notifications={
                    <Flashbar
                        items={flashbarItems.map((item, index) => ({
                            type: item.type,
                            dismissible: true,
                            dismissLabel: "Dismiss",
                            onDismiss: () => removeFlashbarItem(index),
                            content: item.content,
                        }))}
                    />
                }
                stickyNotifications
                toolsHide={true}
                contentType="cards"
                {...props}
            />
        </>
    );
};

export default Layout;
