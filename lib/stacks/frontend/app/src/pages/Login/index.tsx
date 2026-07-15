// @export {"replace": ", Button, Divider, Flex ", "with": ""}
import { Authenticator, ThemeProvider, Theme } from "@aws-amplify/ui-react";
// @export {"deleteLines": 2}
import { signInWithRedirect } from "aws-amplify/auth";
import { useState, useEffect } from "react";
import Amazicon from "./amazicon.svg";
import "./Login.css";

const MIDWAY_ENABLED = true;

const authTheme: Theme = {
    name: "auth-theme",
    tokens: {
        components: { authenticator: { router: { borderWidth: "0", boxShadow: "none", backgroundColor: "transparent" } } },
        colors: { background: { primary: "transparent" }, font: { primary: "rgba(255,255,255,0.9)" }, brand: { primary: { "80": "#7c3aed", "90": "#6d28d9", "100": "#5b21b6" } } },
    },
};


const Login = () => {
    const [tick, setTick] = useState(0);
    useEffect(() => {
        let f: number;
        const loop = () => { setTick(p => (p + 0.15) % 360); f = requestAnimationFrame(loop); };
        f = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(f);
    }, []);

    const bgGrad = `radial-gradient(ellipse at ${30 + Math.sin(tick * 0.01) * 15}% ${40 + Math.cos(tick * 0.008) * 10}%, rgba(124,58,237,0.15) 0%, transparent 50%), radial-gradient(ellipse at ${70 + Math.cos(tick * 0.012) * 15}% ${60 + Math.sin(tick * 0.009) * 10}%, rgba(14,165,233,0.1) 0%, transparent 50%), linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 30%, #16213e 60%, #0f0f1a 100%)`;

    return (
        <>
            <div style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", background: "#0a0a1a" }}>
                <div style={{ position: "absolute", inset: "-50%", width: "200%", height: "200%", background: bgGrad }} />
            </div>
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, position: "relative", zIndex: 1, width: "100%" }}>
                <div className="login-card" style={{ width: "100%", maxWidth: 420, margin: "0 auto" }}>
                    <div style={{ height: 3, borderRadius: "16px 16px 0 0", background: "linear-gradient(90deg, #7c3aed, #0ea5e9, #7c3aed)", backgroundSize: "200% 100%", animation: "shimmer 3s ease-in-out infinite" }} />
                    <div style={{ background: "rgba(22,22,42,0.95)", borderRadius: "0 0 16px 16px", border: "1px solid rgba(255,255,255,0.08)", borderTop: "none", boxShadow: "0 24px 48px rgba(0,0,0,0.5)", overflow: "hidden", boxSizing: "border-box" }}>
                        <div className="login-branding" style={{ textAlign: "center", padding: "28px 24px 20px" }}>
                            <img src="/favicon.png" alt="AWS DevOps Agent" style={{ width: 44, height: 44, marginBottom: 10 }} />
                            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: "0 0 4px" }}>AWS DevOps Agent</h1>
                            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", margin: 0 }}>Incident Response Demo Platform</p>
                        </div>
                        {MIDWAY_ENABLED && (
                            <div style={{ padding: "0 24px" }}>
                                <button type="button" onClick={() => signInWithRedirect({ provider: { custom: "AmazonFederate" } })} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "11px 16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "#e2e8f0", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
                                    <img src={Amazicon} alt="Amazon" style={{ width: 15 }} />
                                    Sign in with Midway
                                </button>
                                <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "14px 0 4px", color: "rgba(255,255,255,0.25)", fontSize: 12 }}>
                                    <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
                                    <span>OR</span>
                                    <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
                                </div>
                            </div>
                        )}
                        <ThemeProvider theme={authTheme}>
                            <Authenticator hideSignUp={true} variation="default" />
                        </ThemeProvider>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Login;