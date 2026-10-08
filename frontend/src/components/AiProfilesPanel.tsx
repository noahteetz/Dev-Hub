import { Alert, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Paper, Stack, TextField, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { api } from '../api'
import type { AiProfile, AiProvider } from '../types'

export function AiProfilesPanel() {
  const [allowed, setAllowed] = useState(false)
  const [profiles, setProfiles] = useState<AiProfile[]>([])
  const [providers, setProviders] = useState<AiProvider[]>(['CLAUDE'])
  const [name, setName] = useState('')
  const [editing, setEditing] = useState<AiProfile | null>(null)
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
  function reset() { setEditing(null); setName(''); setProviders(['CLAUDE']) }
  function toggle(provider: AiProvider, checked: boolean) {
    setProviders(current => checked ? [...current, provider].sort() : current.filter(p => p !== provider))
  }
  if (!allowed) return null
  return (
    <Paper component="section" variant="outlined" sx={{ my: 4, p: 2.5 }}>
      <Stack spacing={2}>
        <Typography variant="h6">Personal AI profiles</Typography>
        <Typography color="text.secondary" variant="body2">Name a profile and choose Claude, Codex or both. Sign in when you first open its CLI; your login is kept for other workspaces. You can use the same profile in several terminals.</Typography>
        {error ? <Alert severity="error">{error}</Alert> : null}
        {profiles.map(profile => <Stack key={profile.id} direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography>{profile.name}</Typography>
            {profile.providers.map(provider => <Chip key={provider} label={provider === 'CLAUDE' ? 'Claude' : 'Codex'} size="small" />)}
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button disabled={busy} aria-label={`Edit profile ${profile.name}`} onClick={() => { setEditing(profile); setName(profile.name); setProviders(profile.providers); setError('') }}>Edit profile</Button>
            <Button color="error" disabled={busy} onClick={() => setSelected(profile)}>Remove profile</Button>
          </Stack>
        </Stack>)}
        <Stack component="form" onSubmit={event => {
          event.preventDefault()
          if (busy || !name.trim() || !providers.length) return
          void run(async () => {
            if (editing) await api.aiProfiles.update(editing.id, { name: name.trim(), providers })
            else await api.aiProfiles.create(providers, name.trim())
            reset()
          })
        }} spacing={1}>
          <TextField label="Profile name" value={name} disabled={busy} onChange={e => setName(e.target.value)} slotProps={{ htmlInput: { maxLength: 120 } }} />
          <Stack direction="row" spacing={1}>
            {(['CLAUDE', 'CODEX'] as const).map(provider => <FormControlLabel key={provider}
              control={<Checkbox checked={providers.includes(provider)} disabled={busy} onChange={e => toggle(provider, e.target.checked)} />}
              label={provider === 'CLAUDE' ? 'Claude' : 'Codex'} />)}
          </Stack>
          <Typography color="text.secondary" variant="caption">Select at least one provider. Disabling a provider keeps its saved login. End terminals using it before disabling it; enabling a provider applies to new terminals.</Typography>
          <Stack direction="row" spacing={1}>
            <Button type="submit" disabled={busy || !name.trim() || !providers.length}>{editing ? 'Save profile' : 'Add profile'}</Button>
            {editing ? <Button disabled={busy} onClick={reset}>Cancel editing</Button> : null}
          </Stack>
        </Stack>
      </Stack>
      <Dialog open={selected !== null} onClose={() => { if (!busy) setSelected(null) }}>
        <DialogTitle>Remove AI login profile?</DialogTitle>
        <DialogContent>Removing {selected?.name} deletes all its saved Claude and Codex login files, including disabled providers. Stop your workspaces first. Recreating the profile requires signing in again.</DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={() => setSelected(null)}>Cancel</Button>
          <Button color="error" disabled={busy} onClick={() => void run(async () => {
            if (selected) { await api.aiProfiles.remove(selected.id); if (editing?.id === selected.id) reset() }
            setSelected(null)
          })}>Delete profile and login</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}
