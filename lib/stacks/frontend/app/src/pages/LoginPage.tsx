import { useState } from 'react'
import { Button } from '@/ui/button'
import { Card, CardContent, CardHeader } from '@/ui/card'
import { Input } from '@/ui/input'
import { Label } from '@/ui/label'
import { Eye, EyeOff } from 'lucide-react'
import { demoConfig } from '@/demo.config'

export interface LoginPageProps {
  backgroundUrl?: string
  backgroundType?: 'video' | 'image'
  logoUrl?: string
  logoUrlDark?: string
  title?: string
  description?: string
  onSignIn?: () => void
  onSSOSignIn?: () => void
  onForgotPassword?: () => void
  ssoLabel?: React.ReactNode
  formSlot?: React.ReactNode
}

export function LoginPage({
  backgroundUrl = demoConfig.background,
  backgroundType = demoConfig.backgroundType,
  logoUrl = demoConfig.logo || undefined,
  logoUrlDark = demoConfig.logoDark || undefined,
  title = demoConfig.title,
  description = demoConfig.description,
  onSignIn,
  onSSOSignIn,
  onForgotPassword,
  ssoLabel,
  formSlot,
}: LoginPageProps) {
  const isVideo = backgroundType === 'video'
  const [showPassword, setShowPassword] = useState(false)

  const handleSignIn = onSignIn ?? (() => {})
  const handleSSOSignIn = onSSOSignIn ?? (() => {})

  return (
    <div className="h-screen relative flex items-center justify-center">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden bg-black">
        {isVideo && backgroundUrl ? (
          <video
            key={backgroundUrl}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          >
            <source src={backgroundUrl} type="video/mp4" />
          </video>
        ) : backgroundUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${backgroundUrl})`,
              filter: 'blur(3px)',
              transform: 'scale(1.1)'
            }}
          />
        ) : null}
        <div className="absolute inset-0 bg-black/50" />
      </div>

      {/* Floating Login Card */}
      <div className="relative z-10 w-xl px-4 ">
        <Card className="bg-white bg-background/80 text-foreground border">
          <CardHeader className="text-center pb-4 pt-6">
            {logoUrl && (
              <div className="flex justify-center mb-2">
                <img src={logoUrl} alt="Logo" className="h-8 dark:hidden" />
                <img src={logoUrlDark || logoUrl} alt="Logo" className="h-8 hidden dark:block" />
              </div>
            )}
            {title && <p className="text-base font-semibold text-foreground mt-1">{title}</p>}
            {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
          </CardHeader>
          <CardContent className="space-y-3 pb-6">
            {/* SSO button — always shown when ssoLabel or onSSOSignIn provided */}
            {(ssoLabel || onSSOSignIn) && !formSlot && (
              <>
                <Button variant="outline" className="w-full justify-center gap-2 h-11 text-sm border-primary/50 hover:bg-muted hover:border-primary" onClick={handleSSOSignIn}>
                  {ssoLabel ?? 'Sign in with SSO'}
                </Button>
                <div className="flex items-center gap-4 py-1">
                  <div className="flex-1 border-t border-border" />
                  <span className="text-xs text-muted-foreground">or</span>
                  <div className="flex-1 border-t border-border" />
                </div>
              </>
            )}

            {formSlot ? formSlot : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="username" className="text-sm font-normal text-foreground">Username</Label>
                  <Input id="username" type="text" placeholder="Enter your Username" className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-sm font-normal text-foreground">Password</Label>
                  <div className="relative">
                    <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="Enter your Password" className="h-10 pr-10" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-sm " onClick={handleSignIn}>Sign in</Button>
                <div className="text-center pt-1">
                  <button onClick={onForgotPassword} className="text-sm text-primary hover:underline font-medium hover:text-primary/80">Forgot your password?</button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
