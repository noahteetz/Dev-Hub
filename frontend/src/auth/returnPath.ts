const KEY = 'devhub.returnTo'

/**
 * Keycloak always sends the browser back to the root of the app, so the route
 * the user was on is written down before leaving and restored afterwards.
 */
export function rememberReturnPath() {
  sessionStorage.setItem(KEY, window.location.pathname + window.location.search)
}

/** Reads the remembered route once and forgets it. */
export function takeReturnPath(): string | null {
  const target = sessionStorage.getItem(KEY)
  sessionStorage.removeItem(KEY)
  return target
}
