import { useNavigate } from 'react-router-dom'
import { Button } from '@/ui/button'
import { Card } from '@/ui/card'
import { demoConfig } from '@/demo.config'

export interface LandingPageSplitProps {
  backgroundUrl?: string
  backgroundType?: 'video' | 'image'
  logoUrl?: string
  logoUrlDark?: string
  title?: string
  description?: string
  tagline?: string
  ctaLabel?: string
  onCtaClick?: () => void
}

export function LandingPageSplit({
  backgroundUrl = demoConfig.background,
  backgroundType = demoConfig.backgroundType,
  logoUrl = demoConfig.logo || undefined,
  logoUrlDark = demoConfig.logoDark || undefined,
  title = demoConfig.title,
  description = demoConfig.description,
  tagline = demoConfig.tagline,
  ctaLabel = demoConfig.ctaLabel,
  onCtaClick,
}: LandingPageSplitProps) {
  const navigate = useNavigate()
  const isVideo = backgroundType === 'video'
  const handleCta = onCtaClick ?? (() => navigate('/usecase'))

  return (
    <div className="h-screen flex">
      {/* Left side — content */}
      <div className="w-1/2 flex flex-col justify-center px-12 lg:px-20">
        {logoUrl && (
          <div className="mb-8">
            <img src={logoUrl} alt="Logo" className="h-10 dark:hidden" />
            <img src={logoUrlDark || logoUrl} alt="Logo" className="h-10 hidden dark:block" />
          </div>
        )}

        {tagline && (
          <span className="text-sm font-medium text-primary uppercase tracking-wider mb-3">
            {tagline}
          </span>
        )}

        <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-4">
          {title}
        </h1>

        <p className="text-lg text-muted-foreground mb-8 max-w-md">
          {description}
        </p>

        <div>
          <Button
            size="lg"
            className="px-10 h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-base"
            onClick={handleCta}
          >
            {ctaLabel}
          </Button>
        </div>
      </div>

      {/* Right side — background media */}
      <div className="w-3/5 relative overflow-hidden">
        <Card className="absolute inset-4 overflow-hidden border-0">
          {isVideo && backgroundUrl ? (
            <video
              key={backgroundUrl}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-contain rounded-lg"
            >
              <source src={backgroundUrl} type="video/mp4" />
            </video>
          ) : backgroundUrl ? (
            <div
              className="w-full h-full bg-cover bg-center rounded-lg"
              style={{ backgroundImage: `url(${backgroundUrl})` }}
            />
          ) : (
            <div className="w-full h-full bg-primary/10 rounded-lg" />
          )}
        </Card>
      </div>
    </div>
  )
}
