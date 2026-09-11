import { StrictMode, type ReactNode } from 'react'
import { Alert, Box, CssBaseline, Paper, ThemeProvider } from '@mui/material'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { theme } from './theme'
import { RestoreReturnPath } from './auth/RestoreReturnPath'

/** Everything the app needs around it, whether or not a login sits in front. */
export function Shell({ children }: { children: ReactNode }) {
  return (
    <StrictMode>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </StrictMode>
  )
}

export function DevHub() {
  return (
    <BrowserRouter>
      <RestoreReturnPath>
        <App />
      </RestoreReturnPath>
    </BrowserRouter>
  )
}

/** Shown when the app cannot even find out whether it needs a login. */
export function StartupError({ message }: { message: string }) {
  return (
    <Box sx={{ alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: '100dvh', p: 3 }}>
      <Paper sx={{ border: 1, borderColor: 'divider', maxWidth: 420, p: 3, width: '100%' }} variant="outlined">
        <Alert severity="error">{message}</Alert>
      </Paper>
    </Box>
  )
}
