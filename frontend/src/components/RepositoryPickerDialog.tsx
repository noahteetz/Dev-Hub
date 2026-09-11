import { useMemo, useState } from 'react'
import GitHubIcon from '@mui/icons-material/GitHub'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  LinearProgress,
  List,
  ListItemButton,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import { useRemoteRepositories } from '../hooks/useRemoteRepositories'
import { formatDate } from '../utils/formatDate'
import type { RemoteRepository, RepositoryProvider } from '../types'

interface RepositoryPickerDialogProps {
  open: boolean
  /** Providers with a stored token. An empty list turns the dialog into a hint. */
  connectedProviders: RepositoryProvider[]
  multiple?: boolean
  busy?: boolean
  onClose: () => void
  /** Single select: called with the chosen repository. */
  onSelect?: (repository: RemoteRepository) => void
  /** Multi select: called with the provider and the chosen full names. */
  onConfirm?: (provider: RepositoryProvider, fullNames: string[]) => void
}

export function RepositoryPickerDialog({
  open,
  connectedProviders,
  multiple = false,
  busy = false,
  onClose,
  onSelect,
  onConfirm,
}: RepositoryPickerDialogProps) {
  const [provider, setProvider] = useState<RepositoryProvider>(connectedProviders[0] ?? 'GITHUB')
  const [term, setTerm] = useState('')
  const [owner, setOwner] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const connected = connectedProviders.includes(provider)
  const { repositories, owners, loading, error, reload } = useRemoteRepositories(
    provider,
    term,
    owner,
    open && connected,
  )
  const selectedSet = useMemo(() => new Set(selected), [selected])

  function switchProvider(next: RepositoryProvider) {
    setProvider(next)
    setOwner('')
    setSelected([])
  }

  function toggle(repository: RemoteRepository) {
    if (!multiple) {
      onSelect?.(repository)
      return
    }
    setSelected((current) => (
      current.includes(repository.fullName)
        ? current.filter((name) => name !== repository.fullName)
        : [...current, repository.fullName]
    ))
  }

  return (
    <Dialog fullWidth maxWidth="sm" open={open} onClose={busy ? undefined : onClose}>
      <DialogTitle>{multiple ? 'Import repositories' : 'Choose a repository'}</DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        {connectedProviders.length === 0 ? (
          <Alert severity="info" sx={{ m: 2 }}>
            No token is stored yet. Add one under Settings to see your private repositories.
          </Alert>
        ) : (
          <>
            <Stack spacing={1.5} sx={{ p: 2 }}>
              {connectedProviders.length > 1 ? (
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={provider}
                  onChange={(_event, next: RepositoryProvider | null) => next && switchProvider(next)}
                >
                  {connectedProviders.map((candidate) => (
                    <ToggleButton key={candidate} value={candidate}>
                      {candidate === 'GITHUB' ? 'GitHub' : 'GitLab'}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              ) : null}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
                <TextField
                  autoFocus
                  fullWidth
                  label="Search repositories"
                  placeholder="Name or description"
                  size="small"
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
                />
                <TextField
                  label="Account"
                  select
                  size="small"
                  sx={{ minWidth: 180 }}
                  value={owner}
                  onChange={(event) => setOwner(event.target.value)}
                >
                  <MenuItem value="">All accounts</MenuItem>
                  {owners.map((candidate) => (
                    <MenuItem key={candidate.login} value={candidate.login}>
                      {candidate.login}
                      {candidate.type === 'ORGANIZATION' ? ' (org)' : ''} · {candidate.repositoryCount}
                    </MenuItem>
                  ))}
                </TextField>
                <Tooltip title="Reload from the provider">
                  <span>
                    <Button
                      disabled={loading}
                      startIcon={<RefreshRoundedIcon />}
                      onClick={() => void reload()}
                    >
                      Reload
                    </Button>
                  </span>
                </Tooltip>
              </Stack>
              {error ? <Alert severity="error">{error}</Alert> : null}
            </Stack>
            {loading ? <LinearProgress /> : null}
            <List disablePadding sx={{ maxHeight: 360, overflow: 'auto' }}>
              {!loading && repositories.length === 0 && !error ? (
                <Typography color="text.secondary" sx={{ px: 2, py: 3 }} variant="body2">
                  No repository matches this filter.
                </Typography>
              ) : null}
              {repositories.map((repository) => (
                <ListItemButton
                  key={repository.fullName}
                  selected={selectedSet.has(repository.fullName)}
                  sx={{ alignItems: 'flex-start', gap: 1 }}
                  onClick={() => toggle(repository)}
                >
                  {multiple ? (
                    <Checkbox
                      checked={selectedSet.has(repository.fullName)}
                      disableRipple
                      size="small"
                      sx={{ mt: -0.5 }}
                      tabIndex={-1}
                    />
                  ) : null}
                  <Box sx={{ minWidth: 0 }}>
                    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                      {repository.privateRepository ? (
                        <LockOutlinedIcon fontSize="inherit" titleAccess="Private repository" />
                      ) : (
                        <PublicOutlinedIcon fontSize="inherit" titleAccess="Public repository" />
                      )}
                      <Typography sx={{ fontWeight: 700 }}>{repository.fullName}</Typography>
                      {repository.archived ? <Chip label="Archived" size="small" /> : null}
                      {repository.primaryLanguage ? (
                        <Chip label={repository.primaryLanguage} size="small" sx={{ bgcolor: 'action.hover' }} />
                      ) : null}
                    </Stack>
                    <Typography color="text.secondary" variant="body2">
                      {repository.description || 'No description'}
                    </Typography>
                    {repository.lastActivityAt ? (
                      <Typography color="text.secondary" variant="caption">
                        Last activity {formatDate(repository.lastActivityAt)}
                      </Typography>
                    ) : null}
                  </Box>
                </ListItemButton>
              ))}
            </List>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button disabled={busy} onClick={onClose}>
          Cancel
        </Button>
        {multiple ? (
          <Button
            disabled={busy || selected.length === 0}
            startIcon={busy ? <CircularProgress size={16} /> : <GitHubIcon />}
            variant="contained"
            onClick={() => onConfirm?.(provider, selected)}
          >
            {selected.length === 0 ? 'Import' : `Import ${selected.length}`}
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  )
}
