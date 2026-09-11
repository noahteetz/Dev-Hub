import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import type { RemoteRepository, RepositoryOwner, RepositoryProvider } from '../types'

const DEBOUNCE_MS = 250

interface Settled {
  /** Which request this answer belongs to. Anything else on screen would be stale. */
  request: string
  repositories: RemoteRepository[]
  error: string
}

/**
 * The repositories a stored token can reach. The server answers from a short-lived cache,
 * so typing in the picker does not hit the provider on every keystroke.
 *
 * Results are tagged with the request that produced them. Changing provider, term or owner
 * therefore empties the list immediately instead of leaving the previous answer clickable.
 */
export function useRemoteRepositories(
  provider: RepositoryProvider,
  term: string,
  owner: string,
  enabled = true,
) {
  const [settled, setSettled] = useState<Settled>({ request: '', repositories: [], error: '' })
  const [owners, setOwners] = useState<RepositoryOwner[]>([])
  const [reloadCount, setReloadCount] = useState(0)
  const trimmed = term.trim()
  const request = `${provider}|${trimmed}|${owner}|${reloadCount}`

  useEffect(() => {
    if (!enabled) {
      return
    }

    let current = true
    const timer = setTimeout(() => {
      api.gitRepositories
        .list(provider, trimmed, owner)
        .then((found) => {
          if (current) {
            setSettled({ request, repositories: found, error: '' })
          }
        })
        .catch((reason: unknown) => {
          if (current) {
            setSettled({
              request,
              repositories: [],
              error: reason instanceof Error ? reason.message : 'The repositories could not be loaded.',
            })
          }
        })
    }, DEBOUNCE_MS)

    return () => {
      current = false
      clearTimeout(timer)
    }
  }, [enabled, owner, provider, request, trimmed])

  useEffect(() => {
    if (!enabled) {
      return
    }

    let current = true
    api.gitRepositories
      .owners(provider)
      .then((found) => {
        if (current) {
          setOwners(found)
        }
      })
      // A failing owner list only removes a filter; the error of the listing itself is enough.
      .catch(() => {
        if (current) {
          setOwners([])
        }
      })

    return () => {
      current = false
    }
  }, [enabled, provider, reloadCount])

  /** Drops the server-side cache. The listing is only refetched when that succeeded. */
  const reload = useCallback(async () => {
    try {
      await api.gitRepositories.refresh(provider)
      setReloadCount((current) => current + 1)
    } catch (reason: unknown) {
      setSettled({
        request,
        repositories: [],
        error: reason instanceof Error ? reason.message : 'The repositories could not be reloaded.',
      })
    }
  }, [provider, request])

  const fresh = settled.request === request
  return {
    repositories: fresh ? settled.repositories : [],
    error: fresh ? settled.error : '',
    loading: enabled && !fresh,
    owners,
    reload,
  }
}
