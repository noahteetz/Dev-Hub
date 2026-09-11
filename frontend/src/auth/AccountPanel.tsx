import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded'
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded'
import { Avatar, Button, Chip, Paper, Stack, Typography } from '@mui/material'
import { useOptionalAuth } from './useOptionalAuth'

/**
 * Who is signed in, and the way out. Renders nothing when the deployment runs
 * without a login, so the settings page stays correct either way.
 */
export function AccountPanel() {
  const auth = useOptionalAuth()

  if (!auth?.isAuthenticated) {
    return null
  }

  const profile = auth.user?.profile
  const name = profile?.name || profile?.preferred_username || 'Signed in'
  const email = profile?.email ?? ''
  const roles = realmRoles(auth.user?.access_token)

  return (
    <Paper sx={{ border: 1, borderColor: 'divider', mb: 4, p: 3 }} variant="outlined">
      <Typography component="h2" sx={{ fontWeight: 800, mb: 2 }} variant="h6">
        Account
      </Typography>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
      >
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <Avatar sx={{ bgcolor: 'primary.main' }}>
            <PersonOutlineRoundedIcon fontSize="small" />
          </Avatar>
          <div>
            <Typography sx={{ fontWeight: 700 }}>{name}</Typography>
            <Typography color="text.secondary" variant="body2">
              {email || 'Signed in through Keycloak'}
            </Typography>
            <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', mt: 0.75 }}>
              {roles.map((role) => (
                <Chip key={role} label={role} size="small" variant="outlined" />
              ))}
            </Stack>
          </div>
        </Stack>
        <Button
          startIcon={<LogoutRoundedIcon />}
          variant="outlined"
          onClick={() => void auth.signoutRedirect()}
        >
          Sign out
        </Button>
      </Stack>
    </Paper>
  )
}

/** Reads the realm roles straight out of the access token, without a round trip. */
function realmRoles(accessToken: string | undefined): string[] {
  if (!accessToken) {
    return []
  }

  try {
    const payload = JSON.parse(atob(accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as {
      realm_access?: { roles?: string[] }
    }
    return (payload.realm_access?.roles ?? []).filter((role) => role.startsWith('devhub-')).sort()
  } catch {
    return []
  }
}
