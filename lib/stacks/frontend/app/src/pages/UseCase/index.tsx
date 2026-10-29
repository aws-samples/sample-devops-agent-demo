/**
 * Business Use Case page — paginated into Overview + 4 steps.
 * Two-column layout: text left, visuals right.
 */
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { UseCasePage } from "../UseCasePage";
import { OverviewPage } from "../OverviewPage";
import { Button } from "../../ui/button";
import { ChevronRight, ArrowLeft, RotateCcw, ExternalLink, Shield, Zap, Link2, X, Copy, Check, Info } from "lucide-react";

const CAPS = [
    { Icon: Shield, title: "Always-On Incident Response", desc: "Your autonomous on-call engineer. Investigates the moment an alert fires — 2 AM or peak hours — to reduce MTTR." },
    { Icon: Zap, title: "Proactive Prevention", desc: "Moves teams from reactive firefighting to proactive improvement. Analyzes patterns across incidents." },
    { Icon: Link2, title: "Unified Tool Integration", desc: "Securely integrates with your observability tools, runbooks, code repos, and CI/CD pipelines." },
];
const CRM_PAGES = [
    { id: "accounts", title: "Accounts", desc: "Manage customer accounts and track account health", path: "/crm/accounts" },
    { id: "pipeline", title: "Pipeline", desc: "Sales pipeline visualization and deal tracking", path: "/crm/pipeline" },
    { id: "my-opportunities", title: "My Opportunities", desc: "Track and manage sales opportunities", path: "/crm/my-opportunities" },
    { id: "team", title: "Team Performance", desc: "Team metrics, performance tracking, and export tools", path: "/crm/team" },
];
const STEPS = [
    { n: 1, title: "Explore & Enable Failures" },
    { n: 2, title: "Watch the Agent" },
];

const CopyField = ({ label, value, masked = false }: { label: string; value: string; masked?: boolean }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); };
    return (
        <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground w-20 shrink-0">{label}:</span>
            <code className="bg-muted px-2 py-0.5 rounded font-mono text-[11px] select-all">{masked ? "•••••••••" : value}</code>
            <button onClick={handleCopy} className="p-1 rounded hover:bg-muted cursor-pointer transition-colors" title={`Copy ${label}`}>
                {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
            </button>
        </div>
    );
};

const UseCase = () => {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(0);
    const [showArch, setShowArch] = useState(false);
    const [openPage, setOpenPage] = useState<string | null>(null);
    const [step2Image, setStep2Image] = useState<'crm' | 'crossview'>('crm');

    const idcUsername = import.meta.env.VITE_IDC_USERNAME || "(not configured)";
    const idcPassword = import.meta.env.VITE_IDC_PASSWORD || "(not configured)";

    const [rotationKey, setRotationKey] = useState(0);

    useEffect(() => {
        if (currentStep !== 1) return;
        const timer = setInterval(() => {
            setStep2Image(prev => prev === 'crm' ? 'crossview' : 'crm');
        }, 10000);
        return () => clearInterval(timer);
    }, [currentStep, rotationKey]);
    const handleImageToggle = (view: 'crm' | 'crossview') => {
        setStep2Image(view);
        setRotationKey(k => k + 1);
    };
    const activePage = openPage
        ? (CRM_PAGES.find(p => p.id === openPage) || (openPage === "crossview" ? { id: "crossview", title: "Failure Simulator", desc: "Failure simulation", path: "/crm" } : null))
        : null;
    const closeModal = () => setOpenPage(null);
    const nextLabel = currentStep === 0 ? "Step 1" : currentStep < 2 ? `Step ${currentStep + 1}` : null;

    return (
        <>
        <UseCasePage
            title="AWS DevOps Agent"
            description="Incident Response Demo Platform"
            onArchitectureClick={() => setShowArch(true)}
            headline={currentStep === 0 ? "About This Demo" : `Step ${currentStep}: ${STEPS[currentStep - 1].title}`}
            subtitle={currentStep === 0 ? "Showcase AWS DevOps Agent integration with real failure scenarios." : undefined}
            highlights={null} paragraphs={[]} ctaLabel="" onContinue={() => {}}
            breadcrumb={
                <div className="flex items-center gap-2">
                    <button onClick={() => setCurrentStep(0)} className={`text-xs cursor-pointer ${currentStep === 0 ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}>Overview</button>
                    {STEPS.map((s) => (
                        <div key={s.n} className="flex items-center gap-2">
                            <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
                            <button onClick={() => setCurrentStep(s.n)} className={`text-xs cursor-pointer ${currentStep === s.n ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}>Step {s.n}</button>
                        </div>
                    ))}
                </div>
            }
            bodySlot={
                <div className="flex flex-col flex-1 min-h-0">
                    {/* Two-column layout */}
                    <div className="flex-1 flex gap-8 min-h-0">
                        {/* LEFT: Text */}
                        <div className={`overflow-auto pr-4 space-y-4 relative z-10 ${currentStep === 0 ? 'w-1/4 shrink-0 min-w-[280px]' : currentStep === 2 ? 'w-1/3' : 'w-2/5'}`}>
                            {currentStep === 0 && (<>
                                <p className="text-sm text-muted-foreground leading-relaxed">This demo showcases AWS DevOps Agent — an autonomous incident response system that investigates failures, identifies root causes, and generates mitigation plans in real time.</p>
                                <div className="space-y-3 pt-1">{CAPS.map((c) => (
                                    <div key={c.title} className="rounded-lg border border-border p-3 space-y-1">
                                        <div className="flex items-center gap-2"><c.Icon className="h-3.5 w-3.5 text-primary" /><span className="text-xs font-semibold">{c.title}</span></div>
                                        <p className="text-[11px] text-muted-foreground leading-relaxed">{c.desc}</p>
                                    </div>
                                ))}</div>
                                <div className="flex flex-col gap-3 pt-2">{STEPS.map((s) => (
                                    <button key={s.n} onClick={() => setCurrentStep(s.n)} className="flex items-center gap-3 cursor-pointer hover:text-foreground group">
                                        <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">{s.n}</div>
                                        <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">{s.title}</span>
                                    </button>
                                ))}</div>
                            </>)}
                            {currentStep === 1 && (<>
                                <p className="text-sm text-muted-foreground leading-relaxed">Explore the CRM application pages, then open the Failure Simulator to enable failure scenarios.</p>
                                <div className="grid grid-cols-1 gap-1.5 pt-1">{CRM_PAGES.map((p) => (
                                    <div key={p.id} role="button" tabIndex={0} onClick={() => setOpenPage(p.id)} className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors">
                                        <div className="flex-1 min-w-0"><div className="text-sm font-medium">{p.title}</div><p className="text-[11px] text-muted-foreground truncate m-0">{p.desc}</p></div>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                                    </div>
                                ))}</div>
                                <div className="border-t border-border pt-3 mt-1 space-y-1.5">
                                    <p className="text-xs font-semibold">Enable a Failure Scenario</p>
                                    <p className="text-[11px] text-muted-foreground leading-relaxed">Use the Failure Simulator to toggle failure scenarios and inject real AWS infrastructure failures.</p>
                                    <button onClick={() => setOpenPage("crossview")} className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm rounded-lg px-6 py-3 cursor-pointer transition-all">Open Failure Simulator →</button>
                                </div>
                            </>)}
                            {currentStep === 2 && (<>
                                <p className="text-sm text-muted-foreground leading-relaxed">Ready to investigate? After enabling a failure scenario, open the DevOps Agent Operator Portal to watch live automated triage, root cause analysis, and mitigation.</p>
                                <button onClick={() => window.open(import.meta.env.VITE_DEVOPS_AGENT_PORTAL_URL || "#", "_blank")} className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm rounded-lg px-6 py-3 cursor-pointer transition-all w-fit">🚀 Open DevOps Agent Portal <ExternalLink className="h-3 w-3" /></button>
                                <div className="flex items-center gap-3 mt-1">
                                    <CopyField label="Username" value={idcUsername} />
                                    <CopyField label="Password" value={idcPassword} masked />
                                    <div className="relative group">
                                        <Info className="h-3 w-3 text-muted-foreground/60 cursor-help" />
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 bg-foreground text-background text-[10px] rounded-md whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50 shadow-lg">
                                            Use these credentials to log into the DevOps Agent Operator Portal
                                        </div>
                                    </div>
                                </div>
                                <div className="rounded-lg border border-border p-3 space-y-2 mt-2">
                                    <p className="text-xs font-medium">What to observe:</p>
                                    {["Agent detects the failure and begins investigation", "Root cause analysis identifies the failing component", "Mitigation plan is generated"].map((t, i) => (
                                        <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground"><span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[8px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>{t}</div>
                                    ))}
                                </div>
                                <div className="flex flex-col items-center pt-4 opacity-40">
                                    <img src="/favicon.png" alt="DevOps Agent" className="w-10 h-10" />
                                </div>
                            </>)}
                        </div>

                        {/* DIVIDER */}
                        <div className="w-px bg-gray-300 shrink-0" />

                        {/* RIGHT: Visuals */}
                        <div className={`flex items-start justify-center min-w-0 ${currentStep === 0 ? 'flex-1' : currentStep === 2 ? 'w-2/3 -mt-14' : 'w-3/5 -mt-14'}`}>
                            {currentStep === 0 && (
                                <div className="w-full flex flex-col items-center">
                                    <div className="w-full rounded-xl overflow-hidden border border-border shadow-md" style={{ maxHeight: '78vh' }}>
                                        <video
                                            src="/tsclip.mp4"
                                            autoPlay
                                            loop
                                            muted
                                            playsInline
                                            className="w-full h-full object-contain rounded-xl"
                                        />
                                    </div>
                                </div>
                            )}
                            {currentStep === 1 && (
                                <div className="w-full relative">
                                    <div className="flex justify-center gap-2 mb-2">
                                        <button onClick={() => handleImageToggle('crm')} className={`text-[10px] px-3 py-1 rounded-full cursor-pointer transition-colors ${step2Image === 'crm' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>CRM App</button>
                                        <button onClick={() => handleImageToggle('crossview')} className={`text-[10px] px-3 py-1 rounded-full cursor-pointer transition-colors ${step2Image === 'crossview' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>Failure Simulator</button>
                                    </div>
                                    <div className="relative w-full" style={{ aspectRatio: '16/9', overflow: 'hidden' }}>
                                        <img
                                            src="/crm.png"
                                            alt="CRM App"
                                            className="w-full h-full rounded-xl border border-border object-cover absolute inset-0"
                                            style={{ opacity: step2Image === 'crm' ? 1 : 0, transition: 'opacity 0.6s ease-in-out' }}
                                            onError={(e) => { (e.target as HTMLImageElement).src = '/DevopsAgentDiagram.png' }}
                                        />
                                        <img
                                            src="/crossview.png"
                                            alt="Failure Simulator"
                                            className="w-full h-full rounded-xl border border-border object-cover absolute inset-0"
                                            style={{ opacity: step2Image === 'crossview' ? 1 : 0, transition: 'opacity 0.6s ease-in-out' }}
                                            onError={(e) => { (e.target as HTMLImageElement).src = '/DevopsAgentDiagram.png' }}
                                        />
                                    </div>
                                </div>
                            )}
                            {currentStep === 2 && (
                                <div className="w-full rounded-xl overflow-hidden border border-border shadow-md" style={{ maxHeight: '65vh' }}>
                                    <img
                                        src="/DevopsAgentDiagram.png"
                                        alt="AWS DevOps Agent architecture"
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* CRM Page modal */}
                    {activePage && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80" onClick={closeModal}>
                            <div className="bg-background rounded-xl shadow-2xl flex flex-col overflow-hidden w-[95vw] max-w-[1400px] h-[92vh]" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center justify-between px-6 py-3 border-b bg-white shrink-0 z-10 relative">
                                    <div className="flex items-center gap-2 text-sm">
                                        <button onClick={closeModal} className="text-muted-foreground hover:text-foreground cursor-pointer">CRM Pages</button>
                                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                        <span className="text-foreground font-medium">{activePage.title}</span>
                                    </div>
                                    <button onClick={closeModal} className="p-1.5 rounded hover:bg-muted cursor-pointer"><X className="h-4 w-4 text-muted-foreground" /></button>
                                </div>
                                <div className="flex-1 min-h-0">
                                    <iframe src={`${'path' in activePage ? activePage.path : '/crm'}?embed=true`} className="w-full h-full border-0" title={activePage.title} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Navigation footer — full width */}
                    <div className="flex items-center justify-between pt-4 mt-auto border-t">
                        <div>{currentStep > 0 && (<Button variant="outline" size="sm" onClick={() => setCurrentStep(currentStep - 1)} className="cursor-pointer"><ArrowLeft className="h-3 w-3 mr-1" /> Back</Button>)}</div>
                        {nextLabel
                            ? <Button size="sm" onClick={() => { if (currentStep < 2) setCurrentStep(currentStep + 1); }} className="cursor-pointer px-6">{nextLabel} <ChevronRight className="h-3 w-3 ml-1" /></Button>
                            : <Button size="sm" onClick={() => navigate("/")} className="cursor-pointer px-6"><RotateCcw className="h-3 w-3 mr-1" /> Replay</Button>
                        }
                    </div>
                </div>
            }
        />
        {showArch && <OverviewPage onClose={() => setShowArch(false)} />}
        </>
    );
};

export default UseCase;
