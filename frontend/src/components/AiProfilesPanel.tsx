import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { api } from '../api'
import type { AiProfile } from '../types'

export function AiProfilesPanel() {
  const [allowed, setAllowed] = useState(false)
  const [profiles, setProfiles] = useState<AiProfile[]>([])
  const [provider, setProvider] = useState<AiProfile['provider']>('CLAUDE')
  const [name, setName] = useState('')
  const [selected, setSelected] = useState<AiProfile | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    let alive = true
    api.workspaces.config().then(async config => {
      if (!alive || !config.enabled || !config.allowed) return
      setAllowed(true)
      const values = await api.aiProfiles.list()
      if (alive) setProfiles(values)
    }).catch((reason: unknown) => { if (alive) setError(reason instanceof Error ? reason.message : 'Profiles unavailable') })
    return () => { alive = false }
  }, [])
  async function run(action: () => Promise<void>) {
    setBusy(true); setError('')
    try { await action(); setProfiles(await api.aiProfiles.list()) }
    catch (reason: unknown) { setError(reason instanceof Error ? reason.message : 'Profile operation failed') }
    finally { setBusy(false) }
  }
  if (!allowed) return null
  return (
    <Paper component="section" variant="outlined" sx={{ my: 4, p: 2.5 }}>
      <Stack spacing={2}>
        <Typography variant="h6">Personal AI profiles</Typography>
        <Typography color="text.secondary" variant="body2">Profiles keep your own Claude and Codex login between workspaces. Select one when opening a project terminal and sign in there. Each profile can have one active terminal.</Typography>
        {error ? <Alert severity="error">{error}</Alert> : null}
        {profiles.map(profile => <Stack key={profile.id} direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography>{profile.provider} · {profile.name}</Typography>
          <Button color="error" disabled={busy} onClick={() => setSelected(profile)}>Remove profile</Button>
        </Stack>)}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <TextField select label="AI provider" value={provider} onChange={e => setProvider(e.target.value as AiProfile['provider'])} sx={{ minWidth: 140 }}>
            <MenuItem value="CLAUDE">Claude</MenuItem><MenuItem value="CODEX">Codex</MenuItem>
          </TextField>
          <TextField label="Profile name" value={name} onChange={e => setName(e.target.value)} />
          <Button disabled={busy || !name.trim()} onClick={() => void run(async () => { await api.aiProfiles.create(provider, name.trim()); setName('') })}>Add profile</Button>
        </Stack>
      </Stack>
      <Dialog open={selected !== null} onClose={() => { if (!busy) setSelected(null) }}>
        <DialogTitle>Remove AI login profile?</DialogTitle>
        <DialogContent>Removing {selected?.name} deletes its saved login files. Stop your workspaces first. Recreating the profile requires signing in again.</DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={() => setSelected(null)}>Cancel</Button>
          <Button color="error" disabled={busy} onClick={() => void run(async () => {
            if (selected) await api.aiProfiles.remove(selected.id)
            setSelected(null)
          })}>Delete profile and login</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}
