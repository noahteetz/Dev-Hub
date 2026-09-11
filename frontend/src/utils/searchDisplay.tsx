import { Box } from '@mui/material'
import type { ReactNode } from 'react'
import type { EntityType, SearchResult } from '../types'

export const entityLabels: Record<EntityType, string> = {
  PROJECT: 'Project',
  NOTE: 'Note',
  SNIPPET: 'Snippet',
  IDEA: 'Idea',
  TODO: 'Todo',
}

const typeOrder: EntityType[] = ['PROJECT', 'NOTE', 'SNIPPET', 'IDEA', 'TODO']

/** Wraps every occurrence of the search term in a mark element so hits stay visible in long text. */
export function highlight(text: string, term: string): ReactNode {
  const needle = term.trim()
  if (!needle || !text) {
    return text
  }

  const parts = text.split(new RegExp(`(${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig'))
  return parts.map((part, index) =>
    part.toLowerCase() === needle.toLowerCase() ? (
      <Box component="mark" key={`${part}-${index}`} sx={{ bgcolor: 'warning.light', px: 0.25 }}>
        {part}
      </Box>
    ) : (
      part
    ),
  )
}

export function groupByType(results: SearchResult[]) {
  return typeOrder
    .map((type) => ({ type, items: results.filter((result) => result.type === type) }))
    .filter((group) => group.items.length > 0)
}
