/**
 * The login settings come from the backend instead of a build time variable, so
 * one frontend image works in every environment it is deployed into.
 */
export interface AuthSettings {
  enabled: boolean
  issuer: string
  clientId: string
  scope: string
}

const disabled: AuthSettings = { enabled: false, issuer: '', clientId: '', scope: '' }

/**
 * Reads /api/auth/config. A failure is deliberately not swallowed: the app must
 * not fall back to an open state just because the backend is unreachable.
 */
export async function fetchAuthSettings(): Promise<AuthSettings> {
  const response = await fetch('/api/auth/config', { headers: { Accept: 'application/json' } })

  if (!response.ok) {
    throw new Error(`The server did not return its login settings (${response.status}).`)
  }

  const payload = (await response.json()) as Partial<AuthSettings>

  if (!payload.enabled) {
    return disabled
  }

  if (!payload.issuer || !payload.clientId) {
    throw new Error('The server requires a login but did not name a Keycloak realm or client.')
  }

  return {
    enabled: true,
    issuer: payload.issuer,
    clientId: payload.clientId,
    scope: payload.scope || 'openid profile email',
  }
}
