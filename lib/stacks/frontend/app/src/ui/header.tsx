import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from '@/lib/utils'
import { Button } from '@/ui/button'
import { LogOut, Moon, Sun } from "lucide-react"

const headerVariants = cva(
  "w-full shadow-sm transition-colors sticky top-0 z-50",
  {
    variants: {
      variant: {
        default: "bg-background border-b rounded-b-3xl",
        primary: "bg-primary text-primary-foreground rounded-b-3xl",
        accent: "bg-accent text-accent-foreground rounded-b-2xl",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface HeaderProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof headerVariants> {
  logo?: React.ReactNode
  title?: string
  description?: string
  navigation?: React.ReactNode
  actions?: React.ReactNode
  isDark?: boolean
  onDarkModeToggle?: () => void
  showDarkModeToggle?: boolean
  badge?: string
  onSignOut?: () => void
}

const Header = React.forwardRef<HTMLElement, HeaderProps>(
  ({
    className,
    variant,
    logo,
    title = "AWS Design Library",
    description,
    navigation,
    actions,
    isDark = false,
    onDarkModeToggle,
    showDarkModeToggle = true,
    badge = "demo",
    onSignOut,
    ...props
  }, ref) => {
    return (
      <header
        ref={ref}
        className={cn(headerVariants({ variant, className }))}
        {...props}
      >
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            {logo || null}
            <span className="text-sm font-medium">{title}</span>
            {description && (
              <p className="hidden md:block text-xs text-muted-foreground truncate max-w-md">{description}</p>
            )}
            {badge && (
              <span className="text-[10px] font-medium uppercase tracking-wider rounded px-1.5 py-0.5" style={{ color: '#FF9900', borderColor: '#FFBB45', borderWidth: '1px', borderStyle: 'solid' }}>
                {badge}
              </span>
            )}
            {navigation}
          </div>

          <div className="flex items-center gap-3">
            {actions}
            {showDarkModeToggle && onDarkModeToggle && (
              <Button variant="ghost" size="sm" onClick={onDarkModeToggle}>
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            )}
            {onSignOut && (
              <Button variant="ghost" size="sm" onClick={onSignOut} title="Sign out">
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </header>
    )
  }
)

Header.displayName = "Header"

export { Header, headerVariants }
