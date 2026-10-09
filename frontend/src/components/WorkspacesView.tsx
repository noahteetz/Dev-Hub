import AddRoundedIcon from '@mui/icons-material/AddRounded'
import CloseFullscreenRoundedIcon from '@mui/icons-material/CloseFullscreenRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import DragIndicatorRoundedIcon from '@mui/icons-material/DragIndicatorRounded'
import OpenInFullRoundedIcon from '@mui/icons-material/OpenInFullRounded'
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'
import PushPinIcon from '@mui/icons-material/PushPin'
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined'
import {
  Alert, Box, Button, Chip, IconButton, Paper, Stack, ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import type { AiProfile, Project, RemoteWorkspace, WorkspaceConfig, WorkspaceTerminal } from '../types'
import { ConfirmDialog } from './ConfirmDialog'
import { TerminalMenu } from './TerminalMenu'
import { terminalLabel as labelTerminal } from './terminalLabel'
import { TerminalPane } from './TerminalPane'

const gridKey = 'devhub.workspaces.grid'
const columnsKey = 'devhub.workspaces.columns'
const cellHeight = { 1: 620, 2: 440, 3: 360 } as const
type Columns = keyof typeof cellHeight

function readStored<T>(key: string, fallback: T): T {
  try { const value = localStorage.getItem(key); return value === null ? fallback : JSON.parse(value) as T } catch { return fallback }
}
function store(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* the layout is a convenience only */ }
}
function message(error: unknown) { return error instanceof Error ? error.message : 'Workspace operation failed' }
/** Counts like the backend: a workspace takes a running slot from the moment it is asked to run. */
function isActive(workspace: RemoteWorkspace) { return workspace.desired === 'RUNNING' }
function isRunning(workspace: RemoteWorkspace) { return workspace.status === 'RUNNING' && workspace.desired === 'RUNNING' }

/** All of the user's workspaces across projects, with a grid to keep several terminals side by side. */
export function WorkspacesView({ projects }: { projects: Project[] }) {
  const navigate = useNavigate()
  const [config, setConfig] = useState<WorkspaceConfig | null>(null)
  const [workspaces, setWorkspaces] = useState<RemoteWorkspace[] | null>(null)
  const [terminals, setTerminals] = useState<Record<string, WorkspaceTerminal[]>>({})
  const [profiles, setProfiles] = useState<AiProfile[]>([])
  const [pinned, setPinned] = useState<string[]>(() => readStored<string[]>(gridKey, []))
  const [columns, setColumns] = useState<Columns>(() => { const value = readStored<number>(columnsKey, 2); return value === 1 || value === 3 ? value : 2 })
  const [maximized, setMaximized] = useState<string | null>(null)
  const [dragged, setDragged] = useState<string | null>(null)
  const [menu, setMenu] = useState<{ anchor: HTMLElement; workspace: RemoteWorkspace } | null>(null)
  const [closing, setClosing] = useState<WorkspaceTerminal | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const pruned = useRef(false)

  const updatePinned = useCallback((update: (current: string[]) => string[]) => {
    setPinned(current => { const next = update(current); store(gridKey, next); return next })
  }, [])

  const refresh = useCallback(async () => {
    const [mine, currentProfiles] = await Promise.all([api.workspaces.mine(), api.aiProfiles.list()])
    setProfiles(currentProfiles)
    // Fetching a running workspace individually also renews its Git authorization, as the project panel does.
    const current = await Promise.all(mine.map(w => isRunning(w) ? api.workspaces.get(w.id) : Promise.resolve(w)))
    const sessions = await Promise.all(current.map(async w => [w.id, isRunning(w) ? await api.workspaces.terminals(w.id) : []] as const))
    setWorkspaces(current)
    setTerminals(Object.fromEntries(sessions))
    // Forget terminals that ended while the page was closed. Only once: a poll that started before
    // a terminal was opened must not unpin it again; the grid skips unknown ids in the meantime.
    if (!pruned.current) {
      pruned.current = true
      const known = new Set(sessions.flatMap(([, list]) => list.map(t => t.id)))
      updatePinned(ids => ids.every(id => known.has(id)) ? ids : ids.filter(id => known.has(id)))
    }
  }, [updatePinned])

  useEffect(() => {
    let alive = true
    api.workspaces.config().then(async value => {
      if (!alive) return
      setConfig(value)
      if (!value.enabled || !value.allowed) return
      if (alive) await refresh()
    }).catch((reason: unknown) => { if (alive) setError(message(reason)) })
    return () => { alive = false }
  }, [refresh])
  useEffect(() => {
    if (!config?.enabled || !config.allowed) return
    let alive = true
    const timer = setInterval(() => { refresh().catch((reason: unknown) => { if (alive) setError(message(reason)) }) }, 5000)
    return () => { alive = false; clearInterval(timer) }
  }, [config, refresh])
  useEffect(() => {
    if (!maximized) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setMaximized(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [maximized])

  async function run(action: () => Promise<void>) {
    setBusy(true); setError('')
    try { await action(); await refresh() } catch (reason: unknown) { setError(message(reason)) } finally { setBusy(false) }
  }
  function togglePin(id: string) { updatePinned(ids => ids.includes(id) ? ids.filter(other => other !== id) : [...ids, id]) }
  function moveBefore(id: string, target: string) {
    if (id === target) return
    updatePinned(ids => { const rest = ids.filter(other => other !== id); rest.splice(rest.indexOf(target), 0, id); return rest })
  }
  function changeColumns(value: Columns | null) { if (value) { setColumns(value); store(columnsKey, value) } }

  const projectName = (id: number) => projects.find(p => p.id === id)?.name ?? 'Project ' + id
  const allTerminals = Object.values(terminals).flat()
  const terminalLabel = (t: WorkspaceTerminal) => labelTerminal(t, profiles, terminals[t.workspaceId] ?? [])
  const workspaceOf = (t: WorkspaceTerminal) => workspaces?.find(w => w.id === t.workspaceId)
  const grid = pinned.map(id => allTerminals.find(t => t.id === id)).filter((t): t is WorkspaceTerminal => Boolean(t))
  const activeCount = workspaces?.filter(isActive).length ?? 0

  return (
    <Box component="main" sx={{ minWidth: 0, p: { xs: 2, md: 4 } }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography component="h1" sx={{ fontWeight: 800 }} variant="h4">Workspaces</Typography>
          <Typography color="text.secondary">All of your remote workspaces. Pin terminals to keep them side by side.</Typography>
        </Box>
        {config && workspaces ? (
          <Stack direction="row" spacing={1}>
            <Chip color={activeCount >= config.maxRunning ? 'warning' : 'default'} label={`Running ${activeCount} / ${config.maxRunning}`} />
            <Chip label={`Kept ${workspaces.length} / ${config.maxWorkspaces}`} />
          </Stack>
        ) : null}
      </Stack>

      {error ? <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert> : null}
      {!config ? (error ? null : <Typography>Loading workspaces…</Typography>)
        : !config.enabled ? <Alert severity="info">Remote workspaces are not available on this instance.</Alert>
        : !config.allowed ? <Alert severity="info">Your account needs access to remote workspaces.</Alert>
        : !workspaces ? <Typography>Loading workspaces…</Typography>
        : workspaces.length === 0 ? (
          <Alert severity="info">You have no workspaces yet. Open a project and choose <strong>Remote workspace</strong> to start one.</Alert>
        ) : (
          <Stack spacing={3}>
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(auto-fill, minmax(320px, 1fr))' } }}>
              {workspaces.map(w => {
                const running = isRunning(w)
                const stopped = w.status === 'STOPPED'
                return (
                  <Paper key={w.id} component="section" aria-label={projectName(w.projectId)} variant="outlined" sx={{ p: 2 }}>
                    <Stack spacing={1.25}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography noWrap sx={{ fontWeight: 700 }}>{projectName(w.projectId)}</Typography>
                        <Chip color={running ? 'success' : w.status === 'ERROR' ? 'error' : 'default'} label={w.status} size="small" />
                      </Stack>
                      <Typography color="text.secondary" noWrap variant="body2">{w.branch}</Typography>
                      {w.error ? <Alert severity="error">{w.error}</Alert> : null}
                      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
                        {stopped || w.status === 'ERROR'
                          ? <Button disabled={busy} size="small" onClick={() => void run(async () => { await api.workspaces.start(w.id) })}>Resume</Button>
                          : <Button disabled={busy || w.status === 'DELETING' || w.desired === 'STOPPED'} size="small" onClick={() => void run(async () => { await api.workspaces.stop(w.id) })}>Stop</Button>}
                        <Button disabled={busy || !running} size="small" startIcon={<AddRoundedIcon />} onClick={event => setMenu({ anchor: event.currentTarget, workspace: w })}>Terminal</Button>
                        <Button endIcon={<OpenInNewRoundedIcon />} size="small" onClick={() => navigate(`/projects/${w.projectId}?workspace=open`)}>Project</Button>
                      </Stack>
                      {(terminals[w.id] ?? []).length ? (
                        <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', rowGap: 0.75 }}>
                          {(terminals[w.id] ?? []).map(t => (
                            <Chip
                              key={t.id}
                              color={pinned.includes(t.id) ? 'primary' : 'default'}
                              icon={pinned.includes(t.id) ? <PushPinIcon /> : <PushPinOutlinedIcon />}
                              label={terminalLabel(t)}
                              size="small"
                              variant={pinned.includes(t.id) ? 'filled' : 'outlined'}
                              onClick={() => togglePin(t.id)}
                              onDelete={() => setClosing(t)}
                            />
                          ))}
                        </Stack>
                      ) : running ? <Typography color="text.secondary" variant="caption">No open terminals.</Typography> : null}
                    </Stack>
                  </Paper>
                )
              })}
            </Box>

            <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography component="h2" sx={{ fontWeight: 700 }} variant="h6">Terminal grid</Typography>
              <ToggleButtonGroup aria-label="Grid columns" exclusive size="small" value={columns} onChange={(_, value: Columns | null) => changeColumns(value)}>
                <ToggleButton aria-label="One column" value={1}>1</ToggleButton>
                <ToggleButton aria-label="Two columns" value={2}>2</ToggleButton>
                <ToggleButton aria-label="Three columns" value={3}>3</ToggleButton>
              </ToggleButtonGroup>
            </Stack>
            {grid.length === 0 ? (
              <Typography color="text.secondary">Pin a terminal above, or open a new one, to show it here. Drag a terminal by its handle to reorder the grid.</Typography>
            ) : (
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: `repeat(${columns}, minmax(0, 1fr))` } }}>
                {grid.map(t => {
                  const big = maximized === t.id
                  const w = workspaceOf(t)
                  return (
                    <Paper
                      key={t.id}
                      variant="outlined"
                      onDragOver={event => { if (dragged) event.preventDefault() }}
                      onDrop={event => { event.preventDefault(); if (dragged) moveBefore(dragged, t.id); setDragged(null) }}
                      // Maximizing restyles the same element so the terminal keeps its connection.
                      sx={big
                        ? { borderRadius: 0, inset: 0, p: 2, position: 'fixed', zIndex: 'modal' }
                        : { height: cellHeight[columns], opacity: dragged === t.id ? 0.5 : 1, p: 1.5 }}
                    >
                      <TerminalPane
                        fill
                        terminal={t}
                        title={w ? projectName(w.projectId) + ' · ' + terminalLabel(t) : terminalLabel(t)}
                        actions={<>
                          <Tooltip title="Drag to reorder">
                            <Box
                              aria-label="Drag to reorder"
                              draggable={!big}
                              sx={{ color: 'text.secondary', cursor: 'grab', display: big ? 'none' : 'flex' }}
                              onDragEnd={() => setDragged(null)}
                              onDragStart={event => { event.dataTransfer.effectAllowed = 'move'; setDragged(t.id) }}
                            >
                              <DragIndicatorRoundedIcon fontSize="small" />
                            </Box>
                          </Tooltip>
                          <Tooltip title={big ? 'Restore (Esc)' : 'Maximize'}>
                            <IconButton aria-label={big ? 'Restore terminal' : 'Maximize terminal'} size="small" onClick={() => setMaximized(big ? null : t.id)}>
                              {big ? <CloseFullscreenRoundedIcon fontSize="small" /> : <OpenInFullRoundedIcon fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Remove from grid">
                            <IconButton aria-label="Remove from grid" size="small" onClick={() => { if (big) setMaximized(null); togglePin(t.id) }}>
                              <CloseRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>}
                      />
                    </Paper>
                  )
                })}
              </Box>
            )}
            <Typography color="text.secondary" variant="body2">
              Removing a terminal from the grid only disconnects the browser; its processes keep running. <Link to="/settings">Manage AI profiles</Link>
            </Typography>
          </Stack>
        )}

      <TerminalMenu anchorEl={menu?.anchor ?? null} onClose={() => setMenu(null)} profiles={profiles} onManage={() => setMenu(null)} onChoose={(launchMode, profileId) => {
          const target = menu?.workspace
          setMenu(null)
          if (!target) return
          void run(async () => {
            const t = await api.workspaces.openTerminal(target.id, launchMode, profileId)
            updatePinned(ids => [...ids, t.id])
          })
        }} />
      <ConfirmDialog
        confirmLabel="End terminal"
        loading={busy}
        message="This ends the terminal and every process running in it. Files in the workspace stay."
        open={Boolean(closing)}
        title="End terminal?"
        onClose={() => setClosing(null)}
        onConfirm={() => {
          const t = closing
          if (!t) return
          void run(async () => {
            await api.workspaces.closeTerminal(t.workspaceId, t.id)
            if (maximized === t.id) setMaximized(null)
            updatePinned(ids => ids.filter(id => id !== t.id))
            setClosing(null)
          })
        }}
      />
    </Box>
  )
}
