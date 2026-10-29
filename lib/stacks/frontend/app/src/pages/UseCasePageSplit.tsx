import { useNavigate } from 'react-router-dom'
import { Button } from '@/ui/button'
import { Card, CardContent } from '@/ui/card'
import { Header } from '@/ui/header'
import { useDarkMode } from '@/lib/use-dark-mode'
import { ArrowRight, CheckCircle2, Network } from 'lucide-react'
import { signOut } from 'aws-amplify/auth'
import { demoConfig } from '@/demo.config'

export interface UseCasePageSplitProps {
  title?: string
  logoUrl?: string
  logoUrlDark?: string
  headline?: string
  subtitle?: string
  paragraphs?: string[]
  benefits?: string[]
  ctaLabel?: string
  onContinue?: () => void
  onArchitectureClick?: () => void
  customActions?: React.ReactNode
}

export function UseCasePageSplit({
  title = demoConfig.title,
  logoUrl = demoConfig.logo || undefined,
  logoUrlDark = demoConfig.logoDark || undefined,
  headline = 'Business Use Case',
  subtitle = 'Discover how this solution addresses real-world challenges',
  paragraphs = [
    'Organizations face increasing complexity in managing workflows at scale. This demo showcases how AWS services streamline operations.',
    'By leveraging generative AI and cloud-native architecture, teams can automate repetitive tasks and gain actionable insights.',
  ],
  benefits = [
    'Reduce operational overhead by up to 60%',
    'Improve accuracy with AI-powered automation',
    'Scale seamlessly with cloud-native architecture',
    'Accelerate time-to-market for new features',
  ],
  ctaLabel = 'Start Demo',
  onContinue,
  onArchitectureClick,
  customActions,
}: UseCasePageSplitProps) {
  const navigate = useNavigate()
  const { isDark, toggle: toggleDarkMode } = useDarkMode()
  const handleContinue = onContinue ?? (() => navigate('/demo'))
  const handleArchitecture = onArchitectureClick ?? (() => {})

  const logoElement = logoUrl ? (
    <div className="flex items-center">
      <img src={logoUrl} alt="Logo" className="h-6 dark:hidden" />
      <img src={logoUrlDark || logoUrl} alt="Logo" className="h-6 hidden dark:block" />
    </div>
  ) : undefined

  return (
    <div className="h-screen flex flex-col text-foreground">
      <Header title={title} description={demoConfig.description} logo={logoElement} isDark={isDark} onDarkModeToggle={toggleDarkMode} showDarkModeToggle
        onSignOut={async () => { try { await signOut() } catch (e) { console.log('Sign out failed:', e) } }}
        actions={
          <Button variant="ghost" size="sm" onClick={handleArchitecture} title="Architecture">
            <Network className="h-4 w-4" />
          </Button>
        }
      />
      <div className="flex-1 flex min-h-0 p-6 gap-6">
        <div className="w-1/2 overflow-auto pr-4 space-y-6">
          <div className="space-y-3">
            <p className="text-sm font-medium text-primary uppercase tracking-wider">Overview</p>
            <h1 className="text-3xl font-bold tracking-tight">{headline}</h1>
            <p className="text-lg text-muted-foreground">{subtitle}</p>
          </div>
          <div className="space-y-4">
            {paragraphs.map((p, i) => (
              <p key={i} className="text-base text-muted-foreground leading-relaxed">{p}</p>
            ))}
          </div>
          {customActions ? customActions : ctaLabel && (
            <Button size="lg" className="px-8" onClick={handleContinue}>
              {ctaLabel} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="w-1/2 flex items-center">
          <Card className="w-full">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-lg font-semibold">Key Benefits</h2>
              <div className="space-y-3">
                {benefits.map((b, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <p className="text-sm text-muted-foreground">{b}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
