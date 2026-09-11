import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { CssBaseline, ThemeProvider } from '@mui/material'
import type { PaletteMode } from '@mui/material'
import {
  ColorModeContext,
  DARK_QUERY,
  readPreference,
  systemPrefersDark,
  writePreference,
} from './colorMode'
import type { ColorPreference } from './colorMode'
import { createAppTheme } from './theme'
import { SyntaxHighlightStyles } from './syntaxTheme'

/** Holds the chosen theme and hands the whole app the palette that follows it. */
export function ColorModeProvider({ children }: { children: ReactNode }) {
  const [preference, setStoredPreference] = useState<ColorPreference>(readPreference)
  const [systemMode, setSystemMode] = useState<PaletteMode>(() => (systemPrefersDark() ? 'dark' : 'light'))

  // Someone flipping their desktop to dark should move the app with it.
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return

    const query = window.matchMedia(DARK_QUERY)
    const update = (event: MediaQueryListEvent) => setSystemMode(event.matches ? 'dark' : 'light')
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  const mode = preference === 'system' ? systemMode : preference

  const setPreference = useCallback((next: ColorPreference) => {
    setStoredPreference(next)
    writePreference(next)
  }, [])

  // Keeps the pre-paint styles in index.css on the same mode as the app.
  useEffect(() => {
    document.documentElement.dataset.colorMode = mode
  }, [mode])

  const theme = useMemo(() => createAppTheme(mode), [mode])
  const value = useMemo(() => ({ mode, preference, setPreference }), [mode, preference, setPreference])

  return (
    <ColorModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SyntaxHighlightStyles />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  )
}
