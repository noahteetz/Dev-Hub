import { useContext } from 'react'
import { AuthContext, type AuthContextProps } from 'react-oidc-context'

/**
 * The auth context, or undefined when the deployment runs without a login.
 * useAuth() would throw in that case, which would take the whole page down.
 */
export function useOptionalAuth(): AuthContextProps | undefined {
  return useContext(AuthContext)
}
