import AddRoundedIcon from '@mui/icons-material/AddRounded'
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined'
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  FormControlLabel,
  IconButton,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import type { ContentEntry, ContentType, Project } from '../types'
import { formatDate } from '../utils/formatDate'
import { MarkdownView } from './MarkdownView'

type KnowledgeMode = 'inbox' | 'notes' | 'ideas'

interface KnowledgeViewProps {
  mode: KnowledgeMode
  projects: Project[]
  version: number
  onCapture: () => void
  onEdit: (entry: ContentEntry) => void
  onChanged: () => void
  onProjectsChanged: () => void
}

const typeLabels: Record<ContentType, string> = { NOTE: 'Note', SNIPPET: 'Snippet', IDEA: 'Idea', TODO: 'Todo' }

export function KnowledgeView({ mode, projects, version, onCapture, onEdit, onChanged, onProjectsChanged }: KnowledgeViewProps) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [entries, setEntries] = useState<ContentEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [lastAssigned, setLastAssigned] = useState<ContentEntry | null>(null)
  const [recentProjectIds, setRecentProjectIds] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem('devhub.recentProjects') ?? '[]') as number[] } catch { return [] }
  })
  const [referenceTime] = useState(() => Date.now())
  const typeFilter = searchParams.get('type') as ContentType | null
  const tagFilter = searchParams.get('tag') ?? ''
  const projectFilter = searchParams.get('project') ?? 'all'
  const sort = (searchParams.get('sort') ?? 'updated') as 'created' | 'updated' | 'title'
  const showInactive = searchParams.get('inactive') === 'true'
  const period = searchParams.get('period') ?? 'all'
  const query = searchParams.get('q')?.toLowerCase() ?? ''

  const load = useCallback(async () => {
    await Promise.resolve()
    setLoading(true); setError('')
    try {
      if (mode === 'inbox') setEntries(await api.content.inbox())
      else setEntries(await api.content.list(mode === 'notes' ? 'NOTE' : 'IDEA', { scope: 'all', sort }))
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Entries could not be loaded.') }
    finally { setLoading(false) }
  }, [mode, sort])

  // Route data must be refreshed when the URL-backed view or mutation version changes.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void version; void load() }, [load, version])

  const visible = useMemo(() => entries.filter((entry) => {
    if (typeFilter && entry.type !== typeFilter) return false
    if (!showInactive && (entry.archived || entry.completed || entry.converted)) return false
    if (tagFilter && !entry.tags.some((tag) => tag.name === tagFilter)) return false
    if (projectFilter === 'inbox' && entry.projectId !== null) return false
    if (projectFilter !== 'all' && projectFilter !== 'inbox' && entry.projectId !== Number(projectFilter)) return false
    if (period !== 'all') {
      const cutoff = referenceTime - Number(period) * 86_400_000
      if (new Date(entry.createdAt).getTime() < cutoff) return false
    }
    return !query || `${entry.title} ${entry.content}`.toLowerCase().includes(query)
  }), [entries, period, projectFilter, query, referenceTime, showInactive, tagFilter, typeFilter])

  const tags = useMemo(() => Array.from(new Set(entries.flatMap((entry) => entry.tags.map((tag) => tag.name)))).sort(), [entries])
  const orderedProjects = useMemo(() => [...projects].sort((left, right) => {
    const leftIndex = recentProjectIds.indexOf(left.id); const rightIndex = recentProjectIds.indexOf(right.id)
    return (leftIndex < 0 ? 999 : leftIndex) - (rightIndex < 0 ? 999 : rightIndex)
  }), [projects, recentProjectIds])
  const setParam = (name: string, value: string) => { const next = new URLSearchParams(searchParams); if (!value || value === 'all') next.delete(name); else next.set(name, value); setSearchParams(next) }
  const key = (entry: ContentEntry) => `${entry.type}-${entry.id}`

  async function mutate(action: () => Promise<unknown>, projectChanged = false) {
    try { await action(); setSelected(new Set()); await load(); onChanged(); if (projectChanged) onProjectsChanged() }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'The action failed.') }
  }

  async function bulkAssign(projectId: string) {
    const chosen = entries.filter((entry) => selected.has(key(entry)))
    await mutate(() => Promise.all(chosen.map((entry) => api.content.assign(entry, projectId ? Number(projectId) : null))))
  }

  async function assignOne(entry: ContentEntry, projectId: number) {
    await mutate(() => api.content.assign(entry, projectId))
    const recent = [projectId, ...recentProjectIds.filter((id) => id !== projectId)].slice(0, 5)
    setRecentProjectIds(recent); localStorage.setItem('devhub.recentProjects', JSON.stringify(recent)); setLastAssigned(entry)
  }

  const title = mode === 'inbox' ? 'Inbox' : mode === 'notes' ? 'All notes' : 'All ideas'

  async function copyPermanentLink(entry: ContentEntry) {
    const url = `${window.location.origin}/${entry.type.toLowerCase()}s/${entry.id}`
    try { await navigator.clipboard.writeText(url); setError('') } catch { setError(url) }
  }

  return (
    <Box component="main" sx={{ bgcolor: 'background.default', flex: 1, minWidth: 0, minHeight: '100vh' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper', px: { xs: 2, md: 4 }, py: 1.5 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            <Button onClick={() => navigate('/dashboard')}>Projects</Button><Button variant={mode === 'inbox' ? 'contained' : 'text'} onClick={() => navigate('/inbox')}>Inbox</Button><Button variant={mode === 'notes' ? 'contained' : 'text'} onClick={() => navigate('/notes')}>Notes</Button><Button variant={mode === 'ideas' ? 'contained' : 'text'} onClick={() => navigate('/ideas')}>Ideas</Button><Button onClick={() => navigate('/search')}>Search</Button>
          </Stack>
          <Button startIcon={<AddRoundedIcon />} variant="contained" onClick={onCapture}>Quick capture</Button>
        </Stack>
      </Box>
      <Box sx={{ mx: 'auto', maxWidth: 1100, p: { xs: 2, sm: 3, md: 4 } }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', mb: 3 }}>
          <Box><Typography component="h1" variant="h4" sx={{ fontWeight: 850 }}>{title}</Typography><Typography color="text.secondary">{visible.length} entries match the current filters.</Typography></Box>
          <FormControlLabel control={<Checkbox checked={showInactive} onChange={(event) => setParam('inactive', String(event.target.checked))} />} label="Show completed / archived" />
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 3 }}>
          {mode === 'inbox' ? <Select displayEmpty value={typeFilter ?? ''} onChange={(event) => setParam('type', event.target.value)} sx={{ minWidth: 150 }}><MenuItem value="">All types</MenuItem>{Object.entries(typeLabels).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</Select> : null}
          {mode !== 'inbox' ? <Select value={projectFilter} onChange={(event) => setParam('project', event.target.value)} sx={{ minWidth: 170 }}><MenuItem value="all">All locations</MenuItem><MenuItem value="inbox">Inbox</MenuItem>{projects.map((project) => <MenuItem key={project.id} value={String(project.id)}>{project.name}</MenuItem>)}</Select> : null}
          <Select displayEmpty value={tagFilter} onChange={(event) => setParam('tag', event.target.value)} sx={{ minWidth: 140 }}><MenuItem value="">All tags</MenuItem>{tags.map((tag) => <MenuItem key={tag} value={tag}>{tag}</MenuItem>)}</Select>
          {mode === 'notes' || mode === 'ideas' ? <Select value={period} onChange={(event) => setParam('period', event.target.value)} sx={{ minWidth: 140 }}><MenuItem value="all">Any time</MenuItem><MenuItem value="7">Last 7 days</MenuItem><MenuItem value="30">Last 30 days</MenuItem></Select> : null}
          {mode !== 'inbox' ? <Select value={sort} onChange={(event) => setParam('sort', event.target.value)} sx={{ minWidth: 150 }}><MenuItem value="updated">Last updated</MenuItem><MenuItem value="created">Created</MenuItem><MenuItem value="title">Title</MenuItem></Select> : null}
        </Stack>
        {selected.size ? <Card variant="outlined" sx={{ mb: 2 }}><CardContent><Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}><Typography>{selected.size} selected</Typography><Autocomplete getOptionLabel={(project) => project.name} options={orderedProjects} sx={{ minWidth: 260 }} onChange={(_, project) => { if (project) void bulkAssign(String(project.id)) }} renderInput={(params) => <TextField {...params} label="Assign selected to…" size="small" />} /></Stack></CardContent></Card> : null}
        {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
        {lastAssigned ? <Alert action={<Button color="inherit" onClick={() => void mutate(() => api.content.assign(lastAssigned, null)).then(() => setLastAssigned(null))}>Undo</Button>} severity="success" sx={{ mb: 2 }}>{lastAssigned.title} was assigned to a project.</Alert> : null}
        {loading ? <Stack sx={{ alignItems: 'center', py: 8 }}><CircularProgress /></Stack> : null}
        {!loading && !visible.length ? <Card variant="outlined"><CardContent sx={{ py: 7, textAlign: 'center' }}><FolderOpenOutlinedIcon sx={{ color: 'primary.main', fontSize: 44 }} /><Typography variant="h6" sx={{ mt: 1 }}>{mode === 'inbox' ? 'Your inbox is clear' : 'No entries match'}</Typography><Typography color="text.secondary" sx={{ mb: 2 }}>{mode === 'inbox' ? 'Capture a thought now; you can file it into a project later.' : 'Adjust the filters or capture a new entry.'}</Typography><Button variant="contained" onClick={onCapture}>Quick capture</Button></CardContent></Card> : null}
        <Stack spacing={1.5}>{visible.map((entry) => {
          const project = projects.find((candidate) => candidate.id === entry.projectId)
          return <Card key={key(entry)} variant="outlined"><CardContent><Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}><Checkbox checked={selected.has(key(entry))} onChange={(event) => setSelected((current) => { const next = new Set(current); if (event.target.checked) next.add(key(entry)); else next.delete(key(entry)); return next })} /><Box sx={{ flex: 1, minWidth: 0 }}><Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}><Chip label={typeLabels[entry.type]} size="small" /><Typography component="button" variant="h6" sx={{ background: 'none', border: 0, cursor: 'pointer', font: 'inherit', fontWeight: 700, p: 0, textAlign: 'left' }} onClick={() => onEdit(entry)}>{entry.title}</Typography>{entry.archived ? <Chip label="Archived" size="small" /> : null}{entry.completed ? <Chip color="success" label="Completed" size="small" /> : null}{entry.converted ? <Chip color="success" label="Converted" size="small" /> : null}{entry.projectArchived ? <Chip color="warning" label="Archived project" size="small" /> : null}</Stack>{entry.type === 'NOTE' || entry.type === 'IDEA' ? <MarkdownView content={entry.content || 'No additional content'} sx={{ color: 'text.secondary', maxHeight: 240, mt: 1, overflow: 'hidden' }} /> : <Typography color="text.secondary" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>{entry.content || 'No additional content'}</Typography>}<Stack direction="row" spacing={1} sx={{ mt: 1.5, alignItems: 'center', flexWrap: 'wrap' }}><Chip label={project?.name ?? 'Inbox'} size="small" variant="outlined" />{entry.tags.map((tag) => <Chip key={tag.id} label={tag.name} size="small" />)}<Typography color="text.disabled" variant="caption">Updated {formatDate(entry.updatedAt)}</Typography></Stack></Box><Stack direction="row"><IconButton aria-label={`Edit ${entry.title}`} onClick={() => onEdit(entry)}><EditOutlinedIcon /></IconButton>{entry.type !== 'TODO' ? <IconButton aria-label={`${entry.archived ? 'Restore' : 'Archive'} ${entry.title}`} onClick={() => void mutate(() => api.content.archive(entry, !entry.archived))}><ArchiveOutlinedIcon /></IconButton> : <Checkbox aria-label={`Complete ${entry.title}`} checked={entry.completed} onChange={() => void mutate(() => api.content.complete(entry, !entry.completed))} />}<IconButton aria-label={`Copy permanent link to ${entry.title}`} onClick={() => void copyPermanentLink(entry)}><ContentCopyRoundedIcon /></IconButton><IconButton aria-label={`Delete ${entry.title}`} onClick={() => void mutate(() => api.content.remove(entry))}><DeleteOutlineRoundedIcon /></IconButton></Stack></Stack>
          {mode === 'inbox' ? <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 2, pl: 6 }}><Autocomplete getOptionLabel={(candidate) => candidate.name} options={orderedProjects} sx={{ minWidth: 260 }} onChange={(_, candidate) => { if (candidate) void assignOne(entry, candidate.id) }} renderInput={(params) => <TextField {...params} label="Assign to project…" size="small" />} /><Button onClick={() => void mutate(() => api.content.promote(entry), true)}>Turn into project</Button></Stack> : entry.projectId !== null ? <Button size="small" sx={{ ml: 6, mt: 1 }} onClick={() => void mutate(() => api.content.assign(entry, null))}>Move to inbox</Button> : null}
          </CardContent></Card>
        })}</Stack>
      </Box>
    </Box>
  )
}
