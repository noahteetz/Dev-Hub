import { Box, Chip, Stack, Typography } from '@mui/material'
import type { SearchResult } from '../types'
import { formatDate } from '../utils/formatDate'
import { highlight } from '../utils/searchDisplay'

interface SearchResultRowProps {
  result: SearchResult
  term: string
  active: boolean
  onOpen: () => void
}

export function SearchResultRow({ result, term, active, onOpen }: SearchResultRowProps) {
  return (
    <Box
      aria-current={active ? 'true' : undefined}
      component="button"
      type="button"
      sx={{
        bgcolor: active ? 'action.selected' : 'transparent',
        border: 0,
        borderRadius: 1,
        cursor: 'pointer',
        display: 'block',
        font: 'inherit',
        px: 1.5,
        py: 1,
        textAlign: 'left',
        width: '100%',
        '&:hover': { bgcolor: 'action.hover' },
      }}
      onClick={onOpen}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography sx={{ fontWeight: 700 }}>{highlight(result.title, term)}</Typography>
        {result.archived ? <Chip label="Archived" size="small" /> : null}
        {result.completed ? <Chip color="success" label="Completed" size="small" /> : null}
      </Stack>
      {result.excerpt ? (
        <Typography color="text.secondary" variant="body2" sx={{ mt: 0.25 }}>
          {highlight(result.excerpt, term)}
        </Typography>
      ) : null}
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', mt: 0.75 }}>
        <Chip
          label={result.type === 'PROJECT' ? 'Project' : result.projectName || 'Inbox'}
          size="small"
          variant="outlined"
        />
        {result.tags.map((tag) => (
          <Chip key={tag.id} label={tag.name} size="small" />
        ))}
        <Typography color="text.disabled" variant="caption">
          Updated {formatDate(result.updatedAt)}
        </Typography>
      </Stack>
    </Box>
  )
}
