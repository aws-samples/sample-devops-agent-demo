import { useNavigate } from 'react-router-dom'
import { Button } from '@/ui/button'
import { Card, CardContent } from '@/ui/card'
import { Header } from '@/ui/header'
import { useDarkMode } from '@/lib/use-dark-mode'
import { ArrowRight, Network } from 'lucide-react'
import { signOut } from 'aws-amplify/auth'
import { demoConfig } from '@/demo.config'

export interface UseCasePageProps {
  title?: string
  description?: string
  logoUrl?: string
  logoUrlDark?: string
  headline?: string
  subtitle?: string
  paragraphs?: string[]
  highlights?: { label: string; value: string }[] | null
  ctaLabel?: string
  onContinue?: () => void
  onArchitectureClick?: () => void
  breadcrumb?: React.ReactNode
  bodySlot?: React.ReactNode
}

export function UseCasePage({
  title = demoConfig.title,
  description = demoConfig.description,
  logoUrl = demoConfig.logo || undefined,
  logoUrlDark = demoConfig.logoDark || undefined,
  headline = 'Business Use Case',
  subtitle = 'Discover how this solution addresses real-world challenges',
  paragraphs = [],
  highlights,
  ctaLabel = 'Start Demo',
  onContinue,
  onArchitectureClick,
  breadcrumb,
  bodySlot,
}: UseCasePageProps) {
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
      <Header title={title} description={description} logo={logoElement} isDark={isDark} onDarkModeToggle={toggleDarkMode} showDarkModeToggle
        onSignOut={async () => { try { await signOut() } catch (e) { console.log('Sign out failed:', e) } }}
        actions={
          <Button variant="ghost" size="sm" onClick={handleArchitecture} title="Architecture">
            <Network className="h-4 w-4" />
          </Button>
        }
      />
      <div className="flex-1 overflow-auto min-h-0">
        <div className="w-full h-full px-6 py-5 flex flex-col">
          {breadcrumb && <div className="mb-4">{breadcrumb}</div>}

          {!bodySlot && (
            <>
              <div className="space-y-3 mb-6">
                <p className="text-sm font-medium text-primary uppercase tracking-wider">Overview</p>
                <h1 className="text-3xl font-bold tracking-tight">{headline}</h1>
                {subtitle && <p className="text-lg text-muted-foreground">{subtitle}</p>}
              </div>

              {highlights && highlights.length > 0 && (
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {highlights.map((h, i) => (
                    <Card key={i}>
                      <CardContent className="p-5 text-center">
                        <p className="text-3xl font-bold text-primary">{h.value}</p>
                        <p className="text-sm text-muted-foreground mt-1">{h.label}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {paragraphs.length > 0 && (
                <div className="space-y-4 mb-6">
                  {paragraphs.map((p, i) => (
                    <p key={i} className="text-base text-muted-foreground leading-relaxed">{p}</p>
                  ))}
                </div>
              )}

              {ctaLabel && (
                <Button size="lg" className="px-8" onClick={handleContinue}>
                  {ctaLabel} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </>
          )}

          {bodySlot && (
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="space-y-2 mb-4 shrink-0">
                <h1 className="text-2xl font-bold tracking-tight">{headline}</h1>
                {subtitle && <p className="text-base text-muted-foreground">{subtitle}</p>}
              </div>
              {bodySlot}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
