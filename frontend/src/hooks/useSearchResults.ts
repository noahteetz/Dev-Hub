import { useEffect, useState } from 'react'
import { api } from '../api'
import type { SearchParams, SearchResult } from '../types'

const DEBOUNCE_MS = 250
const MINIMUM_TERM_LENGTH = 2

type Filters = Omit<SearchParams, 'q'>

/** Debounced global search. Terms shorter than two characters never reach the server. */
export function useSearchResults(term: string, filters: Filters = {}, enabled = true) {
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const filterKey = JSON.stringify(filters)
  const trimmed = term.trim()
  const active = enabled && trimmed.length >= MINIMUM_TERM_LENGTH

  useEffect(() => {
    if (!active) {
      return
    }

    let current = true
    const timer = setTimeout(() => {
      setLoading(true)
      api.search
        .query({ q: trimmed, ...(JSON.parse(filterKey) as Filters) })
        .then((found) => {
          if (current) {
            setResults(found)
            setError('')
          }
        })
        .catch((reason: unknown) => {
          if (current) {
            setResults([])
            setError(reason instanceof Error ? reason.message : 'The search failed.')
          }
        })
        .finally(() => {
          if (current) {
            setLoading(false)
          }
        })
    }, DEBOUNCE_MS)

    return () => {
      current = false
      clearTimeout(timer)
    }
  }, [active, filterKey, trimmed])

  // A term below the minimum length shows nothing at all instead of a stale result list.
  return active
    ? { results, loading, error }
    : { results: [] as SearchResult[], loading: false, error: '' }
}

export { MINIMUM_TERM_LENGTH }
