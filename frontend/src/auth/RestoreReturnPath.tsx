import { useEffect, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { takeReturnPath } from './returnPath'

/** Puts the user back on the page they were on before the trip to Keycloak. */
export function RestoreReturnPath({ children }: { children: ReactNode }) {
  const navigate = useNavigate()

  useEffect(() => {
    const target = takeReturnPath()

    if (target && target !== '/' && target !== window.location.pathname + window.location.search) {
      navigate(target, { replace: true })
    }
  }, [navigate])

  return <>{children}</>
}
