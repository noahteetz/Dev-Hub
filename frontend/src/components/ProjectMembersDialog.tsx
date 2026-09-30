import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import type { Project, ProjectMember, ProjectRole } from '../types'
import { projectCan, roleLabel } from '../utils/projectPermissions'

type MemberRole = Exclude<ProjectRole, 'OWNER'>

interface ProjectMembersDialogProps {
  project: Project
  onClose: () => void
  /** Called after the member list changed, so the project lists can pick up the shared flag. */
  onMembersChanged: () => void
  /** Called after the current user left the project. */
  onLeft: () => void
}

function memberName(member: ProjectMember) {
  return member.displayName || member.username
}

export function ProjectMembersDialog({ project, onClose, onMembersChanged, onLeft }: ProjectMembersDialogProps) {
  const canManage = projectCan(project, 'manageMembers')
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [role, setRole] = useState<MemberRole>('EDITOR')
  const [confirmLeave, setConfirmLeave] = useState(false)

  const load = useCallback(async () => {
    try {
      setMembers(await api.members.list(project.id))
      setError('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The members could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [project.id])

  // The member list comes from the server, so loading it in an effect is the point.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  async function run(action: () => Promise<unknown>, changed = true) {
    setBusy(true)
    setError('')
    try {
      await action()
      if (changed) {
        onMembersChanged()
      }
      return true
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The action failed.')
      return false
    } finally {
      setBusy(false)
    }
  }

  async function addMember() {
    const needle = query.trim()
    if (!needle) {
      return
    }
    const added = await run(async () => {
      const user = await api.users.lookup(needle)
      await api.members.add(project.id, user.id, role)
    })
    if (added) {
      setQuery('')
      await load()
    }
  }

  async function changeRole(member: ProjectMember, next: MemberRole) {
    if (await run(() => api.members.changeRole(project.id, member.userId, next), false)) {
      await load()
    }
  }

  async function removeMember(member: ProjectMember) {
    if (await run(() => api.members.remove(project.id, member.userId))) {
      await load()
    }
  }

  async function leave() {
    if (await run(() => api.members.leave(project.id))) {
      onLeft()
    }
  }

  return (
    <Dialog fullWidth maxWidth="sm" open onClose={onClose}>
      <DialogTitle>Members of {project.name}</DialogTitle>
      <DialogContent>
        <Typography color="text.secondary" sx={{ mb: 2 }} variant="body2">
          Editors change content and the resume context. Viewers only read. Master data, the repository, archiving, and members stay with the owner.
        </Typography>
        {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

        <Stack spacing={1}>
          {loading ? <Typography color="text.secondary" variant="body2">Loading members...</Typography> : null}
          {members.map((member) => (
            <Stack
              direction="row"
              key={member.userId}
              spacing={1}
              sx={{ alignItems: 'center', justifyContent: 'space-between' }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography noWrap sx={{ fontWeight: 700 }}>{memberName(member)}</Typography>
                {member.displayName && member.displayName !== member.username ? (
                  <Typography color="text.secondary" noWrap variant="caption">{member.username}</Typography>
                ) : null}
              </Box>
              {member.role === 'OWNER' || !canManage ? (
                <Chip label={roleLabel(member.role)} size="small" />
              ) : (
                <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                  <Select
                    disabled={busy}
                    inputProps={{ 'aria-label': `Role of ${memberName(member)}` }}
                    size="small"
                    value={member.role}
                    onChange={(event) => void changeRole(member, event.target.value as MemberRole)}
                  >
                    <MenuItem value="EDITOR">Editor</MenuItem>
                    <MenuItem value="VIEWER">Viewer</MenuItem>
                  </Select>
                  <IconButton
                    aria-label={`Remove ${memberName(member)}`}
                    color="error"
                    disabled={busy}
                    size="small"
                    onClick={() => void removeMember(member)}
                  >
                    <DeleteOutlineRoundedIcon fontSize="small" />
                  </IconButton>
                </Stack>
              )}
            </Stack>
          ))}
        </Stack>

        {canManage ? (
          <Stack
            component="form"
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            sx={{ mt: 3 }}
            onSubmit={(event) => {
              event.preventDefault()
              void addMember()
            }}
          >
            <TextField
              fullWidth
              helperText="Exact username or e-mail of somebody who has signed in to Dev Hub before."
              label="Username or e-mail"
              size="small"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <Select
              inputProps={{ 'aria-label': 'Role for the new member' }}
              size="small"
              sx={{ alignSelf: 'flex-start', minWidth: 110 }}
              value={role}
              onChange={(event) => setRole(event.target.value as MemberRole)}
            >
              <MenuItem value="EDITOR">Editor</MenuItem>
              <MenuItem value="VIEWER">Viewer</MenuItem>
            </Select>
            <Button disabled={busy || !query.trim()} sx={{ alignSelf: 'flex-start' }} type="submit" variant="contained">
              Add
            </Button>
          </Stack>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
        {canManage ? (
          <span />
        ) : confirmLeave ? (
          <Stack direction="row" spacing={1}>
            <Button color="error" disabled={busy} variant="contained" onClick={() => void leave()}>Leave project</Button>
            <Button disabled={busy} onClick={() => setConfirmLeave(false)}>Stay</Button>
          </Stack>
        ) : (
          <Button color="error" onClick={() => setConfirmLeave(true)}>Leave this project</Button>
        )}
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
