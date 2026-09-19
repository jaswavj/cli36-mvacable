import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

export type ThemeMode = 'light' | 'dark'

const STORAGE_KEY = 'billing-theme-mode'

const readStoredMode = (): ThemeMode => {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export const syncDocumentTheme = (mode?: ThemeMode): ThemeMode => {
  const next = mode ?? readStoredMode()
  if (typeof document === 'undefined') {
    return next
  }
  document.documentElement.dataset.theme = next
  document.documentElement.style.colorScheme = next
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    /* ignore */
  }
  return next
}

type ThemeContextValue = {
  mode: ThemeMode
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export const useThemeMode = () => {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useThemeMode must be used within ThemeRoot')
  }
  return ctx
}

const ThemeRoot = ({ children }: { children: ReactNode }) => {
  const [mode, setMode] = useState<ThemeMode>(readStoredMode)

  const toggleTheme = useCallback(() => {
    setMode((current) => syncDocumentTheme(current === 'dark' ? 'light' : 'dark'))
  }, [])

  const value = useMemo(() => ({ mode, toggleTheme }), [mode, toggleTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export default ThemeRoot
