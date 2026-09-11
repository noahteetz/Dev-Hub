import { UserManager, WebStorageStateStore, type UserManagerSettings } from 'oidc-client-ts'
import type { AuthSettings } from './authSettings'

/**
 * Authorization code flow with PKCE, the flow Keycloak expects from a browser
 * application. No client secret is involved — a secret shipped to the browser
 * would not be one.
 */
export function createUserManager(settings: AuthSettings): UserManager {
  const origin = window.location.origin

  const oidcSettings: UserManagerSettings = {
    authority: settings.issuer,
    client_id: settings.clientId,
    redirect_uri: `${origin}/`,
    post_logout_redirect_uri: `${origin}/`,
    response_type: 'code',
    scope: settings.scope,
    // Refreshed from the refresh token in the background, without the hidden
    // iframe that third party cookie rules keep breaking.
    automaticSilentRenew: true,
    monitorSession: false,
    // Survives a reload and a second tab; cleared on logout.
    userStore: new WebStorageStateStore({ store: window.localStorage }),
    stateStore: new WebStorageStateStore({ store: window.localStorage }),
  }

  return new UserManager(oidcSettings)
}

/**
 * The token for the next API call. An expired token is renewed first, so a tab
 * left open overnight recovers instead of failing every request.
 */
export async function currentAccessToken(manager: UserManager): Promise<string | null> {
  const stored = await manager.getUser()

  if (stored && !stored.expired) {
    return stored.access_token
  }

  try {
    const renewed = await manager.signinSilent()
    return renewed?.access_token ?? null
  } catch {
    return null
  }
}

/** Strips the code and state that Keycloak appends, keeping the route the user was on. */
export function cleanUpRedirect() {
  window.history.replaceState({}, document.title, window.location.pathname)
}
