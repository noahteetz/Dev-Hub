import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import {
  Alert,
  Box,
  Dialog,
  DialogContent,
  Divider,
  InputAdornment,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSearchResults } from '../hooks/useSearchResults'
import { SearchResultRow } from './SearchResultList'
import { entityLabels, groupByType } from '../utils/searchDisplay'
import type { EntityType, SearchResult } from '../types'

interface CommandPaletteProps {
  open: boolean
  /** Restricts the result types, used when the palette picks a link target. */
  types?: EntityType[]
  title?: string
  onClose: () => void
  /** Defaults to navigating to the permanent address of the chosen entry. */
  onSelect?: (result: SearchResult) => void
}

export function CommandPalette({ open, types, title, onClose, onSelect }: CommandPaletteProps) {
  const navigate = useNavigate()
  const [term, setTerm] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const filters = useMemo(() => ({ types, limit: 30 }), [types])
  const { results, loading, error } = useSearchResults(term, filters, open)
  const groups = useMemo(() => groupByType(results), [results])
  const ordered = useMemo(() => groups.flatMap((group) => group.items), [groups])

  // The highlighted row is clamped instead of reset, so a shrinking result list stays navigable.
  const highlighted = ordered.length ? Math.min(activeIndex, ordered.length - 1) : 0

  function close() {
    setTerm('')
    setActiveIndex(0)
    onClose()
  }

  function choose(result: SearchResult) {
    close()
    if (onSelect) {
      onSelect(result)
    } else {
      navigate(result.url)
    }
  }

  return (
    <Dialog
      fullWidth
      maxWidth="sm"
      open={open}
      slotProps={{ paper: { sx: { alignSelf: 'flex-start', mt: 8 } } }}
      onClose={close}
    >
      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ p: 2 }}>
          <TextField
            autoFocus
            fullWidth
            label={title ?? 'Search everything'}
            placeholder="Search notes, snippets, ideas, todos and projects"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault()
                setActiveIndex((current) => (ordered.length ? (current + 1) % ordered.length : 0))
              } else if (event.key === 'ArrowUp') {
                event.preventDefault()
                setActiveIndex((current) => (ordered.length ? (current - 1 + ordered.length) % ordered.length : 0))
              } else if (event.key === 'Enter' && ordered[highlighted]) {
                event.preventDefault()
                choose(ordered[highlighted])
              }
            }}
          />
        </Box>
        {loading ? <LinearProgress /> : null}
        <Divider />
        <Box sx={{ maxHeight: 420, overflowY: 'auto', px: 1, py: 1 }}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          {!error && term.trim().length < 2 ? (
            <Typography color="text.secondary" sx={{ p: 2 }}>
              Type at least two characters. Arrow keys move, Enter opens the entry.
            </Typography>
          ) : null}
          {!error && !loading && term.trim().length >= 2 && !ordered.length ? (
            <Typography color="text.secondary" sx={{ p: 2 }}>
              Nothing matches “{term.trim()}”.
            </Typography>
          ) : null}
          {groups.map((group) => (
            <Box key={group.type} sx={{ mb: 1 }}>
              <Typography color="text.secondary" sx={{ px: 1.5, py: 0.5 }} variant="overline">
                {entityLabels[group.type]}
              </Typography>
              <Stack>
                {group.items.map((result) => (
                  <SearchResultRow
                    active={ordered[highlighted]?.type === result.type && ordered[highlighted]?.id === result.id}
                    key={`${result.type}-${result.id}`}
                    result={result}
                    term={term}
                    onOpen={() => choose(result)}
                  />
                ))}
              </Stack>
            </Box>
          ))}
        </Box>
      </DialogContent>
    </Dialog>
  )
}
