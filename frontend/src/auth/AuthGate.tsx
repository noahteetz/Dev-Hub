import type { ReactNode } from 'react'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { useAuth } from 'react-oidc-context'
import { rememberReturnPath } from './returnPath'

interface AuthGateProps {
  children: ReactNode
}

/**
 * Nothing of Dev Hub renders until Keycloak has confirmed who is asking. The
 * backend rejects untokened calls anyway; this only keeps the user from staring
 * at an app full of failing requests.
 */
export function AuthGate({ children }: AuthGateProps) {
  const auth = useAuth()

  if (auth.activeNavigator || auth.isLoading) {
    return (
      <AuthScreen>
        <Stack spacing={2} sx={{ alignItems: 'center' }}>
          <CircularProgress size={28} />
          <Typography color="text.secondary" variant="body2">
            Signing you in…
          </Typography>
        </Stack>
      </AuthScreen>
    )
  }

  if (auth.error) {
    return (
      <AuthScreen>
        <Stack spacing={2}>
          <Alert severity="error">{auth.error.message}</Alert>
          <Button fullWidth variant="contained" onClick={() => void auth.signinRedirect()}>
            Try again
          </Button>
        </Stack>
      </AuthScreen>
    )
  }

  if (!auth.isAuthenticated) {
    return (
      <AuthScreen>
        <Stack spacing={2.5} sx={{ alignItems: 'center' }}>
          <LockOutlinedIcon color="primary" sx={{ fontSize: 36 }} />
          <Box sx={{ textAlign: 'center' }}>
            <Typography sx={{ fontWeight: 800, letterSpacing: -0.3 }} variant="h6">
              Dev Hub
            </Typography>
            <Typography color="text.secondary" variant="body2">
              Your projects, notes and snippets are behind a sign in.
            </Typography>
          </Box>
          <Button
            fullWidth
            size="large"
            variant="contained"
            onClick={() => {
              rememberReturnPath()
              void auth.signinRedirect()
            }}
          >
            Sign in
          </Button>
        </Stack>
      </AuthScreen>
    )
  }

  return <>{children}</>
}

function AuthScreen({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        alignItems: 'center',
        display: 'flex',
        justifyContent: 'center',
        minHeight: '100dvh',
        p: 3,
      }}
    >
      <Paper sx={{ border: 1, borderColor: 'divider', maxWidth: 380, p: 4, width: '100%' }}>
        {children}
      </Paper>
    </Box>
  )
}
