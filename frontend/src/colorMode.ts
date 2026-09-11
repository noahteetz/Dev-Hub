import { createContext, useContext } from 'react'
import type { PaletteMode } from '@mui/material'

/** What the user picked. `system` follows the operating system as it changes. */
export type ColorPreference = PaletteMode | 'system'

/**
 * The same key is read by the inline script in index.html, which paints the
 * page before React starts. Change it in both places or the first frame of a
 * reload flashes the wrong colour.
 */
export const COLOR_MODE_KEY = 'devhub.color-mode'

export const DARK_QUERY = '(prefers-color-scheme: dark)'

export interface ColorModeContextValue {
  preference: ColorPreference
  /** What is actually on screen, with `system` already resolved. */
  mode: PaletteMode
  setPreference: (preference: ColorPreference) => void
}

/**
 * A component rendered without the provider — in tests, mostly — stays on the
 * light theme instead of crashing.
 */
export const ColorModeContext = createContext<ColorModeContextValue>({
  preference: 'system',
  mode: 'light',
  setPreference: () => {},
})

export function useColorMode() {
  return useContext(ColorModeContext)
}

/** A stored value from an older or tampered-with browser is simply ignored. */
export function readPreference(): ColorPreference {
  try {
    const stored = window.localStorage.getItem(COLOR_MODE_KEY)
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system'
  } catch {
    return 'system'
  }
}

export function writePreference(preference: ColorPreference) {
  try {
    window.localStorage.setItem(COLOR_MODE_KEY, preference)
  } catch {
    // A browser that refuses storage still gets the theme, just not across reloads.
  }
}

/** jsdom and older browsers have no matchMedia, so the light theme wins there. */
export function systemPrefersDark() {
  return typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches
}
