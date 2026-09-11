import { alpha, createTheme } from '@mui/material'
import type { PaletteMode, Theme } from '@mui/material'
import type { PaletteOptions } from '@mui/material/styles'

/**
 * Both modes are built from the same brand colour. The light mode keeps the
 * original indigo; the dark mode lifts it so it still carries on a dark
 * surface, where the saturated original reads as a muddy blue.
 */
const palettes: Record<PaletteMode, PaletteOptions> = {
  light: {
    background: {
      default: '#f7f8fc',
      paper: '#ffffff',
    },
    primary: {
      dark: '#4147b9',
      light: '#7d83f2',
      main: '#5b61e8',
    },
    text: {
      primary: '#1d2433',
      secondary: '#697386',
    },
  },
  dark: {
    background: {
      default: '#0f1117',
      paper: '#171a23',
    },
    divider: 'rgba(255, 255, 255, 0.1)',
    primary: {
      dark: '#5b61e8',
      light: '#aeb2f9',
      main: '#8b90f5',
    },
    text: {
      primary: '#e7e9f2',
      secondary: '#9aa3b8',
    },
  },
}

export function createAppTheme(mode: PaletteMode) {
  return createTheme({
    palette: {
      mode,
      ...palettes[mode],
    },
    shape: {
      borderRadius: 8,
    },
    typography: {
      fontFamily: '"Inter", "Segoe UI", Roboto, Arial, sans-serif',
      button: {
        fontWeight: 700,
        textTransform: 'none',
      },
    },
    components: {
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            transition:
              'background-color 160ms ease, box-shadow 160ms ease, color 160ms ease, transform 160ms ease',
            '&:hover': {
              transform: 'translateY(-1px)',
            },
            '&:active': {
              transform: 'translateY(0)',
            },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            transition: 'background-color 160ms ease, color 160ms ease, transform 160ms ease',
            '&:hover': {
              transform: 'scale(1.04)',
            },
          },
        },
      },
      MuiPaper: {
        defaultProps: {
          elevation: 0,
        },
      },
    },
  })
}

/**
 * A wash of the brand colour, used for selected rows, soft buttons and icon
 * tiles. Taking it from the palette keeps it readable in both modes.
 */
export function tint(theme: Theme, amount: number) {
  return alpha(theme.palette.primary.main, amount)
}

/**
 * The brand colour at the weight that still reads as text on the current
 * surface: the deep shade on a light page, the airy one on a dark page.
 */
export function accentText(theme: Theme) {
  return theme.palette.mode === 'dark' ? theme.palette.primary.light : theme.palette.primary.dark
}

/** The brand coloured lift those same surfaces grow on hover. */
export function tintShadow(theme: Theme, amount = 0.14) {
  return `0 8px 18px ${alpha(theme.palette.primary.main, amount)}`
}

type ShadowLevel = 'flat' | 'lifted' | 'raised' | 'high'

const shadowGeometry: Record<ShadowLevel, string> = {
  flat: '0 1px 2px',
  lifted: '0 8px 18px',
  raised: '0 12px 28px',
  high: '0 14px 30px',
}

/**
 * A faint navy shadow separates cards on the light page. On a dark page the
 * same opacity would be invisible, so the dark mode drops to black and leans
 * much harder on it.
 */
const shadowOpacity: Record<PaletteMode, Record<ShadowLevel, number>> = {
  light: { flat: 0.04, lifted: 0.08, raised: 0.09, high: 0.1 },
  dark: { flat: 0.4, lifted: 0.5, raised: 0.55, high: 0.6 },
}

export function shadow(theme: Theme, level: ShadowLevel) {
  const mode = theme.palette.mode
  const rgb = mode === 'dark' ? '0, 0, 0' : '30, 42, 80'
  return `${shadowGeometry[level]} rgba(${rgb}, ${shadowOpacity[mode][level]})`
}

/**
 * Surfaces that sit on top of the page rather than on a card of their own.
 * `glass` floats over the page tint, `inset` is carved into a card, and `code`
 * is the background of a fenced code block.
 */
const surfaces: Record<PaletteMode, Record<'glass' | 'inset' | 'code', string>> = {
  light: {
    glass: 'rgba(255, 255, 255, 0.72)',
    inset: 'rgba(247, 248, 252, 0.82)',
    code: '#f6f8fa',
  },
  dark: {
    glass: 'rgba(255, 255, 255, 0.05)',
    inset: 'rgba(255, 255, 255, 0.04)',
    code: '#0d1117',
  },
}

export function surface(theme: Theme, name: 'glass' | 'inset' | 'code') {
  return surfaces[theme.palette.mode][name]
}

/**
 * The snippet preview stays dark in both modes — it is a terminal, not a card.
 * The dark mode only sinks it further so it still separates from the page.
 */
export function snippetSurface(theme: Theme) {
  return theme.palette.mode === 'dark'
    ? { bgcolor: '#0d1117', color: '#c9d1d9' }
    : { bgcolor: '#172033', color: '#dce7ff' }
}
