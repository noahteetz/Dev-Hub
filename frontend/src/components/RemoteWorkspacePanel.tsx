import {
  Alert, Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, MenuItem, Paper, Stack, TextField, Typography,
} from '@mui/material'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useOptionalAuth } from '../auth/useOptionalAuth'
import type { AiProfile, Project, RemoteWorkspace, WorkspaceConfig, WorkspaceGitReport, WorkspaceResources, WorkspaceTerminal } from '../types'
import { TerminalPane } from './TerminalPane'

function message(error: unknown) { return error instanceof Error ? error.message : 'Workspace operation failed' }
export function RemoteWorkspacePanel({ project }: { project: Project }) {
  const auth = useOptionalAuth()
  const [config, setConfig] = useState<WorkspaceConfig | null>(null)
  const [workspace, setWorkspace] = useState<RemoteWorkspace | null>(null)
  const [profiles, setProfiles] = useState<AiProfile[]>([])
  const [terminals, setTerminals] = useState<WorkspaceTerminal[]>([])
  const [selected, setSelected] = useState('')
  const [provider, setProvider] = useState<WorkspaceTerminal['provider']>('SHELL')
  const [profile, setProfile] = useState('')
  const [resources, setResources] = useState<WorkspaceResources | null>(null)
  const [git, setGit] = useState<WorkspaceGitReport | null>(null)
  const [branch, setBranch] = useState(() => 'work/devhub-' + Date.now())
  const [newBranch, setNewBranch] = useState(true)
  const [commitName, setCommitName] = useState(String(auth?.user?.profile.name || auth?.user?.profile.preferred_username || ''))
  const [commitEmail, setCommitEmail] = useState(String(auth?.user?.profile.email || ''))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [discard, setDiscard] = useState(false)
  const [confirmation, setConfirmation] = useState('')

  const refresh = useCallback(async () => {
    const values = await api.workspaces.list(project.id)
    if (!values.length) { setWorkspace(null); setTerminals([]); setResources(null); return }
    const current = await api.workspaces.get(values[0].id)
    setWorkspace(current)
    if (current.status === 'RUNNING') {
      const [sessions, stats] = await Promise.all([api.workspaces.terminals(current.id), api.workspaces.resources(current.id)])
      setTerminals(sessions); setResources(stats)
    } else {
      setTerminals([])
      setResources(current.status === 'STOPPED' ? await api.workspaces.resources(current.id) : null)
    }
  }, [project.id])
  useEffect(() => {
    let alive = true
    api.workspaces.config().then(async value => {
      if (!alive) return
      setConfig(value)
      if (value.enabled && value.allowed) {
        const p = await api.aiProfiles.list()
        if (alive) { setProfiles(p); await refresh() }
      }
    }).catch((reason: unknown) => { if (alive) setError(message(reason)) })
    return () => { alive = false }
  }, [refresh])
  useEffect(() => {
    if (!workspace?.id) return
    let alive = true
    const timer = setInterval(() => { refresh().catch((reason: unknown) => { if (alive) setError(message(reason)) }) }, 5000)
    return () => { alive = false; clearInterval(timer) }
  }, [workspace?.id, refresh])
  async function run(action: () => Promise<void>) {
    setBusy(true); setError('')
    try { await action() } catch (reason: unknown) { setError(message(reason)) } finally { setBusy(false) }
  }
  const active = terminals.find(t => t.id === selected)
  const choices = profiles.filter(p => p.provider === provider)
  const running = workspace?.status === 'RUNNING' && workspace.desired === 'RUNNING'
  const stopped = workspace?.status === 'STOPPED'
  return (
    <Paper component="section" variant="outlined" sx={{ p: 2.5, mt: 2 }}>
      <Stack spacing={2}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'baseline', justifyContent: 'space-between' }}>
          <Typography variant="h6">Remote workspace</Typography>
          {config?.enabled && config.allowed ? <Typography variant="body2"><Link to="/workspaces">All workspaces</Link></Typography> : null}
        </Stack>
        {error ? <Alert severity="error" onClose={() => setError('')}>{error}</Alert> : null}
        {!config ? <Typography>Loading workspace availability…</Typography> : !config.enabled
          ? <Alert severity="info">Remote workspaces are not available on this instance.</Alert>
          : !config.allowed ? <Alert severity="info">Your account needs access to remote workspaces.</Alert>
          : !workspace ? (
            <Stack spacing={2}>
              <Typography color="text.secondary" variant="body2">Start your own isolated checkout. Commit and push with Git in the terminal. Your Git account must have access to this repository.</Typography>
              <TextField label="Workspace branch" value={branch} onChange={e => setBranch(e.target.value)} />
              <FormControlLabel control={<Checkbox checked={newBranch} onChange={e => setNewBranch(e.target.checked)} />} label="Create branch from the repository default branch" />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField fullWidth label="Git commit name" value={commitName} onChange={e => setCommitName(e.target.value)} />
                <TextField fullWidth label="Git commit email" value={commitEmail} onChange={e => setCommitEmail(e.target.value)} />
              </Stack>
              <Button variant="contained" disabled={busy || !project.repositoryUrl || project.status === 'ARCHIVED' || !branch.trim() || !commitName.trim() || !commitEmail.trim()}
                onClick={() => void run(async () => {
                  const w = await api.workspaces.create(project.id, { branch, newBranch, commitName, commitEmail })
                  setWorkspace(w)
                })}>Start workspace</Button>
              {!project.repositoryUrl ? <Alert severity="info">Connect a repository before starting a workspace.</Alert> : null}
              <Typography variant="body2"><Link to="/settings">Manage your Git access and AI profiles</Link></Typography>
            </Stack>
          ) : (
            <>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <Chip label={workspace.status} size="small" />
                <Typography variant="body2">{workspace.branch}</Typography>
              </Stack>
              {workspace.error ? <Alert severity="error">{workspace.error}</Alert> : null}
              <Typography color="text.secondary" variant="body2">Stop ends processes and keeps files. Resume starts a new container. Delete removes the checkout after checking Git; AI profiles remain.</Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                <Button disabled={busy || (!stopped && workspace.status !== 'ERROR')} onClick={() => void run(async () => { setWorkspace(await api.workspaces.start(workspace.id)) })}>Resume</Button>
                <Button disabled={busy || stopped || workspace.status === 'DELETING'} onClick={() => void run(async () => { setWorkspace(await api.workspaces.stop(workspace.id)) })}>Stop</Button>
                <Button disabled={busy || (!running && !stopped)} onClick={() => void run(async () => { setGit(await api.workspaces.git(workspace.id)) })}>Check Git status</Button>
                <Button color="error" disabled={busy || !stopped} onClick={() => void run(async () => {
                  setGit(await api.workspaces.deletionCheck(workspace.id))
                  setDiscard(false); setConfirmation(''); setDeleteOpen(true)
                })}>Delete checkout</Button>
              </Stack>
              {resources ? <Typography color="text.secondary" variant="body2">
                CPU {resources.cpuPercent.toFixed(1)}% · RAM {(resources.memoryBytes / 1024 ** 2).toFixed(0)} MiB · Files {(resources.diskBytes / 1024 ** 2).toFixed(0)} MiB
                {resources.reason ? ' · ' + resources.reason : ''}
              </Typography> : null}
              {git ? <Box>
                <Alert severity={git.safe ? 'success' : 'warning'}>{git.safe ? 'Git changes are reachable on origin. Deletion checks again after stopping all writers.' : git.warnings.join('. ')}</Alert>
                {git.changedFiles.length ? <Box component="pre" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: 12 }}>{git.changedFiles.join('\n')}</Box> : null}
              </Box> : null}
              {running ? (
                <>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                    <TextField select label="Terminal type" value={provider} onChange={e => { setProvider(e.target.value as WorkspaceTerminal['provider']); setProfile('') }} sx={{ minWidth: 140 }}>
                      <MenuItem value="SHELL">Shell</MenuItem><MenuItem value="CLAUDE">Claude</MenuItem><MenuItem value="CODEX">Codex</MenuItem>
                    </TextField>
                    {provider !== 'SHELL' ? <TextField select label="AI profile" value={profile} onChange={e => setProfile(e.target.value)} sx={{ minWidth: 180 }}>
                      <MenuItem value="">Select your profile</MenuItem>{choices.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                    </TextField> : null}
                    <Button disabled={busy || (provider !== 'SHELL' && !profile)} onClick={() => void run(async () => {
                      const t = await api.workspaces.openTerminal(workspace.id, provider, provider === 'SHELL' ? null : profile)
                      setTerminals(ts => [...ts, t]); setSelected(t.id)
                    })}>Open terminal</Button>
                  </Stack>
                  <Typography variant="body2">Profile terminals open a shell for your selected account. Run claude and /login, or codex login --device-auth followed by codex. <Link to="/settings">Manage profiles</Link></Typography>
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                    {terminals.map((t, index) => <Button key={t.id} size="small" variant={selected === t.id ? 'contained' : 'outlined'} onClick={() => setSelected(t.id)}>{t.provider} {index + 1}</Button>)}
                  </Stack>
                  {active ? <>
                    <TerminalPane terminal={active} />
                    <Button color="warning" disabled={busy} onClick={() => void run(async () => {
                      await api.workspaces.closeTerminal(workspace.id, active.id)
                      setSelected(''); await refresh()
                    })}>End this terminal and its processes</Button>
                  </> : null}
                </>
              ) : null}
            </>
          )}
      </Stack>
      <Dialog open={deleteOpen} onClose={() => { if (!busy) setDeleteOpen(false) }} fullWidth maxWidth="sm">
        <DialogTitle>Delete workspace files?</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography>The checkout and workspace home will be removed. Your personal AI profiles stay available.</Typography>
            {git && !git.safe ? <>
              <Alert severity="warning">{git.warnings.join('. ')}</Alert>
              <FormControlLabel control={<Checkbox checked={discard} onChange={e => setDiscard(e.target.checked)} />} label="I want to discard these files and local Git data" />
              {discard ? <><Typography variant="body2">Enter the workspace ID to confirm permanent deletion: {workspace?.id}</Typography>
                <TextField label="Workspace ID confirmation" value={confirmation} onChange={e => setConfirmation(e.target.value)} /></> : null}
            </> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button color="error" disabled={busy || !workspace || (!git?.safe && (!discard || confirmation !== workspace.id))}
            onClick={() => void run(async () => {
              if (!workspace) return
              setWorkspace(await api.workspaces.remove(workspace.id, discard, confirmation)); setDeleteOpen(false); setGit(null)
            })}>Delete files</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}
