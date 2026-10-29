/**
 * Post-login landing page — uses the LandingPageSplit template
 * with the DevOps Agent branding.
 */
import { useNavigate } from "react-router-dom";
import { LandingPageSplit } from "@/pages/LandingPageSplit";

export default function Landing() {
    const navigate = useNavigate();

    return (
        <LandingPageSplit
            tagline="Autonomous Incident Response"
            title="AWS DevOps Agent Demo"
            description="An AI-powered DevOps agent that automatically investigates incidents, performs root cause analysis, and executes remediation — reducing MTTR from hours to minutes."
            ctaLabel="Learn More →"
            onCtaClick={() => navigate("/usecase")}
            backgroundUrl="/backgrounds/devopsagent.mp4"
            backgroundType="video"
            logoUrl="/logos/logo.svg"
            logoUrlDark="/logos/logo-white.svg"
        />
    );
}
