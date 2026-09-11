import { GlobalStyles, useTheme } from '@mui/material'
import darkSyntax from 'highlight.js/styles/github-dark.css?inline'
import lightSyntax from 'highlight.js/styles/github.css?inline'

/**
 * highlight.js ships one finished stylesheet per theme and both use the same
 * class names, so the app swaps the whole sheet instead of layering overrides.
 * Importing them as text keeps only the active one in the document.
 */
export function SyntaxHighlightStyles() {
  const theme = useTheme()

  return <GlobalStyles styles={theme.palette.mode === 'dark' ? darkSyntax : lightSyntax} />
}
