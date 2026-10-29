/**
 * Cross View Page — Immersive animated command-center dashboard
 * Major overhaul: particle backgrounds, glassmorphism, radial gauges,
 * SVG sparklines, staggered animations, glowing status indicators
 */
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import Modal from '@cloudscape-design/components/modal';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import Alert from '@cloudscape-design/components/alert';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Select, { SelectProps } from '@cloudscape-design/components/select';
import Badge from '@cloudscape-design/components/badge';
import Popover from '@cloudscape-design/components/popover';
import { del, get, post } from 'aws-amplify/api';
import { generateClient } from 'aws-amplify/api';
import { getCurrentUser } from 'aws-amplify/auth';
import { useTheme, COLOR_THEMES } from '../../common/contexts/ThemeContext';
import { motion, AnimatePresence } from 'motion/react';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import type { LucideIcon } from 'lucide-react';
import {
  Zap, Database, Radio, ExternalLink, CheckCircle2, Info,
  Activity, Eye, Clock,
  Server, ChevronRight, Terminal, Copy, Check, Settings,
} from 'lucide-react';
import CountUp from 'react-countup';

/* ─── Types ─── */
type FailureType = 'sqsBacklogSpike' | 'lambdaFailedDeployment' | 'rdsIndexDrop';
type Severity = 'light' | 'moderate' | 'severe';
interface FailureScenario { id: string; type: FailureType; name: string; shortName: string; description: string; enabled: boolean; severity: Severity; awsChange: string; }
interface SystemStatus { [key: string]: { enabled: boolean; severity: Severity; expiresAt?: string; enabledBy?: string }; }
interface FailureEvent { id: string; timestamp: number; scenarioType: string; errorType: string; errorMessage: string; service?: string; }
interface RealtimeMetrics { sqsQueueDepth: number; lambdaErrorRate: number; rdsCpuUtilization: number; systemHealth: string; activeScenario: string | null; }

/* ─── Constants ─── */
const TIMER_DURATION_SECONDS = 10 * 60;
const TIME_RANGE_OPTIONS: SelectProps.Option[] = [
  { label: 'Last 15 minutes', value: '15' }, { label: 'Last 30 minutes', value: '30' },
  { label: 'Last 1 hour', value: '60' }, { label: 'Last 6 hours', value: '360' }, { label: 'Last 24 hours', value: '1440' },
];
const FAILURE_SCENARIOS: FailureScenario[] = [
  { id: 'sqs-backlog-spike', type: 'sqsBacklogSpike', name: 'SQS Message Backlog Spike', shortName: 'SQS Backlog', description: 'Consumer permissions pre-denied — floods queue with messages', enabled: false, severity: 'moderate', awsChange: 'Sends messages to queue (consumer already blocked)' },
  { id: 'lambda-failed-deployment', type: 'lambdaFailedDeployment', name: 'Lambda Failed Deployment', shortName: 'Lambda Error', description: 'Broken code pre-deployed — triggers invocations via CRM traffic', enabled: false, severity: 'moderate', awsChange: 'Activates CRM traffic to invoke broken event processor' },
  { id: 'rds-index-drop', type: 'rdsIndexDrop', name: 'RDS Index Drop', shortName: 'RDS Slow', description: 'Indexes pre-removed — generates heavy query load', enabled: false, severity: 'moderate', awsChange: 'Starts background query loop on unindexed tables' },
];

const SCENARIO_INFO: Record<FailureType, { what: string; trigger: string; monitor: string; crmImpact: string; businessImpact: string }> = {
  sqsBacklogSpike: {
    what: 'The queue consumer Lambda permanently has its SQS permissions denied (baked into infrastructure). When enabled, this scenario floods the queue with messages and sustains a background drip. Since the consumer can\'t process messages, the backlog grows organically.',
    trigger: 'Toggling this on immediately floods the queue with messages. The consumer Lambda is already unable to process them. No additional action needed.',
    monitor: 'Watch the SQS Queue Depth metric and consumer Lambda error rate. CloudWatch alarm triggers when depth exceeds 50 messages. Consumer Lambda logs show AccessDenied errors.',
    crmImpact: 'In the CRM, SQS queues process asynchronous events like opportunity stage changes, account update notifications, and lead assignment workflows. When the consumer loses permissions, sales reps stop receiving real-time notifications about deal updates, new lead assignments get delayed, and automated follow-up emails to prospects queue indefinitely — meaning hot leads go cold while the backlog clears.',
    businessImpact: 'A message backlog in production could delay deal-closing workflows by hours. If a $500K opportunity moves to "Decision" stage but the notification never reaches the assigned rep, the competitor closes first. At scale, even a 30-minute SQS delay during peak hours could impact dozens of active deals across the pipeline.',
  },
  lambdaFailedDeployment: {
    what: 'The CRM event processor Lambda is permanently deployed with broken code (missing ./config/pipeline-rules module). When enabled, CRM API traffic triggers the event processor on every request, generating real Runtime.ImportModuleError failures.',
    trigger: 'Once enabled, real CRM API traffic (loading accounts, opportunities, team members) triggers the broken event processor. Errors appear immediately in CloudWatch Logs.',
    monitor: 'Watch the Lambda Error Rate metric. CloudWatch alarm triggers when error rate exceeds 5%. Lambda logs show Runtime.ImportModuleError.',
    crmImpact: 'The CRM\'s REST API is powered by Lambda functions that handle every user interaction — loading the sales pipeline, fetching account details, updating opportunity stages, and running team performance queries. When the Lambda deployment fails, the entire CRM becomes non-functional: sales reps can\'t view their pipeline, managers can\'t pull reports, and no deal updates can be saved.',
    businessImpact: 'A broken Lambda deployment is equivalent to a full CRM outage. Sales teams lose visibility into their pipeline, customer meetings happen without up-to-date account context, and manual workarounds (spreadsheets, emails) introduce data inconsistencies. For a team managing $10M+ in quarterly pipeline, even 1 hour of CRM downtime during business hours can result in missed follow-ups and lost revenue.',
  },
  rdsIndexDrop: {
    what: 'The RDS database permanently has critical indexes missing (not created at deploy time). When enabled, CRM page loads and a background query loop generate sustained full table scans, spiking CPU utilization.',
    trigger: 'Once enabled, any CRM page load triggers real database queries that hit full table scans. A background query loop adds sustained CPU pressure.',
    monitor: 'Watch the RDS CPU Utilization metric. CloudWatch alarm triggers when CPU exceeds 40%. Full table scans drive CPU significantly above the 5-15% baseline.',
    crmImpact: 'The CRM stores all accounts, opportunities, contacts, and activity history in RDS PostgreSQL. Without indexes, every page load triggers full table scans — the Accounts page that normally loads in 100ms now takes 5-10 seconds, pipeline filters time out, and the Team Performance dashboard becomes unusable. CPU utilization spikes as the database engine works harder to process unoptimized queries, compounding the slowdown. Sales reps experience constant loading spinners and timeout errors.',
    businessImpact: 'Slow database queries degrade the entire sales workflow. Reps preparing for customer calls can\'t quickly pull account history. Pipeline reviews with leadership stall as dashboards fail to load. The compounding effect is significant: if 50 reps each lose 15 minutes per day to slow CRM performance, that\'s 12.5 hours of lost selling time daily — directly impacting quota attainment and forecast accuracy.',
  },
};
const onMetricsUpdateSub = `subscription OnMetricsUpdate { onMetricsUpdate { id timestamp activeScenario sqsQueueDepth lambdaErrorRate rdsCpuUtilization systemHealth } }`;
const onFailureEventSub = `subscription OnFailureEvent { onFailureEvent { id timestamp scenarioType errorType errorMessage service } }`;
const onScenarioChangeSub = `subscription OnScenarioChange { onScenarioChange { id timestamp scenarioType action severity userId } }`;
const SCENARIO_ICONS: Record<FailureType, LucideIcon> = { sqsBacklogSpike: Radio, lambdaFailedDeployment: Zap, rdsIndexDrop: Database };

const CtaCopyField = ({ label, value, masked = false }: { label: string; value: string; masked?: boolean }) => {
    const [copied, setCopied] = React.useState(false);
    const handleCopy = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); };
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#ffffff' }}>
            <span style={{ opacity: 0.7, fontWeight: 500 }}>{label}:</span>
            <code style={{ background: 'rgba(255,255,255,0.15)', padding: '2px 8px', borderRadius: 4, fontFamily: 'monospace', fontSize: 12, color: '#fff' }}>{masked ? '•••••••••' : value}</code>
            <button onClick={handleCopy} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4, display: 'inline-flex', alignItems: 'center' }} title={`Copy ${label}`}>
                {copied ? <Check size={13} color="#4ade80" /> : <Copy size={13} color="rgba(255,255,255,0.8)" />}
            </button>
        </span>
    );
};

const SCENARIO_COLORS: Record<FailureType, string> = { sqsBacklogSpike: '#10b981', lambdaFailedDeployment: '#ef4444', rdsIndexDrop: '#3b82f6' };
const SCENARIO_GRADIENTS: Record<FailureType, string> = {
  sqsBacklogSpike: 'linear-gradient(135deg, #10b981, #059669)',
  lambdaFailedDeployment: 'linear-gradient(135deg, #ef4444, #dc2626)',
  rdsIndexDrop: 'linear-gradient(135deg, #3b82f6, #2563eb)',
};

/* ─── Particle Background ─── */
let particlesEngineReady = false;
initParticlesEngine(async (engine) => { await loadSlim(engine); }).then(() => { particlesEngineReady = true; });

const ParticleBg: React.FC<{ color: string }> = React.memo(({ color }) => {
  const [ready, setReady] = useState(particlesEngineReady);
  useEffect(() => {
    if (!particlesEngineReady) {
      const id = setInterval(() => { if (particlesEngineReady) { setReady(true); clearInterval(id); } }, 100);
      return () => clearInterval(id);
    }
  }, []);
  const opts = useMemo(() => ({
    fullScreen: false,
    background: { color: { value: 'transparent' } },
    fpsLimit: 60,
    particles: {
      number: { value: 40, density: { enable: true } },
      color: { value: color },
      links: { enable: true, distance: 130, color, opacity: 0.15, width: 1 },
      move: { enable: true, speed: 0.8, direction: 'none' as const, outModes: { default: 'bounce' as const } },
      size: { value: { min: 1, max: 2.5 } },
      opacity: { value: { min: 0.15, max: 0.4 } },
    },
    interactivity: {
      events: { onHover: { enable: true, mode: 'grab' as const } },
      modes: { grab: { distance: 160, links: { opacity: 0.3 } } },
    },
  }), [color]);
  if (!ready) return null;
  return <Particles id="crossview-particles" options={opts} style={{ width: '100%', height: '100%' }} />;
});

/* ─── SVG Sparkline ─── */
const SvgSparkline: React.FC<{ data: number[]; threshold: number; color: string; isActive: boolean }> = ({ data, threshold, color, isActive }) => {
  const pts = data.slice(-20);
  if (pts.length < 2) return <div style={{ height: 56 }} />;
  const max = Math.max(...pts, threshold, 1) * 1.15;
  const w = 200, h = 56;
  const line = pts.map((v, i) => `${(i / (pts.length - 1)) * w},${h - (v / max) * h}`).join(' ');
  const area = `0,${h} ${line} ${w},${h}`;
  const threshY = h - (threshold / max) * h;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: h, overflow: 'visible' }} aria-hidden>
      <defs>
        <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={isActive ? 0.25 : 0.1} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#sg-${color.replace('#', '')})`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={isActive ? 1 : 0.4} />
      <line x1={0} y1={threshY} x2={w} y2={threshY} stroke="#ef4444" strokeWidth={1} strokeDasharray="4 3" opacity={0.5} />
      {pts.length > 0 && (() => {
        const lastX = w, lastY = h - (pts[pts.length - 1] / max) * h;
        const above = pts[pts.length - 1] > threshold;
        return <circle cx={lastX} cy={lastY} r={3} fill={above ? '#ef4444' : color} opacity={isActive ? 1 : 0.5} />;
      })()}
    </svg>
  );
};

/* ─── Radial Gauge ─── */
const RadialGauge: React.FC<{ value: number; max: number; threshold: number; color: string; size?: number }> = ({ value, max, threshold, color, size = 80 }) => {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(value / max, 1);
  const threshPct = threshold / max;
  const isOver = value > threshold;
  const strokeColor = isOver ? '#ef4444' : color;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }} aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={4} opacity={0.08} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={strokeColor} strokeWidth={4} strokeLinecap="round"
        strokeDasharray={`${pct * circ} ${circ}`} style={{ transition: 'stroke-dasharray 0.6s ease, stroke 0.3s ease' }}
      />
      {/* threshold marker */}
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#ef4444" strokeWidth={1} strokeDasharray={`1 ${circ - 1}`}
        strokeDashoffset={-threshPct * circ} opacity={0.4}
      />
    </svg>
  );
};

/* ─── Countdown Timer (redesigned) ─── */
const CountdownTimer: React.FC<{ expiresAt: string | undefined; onExpired: () => void }> = ({ expiresAt, onExpired }) => {
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!expiresAt) { setRemainingSeconds(0); return; }
    const calc = () => Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
    setRemainingSeconds(calc());
    intervalRef.current = setInterval(() => { const r = calc(); setRemainingSeconds(r); if (r <= 0) { if (intervalRef.current) clearInterval(intervalRef.current); onExpired(); } }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [expiresAt, onExpired]);
  if (remainingSeconds <= 0) return null;
  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  const pct = (remainingSeconds / TIMER_DURATION_SECONDS) * 100;
  const isLow = pct < 20;
  return (
    <div className="cv-timer">
      <div className="cv-timer-ring">
        <RadialGauge value={remainingSeconds} max={TIMER_DURATION_SECONDS} threshold={TIMER_DURATION_SECONDS * 0.2} color="var(--app-primary-color, #0972d3)" size={64} />
        <div className="cv-timer-value" style={{ color: isLow ? '#ef4444' : undefined }}>
          {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        </div>
      </div>
    </div>
  );
};

/* ─── Scenario Badge ─── */
const ScenarioBadge: React.FC<{ scenarioType: string }> = ({ scenarioType }) => {
  const cfg: Record<string, { label: string; color: 'blue' | 'green' | 'red' | 'grey' }> = { sqsBacklogSpike: { label: 'SQS', color: 'green' }, lambdaFailedDeployment: { label: 'Lambda', color: 'red' }, rdsIndexDrop: { label: 'RDS', color: 'blue' } };
  const { label, color } = cfg[scenarioType] || { label: scenarioType, color: 'grey' as const };
  return <Badge color={color}>{label}</Badge>;
};

/* ─── Glowing Toggle Switch ─── */
const GlowToggle: React.FC<{ checked: boolean; onChange: () => void; disabled?: boolean; color: string }> = ({ checked, onChange, disabled, color }) => (
  <button
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={onChange}
    className={`cv-glow-toggle ${checked ? 'cv-glow-toggle--on' : ''}`}
    style={{ '--toggle-color': color } as React.CSSProperties}
  >
    <motion.div className="cv-glow-toggle-knob" layout transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
  </button>
);

/* ─── Metric Card (redesigned) ─── */
interface MetricCardProps { title: string; description: string; metricLabel: string; metricValue: number; metricUnit: string; isActive: boolean; isAnomalous: boolean; threshold: number; maxGauge: number; sparklineData: number[]; infoContent: string; accentColor: string; IconComp: LucideIcon; }
const MetricCard: React.FC<MetricCardProps> = ({ title, description, metricLabel, metricValue, metricUnit, isActive, isAnomalous, threshold, maxGauge, sparklineData, infoContent, accentColor, IconComp }) => (
  <motion.div
    className={`cv-metric-card ${isActive ? 'cv-metric-card--active' : ''} ${isAnomalous ? 'cv-metric-card--alert' : ''}`}
    style={{ '--mc-accent': accentColor } as React.CSSProperties}
    initial={{ opacity: 0, y: 24, scale: 0.97 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    whileHover={{ y: -4, transition: { duration: 0.2 } }}
  >
    {/* top accent line */}
    <div className="cv-metric-card-accent" />

    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="cv-metric-icon" style={{ background: `${accentColor}18` }}>
          <IconComp size={20} color={accentColor} />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>{title}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>{description}</div>
        </div>
      </div>
      <Popover dismissButton={false} position="top" size="medium" triggerType="custom" content={<Box fontSize="body-s">{infoContent}</Box>}>
        <span style={{ cursor: 'help', color: '#94a3b8', transition: 'color 0.2s' }}><Info size={15} /></span>
      </Popover>
    </div>

    {/* gauge + value */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 16 }}>
      <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
        <RadialGauge value={metricValue} max={maxGauge} threshold={threshold} color={accentColor} size={80} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
          <span style={{ fontSize: 18, fontWeight: 800, lineHeight: 1, color: isAnomalous ? '#ef4444' : undefined, fontVariantNumeric: 'tabular-nums' }}>
            <CountUp end={metricValue} duration={0.6} preserveValue separator="," />
          </span>
          <span style={{ fontSize: 10, color: '#64748b', fontWeight: 500 }}>{metricUnit}</span>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{metricLabel}</div>
        <SvgSparkline data={sparklineData} threshold={threshold} color={accentColor} isActive={isActive} />
      </div>
    </div>

    {/* status bar */}
    <div className="cv-metric-status">
      {isAnomalous ? (
        <><div className="cv-status-dot cv-status-dot--alert" /><span style={{ color: '#ef4444' }}>Above threshold ({threshold}{metricUnit})</span></>
      ) : (
        <><div className="cv-status-dot" style={{ '--dot-color': accentColor } as React.CSSProperties} /><span style={{ color: accentColor }}>Normal</span></>
      )}
    </div>
  </motion.div>
);

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
const CrossViewPage: React.FC = () => {
  const { colorTheme } = useTheme();
  const themeColor = COLOR_THEMES[colorTheme].primaryColor;
  const [scenarios, setScenarios] = useState<FailureScenario[]>(FAILURE_SCENARIOS);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; scenario: FailureScenario | null; action: 'enable' | 'disable' }>({ open: false, scenario: null, action: 'enable' });
  const [failureEvents, setFailureEvents] = useState<FailureEvent[]>([]);
  const [realtimeMetrics, setRealtimeMetrics] = useState<RealtimeMetrics>({ sqsQueueDepth: 0, lambdaErrorRate: 0, rdsCpuUtilization: 8, systemHealth: 'healthy', activeScenario: null });
  const [sparklineHistory, setSparklineHistory] = useState<{ sqs: number[]; lambda: number[]; rds: number[] }>({ sqs: [], lambda: [], rds: [] });
  const [selectedTimeRange, setSelectedTimeRange] = useState<SelectProps.Option>(TIME_RANGE_OPTIONS[0]);
  const metricsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [cloudwatchModalVisible, setCloudwatchModalVisible] = useState(false);
  const client = generateClient();
  const [infoModal, setInfoModal] = useState<FailureType | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [currentUserAlias, setCurrentUserAlias] = useState<string>('');
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [eventsPage, setEventsPage] = useState(0);
  const EVENTS_PER_PAGE = 10;

  useEffect(() => {
    getCurrentUser().then(user => {
      setCurrentUserAlias(user.signInDetails?.loginId || user.username);
    }).catch(() => {});
  }, []);

  /* ─── Data fetching (unchanged logic) ─── */
  const fetchSystemStatus = useCallback(async () => {
    try { const r = await get({ apiName: 'restApi', path: '/admin/system-status' }).response; const d = (await r.body.json()) as { scenarios?: SystemStatus }; if (d.scenarios) { setSystemStatus(d.scenarios); setScenarios(p => p.map(s => ({ ...s, enabled: d.scenarios?.[s.type]?.enabled || false, severity: d.scenarios?.[s.type]?.severity || s.severity }))); } } catch (e) { console.error('Failed to fetch system status:', e); }
  }, []);
  const fetchFailureEvents = useCallback(async () => {
    try { const mins = parseInt(selectedTimeRange.value || '15', 10); const end = Date.now(); const start = end - mins * 60 * 1000; const r = await get({ apiName: 'restApi', path: `/admin/failure-events?limit=50&startTime=${start}&endTime=${end}` }).response; const d = (await r.body.json()) as { events?: FailureEvent[] }; console.log('Failure events response:', d.events?.length || 0, 'events'); if (d.events) setFailureEvents(d.events.slice(0, 20)); } catch (e) { console.error('Failed to fetch failure events:', e); }
  }, [selectedTimeRange]);
  const fetchMetrics = useCallback(async () => {
    try { const r = await get({ apiName: 'restApi', path: '/admin/metrics' }).response; const d = (await r.body.json()) as { success?: boolean; metrics?: { sqsMessagesVisible?: number; lambdaErrorRate?: number; rdsCpuUtilization?: number; systemHealth?: string; activeScenario?: string | null } }; if (d.success && d.metrics) { const m = d.metrics; setRealtimeMetrics({ sqsQueueDepth: m.sqsMessagesVisible || 0, lambdaErrorRate: m.lambdaErrorRate || 0, rdsCpuUtilization: m.rdsCpuUtilization || 0, systemHealth: m.systemHealth || 'healthy', activeScenario: m.activeScenario || null }); setSparklineHistory(p => ({ sqs: [...p.sqs.slice(-19), m.sqsMessagesVisible || 0], lambda: [...p.lambda.slice(-19), m.lambdaErrorRate || 0], rds: [...p.rds.slice(-19), m.rdsCpuUtilization || 0] })); } } catch (e) { console.error('Failed to fetch metrics:', e); }
  }, []);

  useEffect(() => { fetchSystemStatus(); fetchFailureEvents(); fetchMetrics(); metricsIntervalRef.current = setInterval(fetchMetrics, 5000); const ei = setInterval(fetchFailureEvents, 5000); return () => { if (metricsIntervalRef.current) clearInterval(metricsIntervalRef.current); clearInterval(ei); }; }, [fetchSystemStatus, fetchFailureEvents, fetchMetrics]);

  useEffect(() => {
    const subs: Array<{ unsubscribe: () => void }> = [];
    try {
      type SH<T> = { next: (d: { data?: T }) => void; error: (e: Error) => void };
      type SR = { subscribe: (h: SH<unknown>) => { unsubscribe: () => void } };
      subs.push((client.graphql({ query: onFailureEventSub }) as unknown as SR).subscribe({ next: ({ data }) => { const d = data as { onFailureEvent?: FailureEvent } | undefined; if (d?.onFailureEvent) setFailureEvents(p => [d.onFailureEvent!, ...p].slice(0, 10)); }, error: e => console.error('Failure sub error:', e) }));
      subs.push((client.graphql({ query: onScenarioChangeSub }) as unknown as SR).subscribe({ next: () => fetchSystemStatus(), error: e => console.error('Scenario sub error:', e) }));
      subs.push((client.graphql({ query: onMetricsUpdateSub }) as unknown as SR).subscribe({ next: ({ data }) => { const d = data as { onMetricsUpdate?: RealtimeMetrics } | undefined; if (d?.onMetricsUpdate) { const m = d.onMetricsUpdate; setRealtimeMetrics(m); setSparklineHistory(p => ({ sqs: [...p.sqs.slice(-19), m.sqsQueueDepth], lambda: [...p.lambda.slice(-19), m.lambdaErrorRate], rds: [...p.rds.slice(-19), m.rdsCpuUtilization] })); } }, error: e => console.error('Metrics sub error:', e) }));
    } catch (e) { console.error('Failed to set up subscriptions:', e); }
    return () => subs.forEach(s => s?.unsubscribe?.());
  }, [client, fetchSystemStatus]);

  useEffect(() => {
    const ref = { current: null as NodeJS.Timeout | null };
    const trigger = async () => {
      // All scenarios: make real CRM API calls that flow through the full request path.
      // For Lambda: API Gateway → proxy Lambda → event processor Lambda (broken code fails).
      // For RDS: API Gateway → proxy Lambda → database queries (missing indexes = slow).
      // For SQS: API Gateway → proxy Lambda → logs message processing delays.
      // This generates realistic traffic patterns visible in CloudWatch and CloudTrail.
      if (systemStatus.lambdaFailedDeployment?.enabled || systemStatus.rdsIndexDrop?.enabled || systemStatus.sqsBacklogSpike?.enabled) {
        const crmEndpoints = ['/accounts', '/opportunities', '/team-members'];
        for (const endpoint of crmEndpoints) {
          try { await get({ apiName: 'restApi', path: endpoint }).response; } catch (_) {}
        }
      }
    };
    if (systemStatus.lambdaFailedDeployment?.enabled || systemStatus.rdsIndexDrop?.enabled || systemStatus.sqsBacklogSpike?.enabled) { trigger(); ref.current = setInterval(trigger, 10000); }
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [systemStatus.lambdaFailedDeployment?.enabled, systemStatus.rdsIndexDrop?.enabled, systemStatus.sqsBacklogSpike?.enabled]);

  const handleToggleScenario = async (scenario: FailureScenario, enable: boolean) => {
    setLoading(true); setError(null);
    try {
      // Ensure we have the current user alias before enabling
      let alias = currentUserAlias;
      if (!alias && enable) {
        try {
          const user = await getCurrentUser();
          alias = user.signInDetails?.loginId || user.username;
          setCurrentUserAlias(alias);
        } catch { /* fall through with empty alias */ }
      }
      const pm: Record<FailureType, string> = { sqsBacklogSpike: 'sqs-backlog-spike', lambdaFailedDeployment: 'lambda-failed-deployment', rdsIndexDrop: 'rds-index-drop' };
      if (enable) {
        const exp = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        setSystemStatus(p => ({ ...p, [scenario.type]: { enabled: true, severity: scenario.severity, expiresAt: exp, enabledBy: alias || 'unknown' } }));
        setScenarios(p => p.map(s => s.type === scenario.type ? { ...s, enabled: true } : s));
        const r = await post({ apiName: 'restApi', path: `/admin/failures/${pm[scenario.type]}`, options: { body: JSON.parse(JSON.stringify({ severity: scenario.severity, userDisplayName: alias || undefined })) } }).response;
        const d = await r.body.json() as { success?: boolean; message?: string };
        if (d && !d.success && d.message) { setSystemStatus(p => ({ ...p, [scenario.type]: { enabled: false, severity: scenario.severity } })); setScenarios(p => p.map(s => s.type === scenario.type ? { ...s, enabled: false } : s)); throw new Error(d.message); }
      } else {
        const r = await del({ apiName: 'restApi', path: `/admin/failures/${pm[scenario.type]}` }).response;
        const d = await r.body.json() as { success?: boolean; message?: string };
        if (d && !d.success && d.message) throw new Error(d.message);
      }
      await new Promise(r => setTimeout(r, 500)); await fetchSystemStatus();
      // Immediately trigger CRM API calls to generate errors/metrics for all scenarios
      if (enable) {
        const crmEndpoints = ['/accounts', '/opportunities', '/team-members'];
        for (const endpoint of crmEndpoints) {
          try { await get({ apiName: 'restApi', path: endpoint }).response; } catch (_) {}
        }
      }
      setConfirmModal({ open: false, scenario: null, action: 'enable' });
    } catch (e) { console.error('Toggle error:', e); setError(e instanceof Error ? e.message : 'Failed to toggle scenario'); } finally { setLoading(false); }
  };
  const openConfirmModal = (scenario: FailureScenario, action: 'enable' | 'disable') => setConfirmModal({ open: true, scenario, action });
  const handleTimerExpired = useCallback(() => {
    // Optimistically reset all expired scenarios in local state immediately
    setSystemStatus(prev => {
      const updated = { ...prev };
      for (const [key, val] of Object.entries(updated)) {
        if (val.enabled && val.expiresAt) {
          const remaining = new Date(val.expiresAt).getTime() - Date.now();
          if (remaining <= 0) {
            updated[key] = { ...val, enabled: false, expiresAt: undefined };
          }
        }
      }
      return updated;
    });
    setScenarios(prev => prev.map(s => {
      const st = systemStatus[s.type];
      if (st?.enabled && st?.expiresAt) {
        const remaining = new Date(st.expiresAt).getTime() - Date.now();
        if (remaining <= 0) return { ...s, enabled: false };
      }
      return s;
    }));
    // Then confirm with backend
    fetchSystemStatus();
  }, [fetchSystemStatus, systemStatus]);
  const activeCount = Object.values(systemStatus).filter(s => s.enabled).length;

  // Determine which scenarios the current user started
  const myScenarioTypes = new Set<string>();
  for (const [type, status] of Object.entries(systemStatus)) {
    if (status.enabled) {
      // Match if enabledBy matches current user, or if enabledBy is missing/system (likely current user just enabled it)
      const enabledBy = status.enabledBy || '';
      const isMyScenario = !enabledBy || enabledBy === 'system'
        || enabledBy === currentUserAlias
        || (currentUserAlias && enabledBy.includes(currentUserAlias))
        || (currentUserAlias && currentUserAlias.includes(enabledBy));
      if (isMyScenario) {
        myScenarioTypes.add(type);
      }
    }
  }
  const hasMyScenarios = myScenarioTypes.size > 0;
  const myFailureEvents = failureEvents.filter(evt => myScenarioTypes.has(evt.scenarioType));

  /* ─── Render ─── */
  const activeScenarios = Object.entries(systemStatus).filter(([, s]) => s.enabled);
  const [dismissedBanners, setDismissedBanners] = useState<Set<string>>(new Set());

  return (
    <div className="cv-root">
      {/* ═══ ACTIVE SCENARIO BANNERS ═══ */}
      {activeScenarios.filter(([type]) => !dismissedBanners.has(type)).length > 0 && (
        <div style={{ padding: '12px 24px 0', display: 'flex', flexDirection: 'column', gap: 8, zIndex: 10, position: 'relative' }}>
          {activeScenarios.filter(([type]) => !dismissedBanners.has(type)).map(([type, status]) => {
            const scenario = FAILURE_SCENARIOS.find(s => s.type === type);
            if (!scenario) return null;
            const color = SCENARIO_COLORS[type as FailureType] || '#64748b';
            return (
              <Alert key={type} type="info" dismissible dismissAriaLabel="Dismiss" onDismiss={() => setDismissedBanners(prev => new Set(prev).add(type))}>
                <span style={{ color, fontWeight: 600 }}>{scenario.name}</span> is active — started by <span style={{ fontWeight: 600 }}>{status.enabledBy || 'unknown'}</span>
                {status.expiresAt && (() => {
                  const remaining = Math.max(0, Math.floor((new Date(status.expiresAt).getTime() - Date.now()) / 1000));
                  const mins = Math.floor(remaining / 60);
                  const secs = remaining % 60;
                  return remaining > 0 ? <span style={{ opacity: 0.6 }}> · {mins}m {secs}s remaining</span> : null;
                })()}
              </Alert>
            );
          })}
        </div>
      )}

      {/* ═══ HERO HEADER ═══ */}
      <section className="cv-hero">
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden' }}>
          <ParticleBg color={themeColor} />
        </div>

        {/* Settings gear */}
        <div style={{ position: 'absolute', top: 16, right: 20, zIndex: 10 }}>
          <button
            onClick={() => setSettingsOpen(p => !p)}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
            title="Settings"
          >
            <Settings size={18} color="rgba(255,255,255,0.7)" />
          </button>
          {settingsOpen && (
            <div style={{ position: 'absolute', top: 42, right: 0, background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: 16, minWidth: 280, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 12 }}>Settings</div>
            </div>
          )}
        </div>
        <div className="cv-hero-content">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="cv-hero-badge">
              <Activity size={14} /> Command Center
            </div>
          </motion.div>
          <motion.h1 className="cv-hero-title" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
            Failure Simulator
          </motion.h1>
          <motion.p className="cv-hero-subtitle" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
            Unified failure simulation and real-time monitoring
          </motion.p>

          {/* Status pills */}
          <motion.div className="cv-hero-status" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.35 }}>
            <div className={`cv-status-pill ${activeCount > 0 ? 'cv-status-pill--alert' : 'cv-status-pill--ok'}`}>
              <div className={`cv-status-dot ${activeCount > 0 ? 'cv-status-dot--alert' : ''}`} style={{ '--dot-color': activeCount > 0 ? '#ef4444' : '#22c55e' } as React.CSSProperties} />
              {activeCount > 0 ? `${activeCount} Active Scenario${activeCount > 1 ? 's' : ''}` : 'All Systems Normal'}
            </div>
            <div className="cv-status-pill cv-status-pill--neutral">
              <Clock size={13} /> Auto-refresh 5s
            </div>
          </motion.div>
        </div>
      </section>

      <div className="cv-body">
        <AnimatePresence>
          {error && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ marginBottom: 20 }}><Alert type="error" dismissible onDismiss={() => setError(null)}>{error}</Alert></motion.div>}
        </AnimatePresence>

        {/* ═══ SECTION 1: FAILURE SIMULATOR ═══ */}
        <motion.section initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
          <div className="cv-section-header">
            <div className="cv-section-num" style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}bb)`, boxShadow: `0 2px 12px ${themeColor}40` }}>1</div>
            <div>
              <h2 className="cv-section-title">Failure Simulator</h2>
              <p className="cv-section-desc">Toggle failure scenarios to observe system behavior in real time</p>
            </div>
          </div>

          <div className="cv-scenario-grid">
            {scenarios.map((sc, idx) => {
              const st = systemStatus[sc.type]; const on = st?.enabled || false; const exp = st?.expiresAt;
              const accent = SCENARIO_COLORS[sc.type]; const ScIcon = SCENARIO_ICONS[sc.type];
              return (
                <motion.div
                  key={sc.id}
                  className={`cv-scenario-card ${on ? 'cv-scenario-card--active' : ''}`}
                  style={{ '--sc-accent': accent } as React.CSSProperties}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.15 + idx * 0.1, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={{ y: -6, transition: { duration: 0.2 } }}
                >
                  {/* glow border when active */}
                  {on && <div className="cv-scenario-glow" />}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <motion.div
                        className="cv-scenario-icon"
                        style={{ background: on ? SCENARIO_GRADIENTS[sc.type] : `${accent}14` }}
                        animate={on ? { boxShadow: `0 0 20px ${accent}40` } : { boxShadow: '0 0 0px transparent' }}
                      >
                        <ScIcon size={20} color={on ? '#fff' : accent} />
                      </motion.div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 700, fontSize: 15 }}>{sc.shortName}</span>
                          <span onClick={() => setInfoModal(sc.type)} style={{ cursor: 'pointer', color: accent, display: 'inline-flex', opacity: 0.7, transition: 'opacity 0.2s' }} onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }} onMouseLeave={e => { e.currentTarget.style.opacity = '0.7'; }}><Info size={14} /></span>
                        </div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{sc.description}</div>
                      </div>
                    </div>
                  </div>

                  {on && exp && <CountdownTimer expiresAt={exp} onExpired={handleTimerExpired} />}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
                      {on ? (
                        <><div className="cv-status-dot cv-status-dot--alert" style={{ '--dot-color': '#f59e0b' } as React.CSSProperties} /><span style={{ color: '#f59e0b' }}>Active</span></>
                      ) : (
                        <><div className="cv-status-dot" style={{ '--dot-color': '#22c55e' } as React.CSSProperties} /><span style={{ color: '#22c55e' }}>Inactive</span></>
                      )}
                    </div>
                    <GlowToggle checked={on} onChange={() => openConfirmModal(sc, 'enable')} disabled={loading || on} color={accent} />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        {/* ═══ SECTION 2: FAILURE EVENTS ═══ */}
        <motion.section initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.25 }}>
          <div className="cv-section-header">
            <div className="cv-section-num" style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}bb)`, boxShadow: `0 2px 12px ${themeColor}40` }}>2</div>
            <div style={{ flex: 1 }}>
              <h2 className="cv-section-title">Recent Events</h2>
              <p className="cv-section-desc">Live stream of failure events from active scenarios</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={() => { setShowAllEvents(p => !p); setEventsPage(0); }}
                style={{
                  background: showAllEvents ? themeColor : 'transparent',
                  color: showAllEvents ? '#fff' : '#64748b',
                  border: `1px solid ${showAllEvents ? themeColor : '#cbd5e1'}`,
                  borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap',
                }}
              >
                {showAllEvents ? 'All Events' : 'My Events'}
              </button>
              <div style={{ width: 180 }}>
                <Select selectedOption={selectedTimeRange} onChange={({ detail }) => setSelectedTimeRange(detail.selectedOption)} options={TIME_RANGE_OPTIONS} />
              </div>
            </div>
          </div>

          <div className="cv-events-container">
            {(() => {
              const displayEvents = showAllEvents ? failureEvents : myFailureEvents;
              const totalPages = Math.max(1, Math.ceil(displayEvents.length / EVENTS_PER_PAGE));
              const safeEventsPage = Math.min(eventsPage, totalPages - 1);
              const pagedEvents = displayEvents.slice(safeEventsPage * EVENTS_PER_PAGE, (safeEventsPage + 1) * EVENTS_PER_PAGE);
              return displayEvents.length === 0 ? (
              <motion.div className="cv-events-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <CheckCircle2 size={40} color="#22c55e" strokeWidth={1.5} />
                <div style={{ fontSize: 15, fontWeight: 600, marginTop: 12 }}>No failure events recorded</div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Enable a scenario above to start generating events</div>
              </motion.div>
            ) : (
              <>
              <div className="cv-events-list">
                <AnimatePresence initial={false}>
                  {pagedEvents.map((evt) => (
                    <motion.div
                      key={evt.id}
                      className="cv-event-row"
                      initial={{ opacity: 0, x: -20, height: 0 }}
                      animate={{ opacity: 1, x: 0, height: 'auto' }}
                      exit={{ opacity: 0, x: 20, height: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="cv-event-time">{new Date(evt.timestamp).toLocaleTimeString()}</div>
                      <ScenarioBadge scenarioType={evt.scenarioType} />
                      <div className="cv-event-type">{evt.errorType}</div>
                      <div className="cv-event-msg">{evt.errorMessage}</div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, padding: '12px 0', fontSize: 13 }}>
                  <button onClick={() => setEventsPage(p => Math.max(0, p - 1))} disabled={safeEventsPage === 0} style={{ background: 'none', border: '1px solid #cbd5e1', borderRadius: 6, padding: '4px 12px', cursor: safeEventsPage === 0 ? 'default' : 'pointer', opacity: safeEventsPage === 0 ? 0.4 : 1, fontSize: 12 }}>Prev</button>
                  <span style={{ color: '#64748b' }}>Page {safeEventsPage + 1} of {totalPages} ({displayEvents.length} events)</span>
                  <button onClick={() => setEventsPage(p => Math.min(totalPages - 1, p + 1))} disabled={safeEventsPage >= totalPages - 1} style={{ background: 'none', border: '1px solid #cbd5e1', borderRadius: 6, padding: '4px 12px', cursor: safeEventsPage >= totalPages - 1 ? 'default' : 'pointer', opacity: safeEventsPage >= totalPages - 1 ? 0.4 : 1, fontSize: 12 }}>Next</button>
                </div>
              )}
              </>
            );
            })()}
          </div>
        </motion.section>

        {/* ═══ SECTION 3: MONITORING ═══ */}
        <motion.section initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.35 }}>
          <div className="cv-section-header">
            <div className="cv-section-num" style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}bb)`, boxShadow: `0 2px 12px ${themeColor}40` }}>3</div>
            <div>
              <h2 className="cv-section-title">Scenario Monitoring</h2>
              <p className="cv-section-desc">Real-time metrics with threshold detection</p>
            </div>
          </div>

          <div className="cv-metrics-grid">
            <MetricCard title="SQS Backlog" description="Message queue depth" metricLabel="Queue Depth" metricValue={realtimeMetrics.sqsQueueDepth} metricUnit=" msgs" isActive={systemStatus.sqsBacklogSpike?.enabled || false} isAnomalous={realtimeMetrics.sqsQueueDepth > 50} threshold={50} maxGauge={200} sparklineData={sparklineHistory.sqs} infoContent="Monitors SQS queue depth. Alarm triggers above 50 messages." accentColor={SCENARIO_COLORS.sqsBacklogSpike} IconComp={Radio} />
            <MetricCard title="Lambda Error" description="Function error rate" metricLabel="Error Rate" metricValue={realtimeMetrics.lambdaErrorRate} metricUnit="%" isActive={systemStatus.lambdaFailedDeployment?.enabled || false} isAnomalous={realtimeMetrics.lambdaErrorRate > 5} threshold={5} maxGauge={100} sparklineData={sparklineHistory.lambda} infoContent="Monitors Lambda error rate. Alarm triggers above 5%." accentColor={SCENARIO_COLORS.lambdaFailedDeployment} IconComp={Zap} />
            <MetricCard title="RDS CPU" description="Database CPU utilization" metricLabel="CPU Utilization" metricValue={realtimeMetrics.rdsCpuUtilization} metricUnit="%" isActive={systemStatus.rdsIndexDrop?.enabled || false} isAnomalous={realtimeMetrics.rdsCpuUtilization > 40} threshold={40} maxGauge={100} sparklineData={sparklineHistory.rds} infoContent="Monitors RDS CPU utilization. Alarm triggers above 40%." accentColor={SCENARIO_COLORS.rdsIndexDrop} IconComp={Database} />
          </div>
        </motion.section>

        {/* ═══ SECTION 4: OBSERVABILITY ═══ */}
        <motion.section initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.45 }}>
          <div className="cv-section-header">
            <div className="cv-section-num" style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}bb)`, boxShadow: `0 2px 12px ${themeColor}40` }}>4</div>
            <div>
              <h2 className="cv-section-title">Observability Platforms</h2>
              <p className="cv-section-desc">Access monitoring platforms and operator tools</p>
            </div>
          </div>

          <div className="cv-obs-grid">
            {[
              { name: 'Amazon CloudWatch', desc: 'AWS native monitoring and alerting', href: '', Icon: Eye, gradient: 'linear-gradient(135deg, #f97316, #ea580c)', onClick: () => setCloudwatchModalVisible(true) },
              { name: 'Other Tools', desc: 'Dynatrace, New Relic, Splunk, and more', href: '', Icon: Server, gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)' },
            ].map((tool, idx) => (
              <motion.div
                key={tool.name}
                className="cv-obs-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 + idx * 0.08 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
              >
                <div className="cv-obs-icon" style={{ background: tool.gradient }}>
                  <tool.Icon size={22} color="#fff" />
                </div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{tool.name}</div>
                <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12, lineHeight: 1.5 }}>{tool.desc}</div>
                {(tool.href || tool.onClick) && (
                  tool.onClick ? (
                    <button onClick={tool.onClick} className="cv-obs-link" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit' }}>
                      Open <ChevronRight size={14} />
                    </button>
                  ) : (
                    <a href={tool.href} target="_blank" rel="noopener noreferrer" className="cv-obs-link">
                      Open <ChevronRight size={14} />
                    </a>
                  )
                )}
              </motion.div>
            ))}
          </div>
        </motion.section>
      </div>

      {/* ═══ MODALS ═══ */}
      <Modal
        visible={infoModal !== null}
        onDismiss={() => setInfoModal(null)}
        header={infoModal ? FAILURE_SCENARIOS.find(s => s.type === infoModal)?.name || '' : ''}
        footer={<Box float="right"><Button variant="primary" onClick={() => setInfoModal(null)}>Close</Button></Box>}
        size="medium"
      >
        {infoModal && (
          <SpaceBetween size="m">
            <div>
              <Box fontWeight="bold" fontSize="body-m" color="text-status-info" padding={{ bottom: 'xxs' }}>Real-World CRM Impact</Box>
              <Box fontSize="body-s">{SCENARIO_INFO[infoModal].crmImpact}</Box>
            </div>
            <div>
              <Box fontWeight="bold" fontSize="body-m" padding={{ bottom: 'xxs' }}>Business Impact:</Box>
              <Box fontSize="body-s">{SCENARIO_INFO[infoModal].businessImpact}</Box>
            </div>
            <div>
              <Box fontWeight="bold" fontSize="body-m" padding={{ bottom: 'xxs' }}>What happens:</Box>
              <Box fontSize="body-s">{SCENARIO_INFO[infoModal].what}</Box>
            </div>
            <div>
              <Box fontWeight="bold" fontSize="body-m" padding={{ bottom: 'xxs' }}>How to trigger:</Box>
              <Box fontSize="body-s">{SCENARIO_INFO[infoModal].trigger}</Box>
            </div>
            <div>
              <Box fontWeight="bold" fontSize="body-m" padding={{ bottom: 'xxs' }}>What to monitor:</Box>
              <Box fontSize="body-s">{SCENARIO_INFO[infoModal].monitor}</Box>
            </div>
            <Alert type="warning">This scenario will automatically disable after 10 minutes.</Alert>
          </SpaceBetween>
        )}
      </Modal>

      <Modal visible={confirmModal.open} onDismiss={() => setConfirmModal({ open: false, scenario: null, action: 'enable' })} header={confirmModal.action === 'enable' ? 'Enable Failure Scenario' : 'Disable Failure Scenario'} footer={<Box float="right"><SpaceBetween direction="horizontal" size="xs"><Button variant="link" onClick={() => setConfirmModal({ open: false, scenario: null, action: 'enable' })}>Cancel</Button><Button variant="primary" loading={loading} onClick={() => confirmModal.scenario && handleToggleScenario(confirmModal.scenario, confirmModal.action === 'enable')}>{confirmModal.action === 'enable' ? 'Enable' : 'Disable'}</Button></SpaceBetween></Box>}>
        {confirmModal.scenario && (<SpaceBetween size="m"><Box>{confirmModal.action === 'enable' ? `Are you sure you want to enable "${confirmModal.scenario.name}"? This will ${confirmModal.scenario.awsChange.toLowerCase()}.` : `Are you sure you want to disable "${confirmModal.scenario.name}"? The system will begin recovery.`}</Box>{confirmModal.action === 'enable' && <Alert type="warning">This scenario will automatically disable after 10 minutes.</Alert>}</SpaceBetween>)}
      </Modal>

      {/* CloudWatch Metrics Dashboard Modal */}
      <Modal
        visible={cloudwatchModalVisible}
        onDismiss={() => setCloudwatchModalVisible(false)}
        header={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <span>Amazon CloudWatch — Live Metrics</span>
            <span style={{ fontSize: 13, fontWeight: 400, color: '#94a3b8', background: '#f1f5f9', padding: '4px 12px', borderRadius: 6, marginRight: 16 }}>Last 30 minutes</span>
          </div>
        }
        size="max"
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24, padding: '8px 0' }}>
          {[
            { label: 'AWS Lambda Errors', unit: '%', data: sparklineHistory.lambda, threshold: 5, color: '#ef4444', max: 100, current: realtimeMetrics.lambdaErrorRate },
            { label: 'RDS CPU Utilization', unit: '%', data: sparklineHistory.rds, threshold: 40, color: '#3b82f6', max: 100, current: realtimeMetrics.rdsCpuUtilization },
            { label: 'SQS ApproximateNumberOfMessagesVisible', unit: 'msgs', data: sparklineHistory.sqs, threshold: 50, color: '#10b981', max: 200, current: realtimeMetrics.sqsQueueDepth },
          ].map((metric) => {
            const pts = metric.data.slice(-30);
            const chartMax = Math.max(...pts, metric.threshold, 1) * 1.2;
            const w = 800, h = 160;
            const line = pts.length >= 2 ? pts.map((v, i) => `${(i / (pts.length - 1)) * w},${h - (v / chartMax) * h}`).join(' ') : '';
            const area = pts.length >= 2 ? `0,${h} ${line} ${w},${h}` : '';
            const threshY = h - (metric.threshold / chartMax) * h;
            const isAbove = metric.current > metric.threshold;
            return (
              <div key={metric.label} style={{ background: '#f8fafc', borderRadius: 12, padding: 20, border: isAbove ? '1px solid #fca5a5' : '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{metric.label}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Threshold: {metric.threshold} {metric.unit}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: isAbove ? '#ef4444' : metric.color, fontVariantNumeric: 'tabular-nums' }}>
                      {metric.current.toFixed(metric.unit === '%' ? 1 : 0)}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{metric.unit}</div>
                  </div>
                </div>
                <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: h, overflow: 'visible' }} aria-label={`${metric.label} time series`}>
                  <defs>
                    <linearGradient id={`cw-fill-${metric.color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={metric.color} stopOpacity={0.2} />
                      <stop offset="100%" stopColor={metric.color} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  {/* grid lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
                    <line key={pct} x1={0} y1={h * pct} x2={w} y2={h * pct} stroke="#e2e8f0" strokeWidth={0.5} />
                  ))}
                  {/* threshold line */}
                  <line x1={0} y1={threshY} x2={w} y2={threshY} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="6 4" opacity={0.6} />
                  <text x={w - 4} y={threshY - 4} textAnchor="end" fontSize={10} fill="#ef4444" opacity={0.7}>threshold</text>
                  {/* area + line */}
                  {pts.length >= 2 && (
                    <>
                      <polygon points={area} fill={`url(#cw-fill-${metric.color.replace('#', '')})`} />
                      <polyline points={line} fill="none" stroke={metric.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      {(() => {
                        const lastX = w;
                        const lastY = h - (pts[pts.length - 1] / chartMax) * h;
                        return <circle cx={lastX} cy={lastY} r={4} fill={isAbove ? '#ef4444' : metric.color} />;
                      })()}
                    </>
                  )}
                  {pts.length < 2 && (
                    <text x={w / 2} y={h / 2} textAnchor="middle" fontSize={13} fill="#94a3b8">Waiting for data...</text>
                  )}
                </svg>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: '#94a3b8' }}>
                  <span>{pts.length > 0 ? `${pts.length} data points` : 'No data'}</span>
                  <span>{isAbove ? '🔴 ALARM' : '✅ OK'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Modal>
    </div>
  );
};

export default CrossViewPage;
