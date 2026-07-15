import { useNavigate } from 'react-router-dom'
import { Button } from '@/ui/button'
import { Card, CardContent } from '@/ui/card'
import { Header } from '@/ui/header'
import { useDarkMode } from '@/lib/use-dark-mode'
import { ExternalLink, ArrowRight, Trophy, Network } from 'lucide-react'
import { demoConfig } from '@/demo.config'

export interface ConclusionPageSplitProps {
  title?: string
  logoUrl?: string
  logoUrlDark?: string
  headline?: string
  summary?: string
  outcomes?: { label: string; value: string; description?: string }[]
  nextSteps?: string[]
  ctaLabel?: string
  ctaSecondaryLabel?: string
  onCtaClick?: () => void
  onArchitectureClick?: () => void
  onSecondaryClick?: () => void
}

export function ConclusionPageSplit({
  title = demoConfig.title,
  logoUrl = demoConfig.logo || undefined,
  logoUrlDark = demoConfig.logoDark || undefined,
  headline = 'Demo Complete',
  summary = 'Here is what we demonstrated and the results achieved.',
  outcomes = [
    { label: 'Processing Time', value: '< 2s', description: 'End-to-end latency' },
    { label: 'Accuracy Rate', value: '99.2%', description: 'Model prediction accuracy' },
    { label: 'Cost per Request', value: '$0.003', description: 'Per-invocation cost' },
    { label: 'Availability', value: '99.99%', description: 'Multi-AZ SLA' },
  ],
  nextSteps = [
    'Schedule a deep-dive session with our solutions architects',
    'Access the sandbox environment to explore on your own',
    'Review the architecture documentation and best practices',
    'Connect with your account team for pricing details',
  ],
  ctaLabel = 'Get Started',
  ctaSecondaryLabel = 'View Documentation',
  onCtaClick,
  onArchitectureClick,
  onSecondaryClick,
}: ConclusionPageSplitProps) {
  const navigate = useNavigate()
  const { isDark, toggle: toggleDarkMode } = useDarkMode()
  const handleCta = onCtaClick ?? (() => navigate('/'))
  const handleArchitecture = onArchitectureClick ?? (() => {})
  const handleSecondary = onSecondaryClick ?? (() => {})

  const logoElement = logoUrl ? (
    <div className="flex items-center">
      <img src={logoUrl} alt="Logo" className="h-6 dark:hidden" />
      <img src={logoUrlDark || logoUrl} alt="Logo" className="h-6 hidden dark:block" />
    </div>
  ) : undefined

  return (
    <div className="h-screen flex flex-col text-foreground">
      <Header title={title} description={demoConfig.description} logo={logoElement} isDark={isDark} onDarkModeToggle={toggleDarkMode} showDarkModeToggle
        actions={
          <Button variant="ghost" size="sm" onClick={handleArchitecture} title="Architecture">
            <Network className="h-4 w-4" />
          </Button>
        }
      />
      <div className="flex-1 flex min-h-0 p-6 gap-6">
        <div className="w-1/2 overflow-auto pr-4 space-y-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 text-primary">
              <Trophy className="h-5 w-5" />
              <p className="text-sm font-medium uppercase tracking-wider">Results</p>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{headline}</h1>
            <p className="text-base text-muted-foreground">{summary}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {outcomes.map((o, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <p className="text-xl font-bold text-primary">{o.value}</p>
                  <p className="text-xs font-medium mt-1">{o.label}</p>
                  {o.description && <p className="text-[10px] text-muted-foreground">{o.description}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        <div className="w-1/2 flex flex-col justify-center space-y-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="text-lg font-semibold">Next Steps</h2>
              <ol className="space-y-3">
                {nextSteps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{i + 1}</span>
                    <p className="text-sm text-muted-foreground">{step}</p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
          <div className="flex items-center gap-3">
            <Button size="lg" className="px-8" onClick={handleCta}>
              {ctaLabel} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="outline" size="lg" onClick={handleSecondary}>
              {ctaSecondaryLabel} <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
