import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  FormControlLabel,
  InputAdornment,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useSearchResults } from '../hooks/useSearchResults'
import { SearchResultRow } from './SearchResultList'
import { entityLabels, groupByType } from '../utils/searchDisplay'
import type { EntityType, Project } from '../types'

const filterTypes: EntityType[] = ['PROJECT', 'NOTE', 'SNIPPET', 'IDEA', 'TODO']

interface SearchViewProps {
  projects: Project[]
  onCapture: () => void
}

/** The /search route: every filter lives in the URL, so a reload restores the same result list. */
export function SearchView({ projects, onCapture }: SearchViewProps) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeIndex, setActiveIndex] = useState(0)

  const term = searchParams.get('q') ?? ''
  const selectedTypes = useMemo(
    () => (searchParams.get('types') ?? '').split(',').filter(Boolean) as EntityType[],
    [searchParams],
  )
  const projectFilter = searchParams.get('project') ?? 'all'
  const tagFilter = searchParams.get('tags') ?? ''
  const includeArchived = searchParams.get('archived') === 'true'
  const includeCompleted = searchParams.get('completed') === 'true'

  const filters = useMemo(
    () => ({
      types: selectedTypes.length ? selectedTypes : undefined,
      projectId: projectFilter === 'all' ? undefined : Number(projectFilter),
      tags: tagFilter ? tagFilter.split(',').map((tag) => tag.trim()).filter(Boolean) : undefined,
      includeArchived,
      includeCompleted,
      limit: 50,
    }),
    [includeArchived, includeCompleted, projectFilter, selectedTypes, tagFilter],
  )
  const { results, loading, error } = useSearchResults(term, filters)
  const groups = useMemo(() => groupByType(results), [results])
  const ordered = useMemo(() => groups.flatMap((group) => group.items), [groups])

  function setParam(name: string, value: string) {
    const next = new URLSearchParams(searchParams)
    if (!value || value === 'all') {
      next.delete(name)
    } else {
      next.set(name, value)
    }
    setSearchParams(next, { replace: name === 'q' })
    setActiveIndex(0)
  }

  function toggleType(type: EntityType) {
    const next = selectedTypes.includes(type)
      ? selectedTypes.filter((candidate) => candidate !== type)
      : [...selectedTypes, type]
    setParam('types', next.join(','))
  }

  return (
    <Box component="main" sx={{ bgcolor: 'background.default', flex: 1, minWidth: 0, minHeight: '100vh' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper', px: { xs: 2, md: 4 }, py: 1.5 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            <Button onClick={() => navigate('/dashboard')}>Projects</Button>
            <Button onClick={() => navigate('/inbox')}>Inbox</Button>
            <Button onClick={() => navigate('/notes')}>Notes</Button>
            <Button onClick={() => navigate('/ideas')}>Ideas</Button>
            <Button variant="contained" onClick={() => navigate('/search')}>Search</Button>
          </Stack>
          <Button variant="contained" onClick={onCapture}>Quick capture</Button>
        </Stack>
      </Box>
      <Box sx={{ mx: 'auto', maxWidth: 1100, p: { xs: 2, sm: 3, md: 4 } }}>
        <Typography component="h1" variant="h4" sx={{ fontWeight: 850, mb: 2 }}>Search</Typography>
        <TextField
          autoFocus
          fullWidth
          label="Search"
          placeholder="Search notes, snippets, ideas, todos and project context"
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
          onChange={(event) => setParam('q', event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              setActiveIndex((current) => (ordered.length ? (current + 1) % ordered.length : 0))
            } else if (event.key === 'ArrowUp') {
              event.preventDefault()
              setActiveIndex((current) => (ordered.length ? (current - 1 + ordered.length) % ordered.length : 0))
            } else if (event.key === 'Enter' && ordered[activeIndex]) {
              event.preventDefault()
              navigate(ordered[activeIndex].url)
            }
          }}
        />
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mt: 2 }}>
          {filterTypes.map((type) => (
            <Chip
              color={selectedTypes.includes(type) ? 'primary' : 'default'}
              key={type}
              label={entityLabels[type]}
              onClick={() => toggleType(type)}
            />
          ))}
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { md: 'center' }, mt: 2 }}>
          <Select size="small" sx={{ minWidth: 190 }} value={projectFilter} onChange={(event) => setParam('project', event.target.value)}>
            <MenuItem value="all">All projects</MenuItem>
            {projects.map((project) => (
              <MenuItem key={project.id} value={String(project.id)}>{project.name}</MenuItem>
            ))}
          </Select>
          <TextField
            label="Tags"
            placeholder="infra, docs"
            size="small"
            sx={{ minWidth: 190 }}
            value={tagFilter}
            onChange={(event) => setParam('tags', event.target.value)}
          />
          <FormControlLabel
            control={<Checkbox checked={includeArchived} onChange={(event) => setParam('archived', String(event.target.checked))} />}
            label="Include archived"
          />
          <FormControlLabel
            control={<Checkbox checked={includeCompleted} onChange={(event) => setParam('completed', String(event.target.checked))} />}
            label="Include completed"
          />
        </Stack>

        <Box sx={{ mt: 3 }}>
          {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
          {loading ? (
            <Stack sx={{ alignItems: 'center', py: 6 }}>
              <CircularProgress />
            </Stack>
          ) : null}
          {!loading && !error && term.trim().length < 2 ? (
            <Typography color="text.secondary">Type at least two characters to search.</Typography>
          ) : null}
          {!loading && !error && term.trim().length >= 2 && !ordered.length ? (
            <Card variant="outlined">
              <CardContent sx={{ py: 6, textAlign: 'center' }}>
                <Typography variant="h6">Nothing matches “{term.trim()}”</Typography>
                <Typography color="text.secondary">Try another word, or widen the filters above.</Typography>
              </CardContent>
            </Card>
          ) : null}
          {groups.map((group) => (
            <Box key={group.type} sx={{ mb: 3 }}>
              <Typography color="text.secondary" variant="overline">
                {entityLabels[group.type]} ({group.items.length})
              </Typography>
              <Card variant="outlined">
                <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                  <Stack>
                    {group.items.map((result) => (
                      <SearchResultRow
                        active={ordered[activeIndex]?.type === result.type && ordered[activeIndex]?.id === result.id}
                        key={`${result.type}-${result.id}`}
                        result={result}
                        term={term}
                        onOpen={() => navigate(result.url)}
                      />
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  )
}
