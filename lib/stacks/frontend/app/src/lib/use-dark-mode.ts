import { useCallback } from 'react'
import { useTheme } from '../common/contexts/ThemeContext'

/**
 * Hook to manage dark mode.
 * Delegates to the central ThemeContext so Cloudscape mode,
 * body background, and the Tailwind `dark` class all stay in sync.
 */
export function useDarkMode() {
  const { isDarkMode, toggleMode } = useTheme()

  const toggle = useCallback(() => {
    toggleMode()
  }, [toggleMode])

  return { isDark: isDarkMode, toggle }
}
