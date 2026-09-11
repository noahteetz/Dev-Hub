import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'
import GitHubIcon from '@mui/icons-material/GitHub'
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined'
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Link,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { AccountPanel } from '../auth/AccountPanel'
import { ColorModeChoice } from './ColorModeToggle'
import { RepositoryPickerDialog } from './RepositoryPickerDialog'
import { formatDate } from '../utils/formatDate'
import type { GitCredential, GitCredentialStatus, RepositoryProvider } from '../types'

interface ProviderCopy {
  name: string
  /** Where the user creates a token, with the scopes Dev Hub needs preselected. */
  tokenUrl: string
  scopeHint: string
  organizationHint: string
}

const providerCopy: Record<'GITHUB' | 'GITLAB', ProviderCopy> = {
  GITHUB: {
    name: 'GitHub',
    tokenUrl: 'https://github.com/settings/tokens/new?scopes=repo,read:org&description=Dev%20Hub',
    scopeHint: 'A classic token needs the scopes repo and read:org. A fine-grained token needs Contents and Metadata set to read.',
    organizationHint: 'A fine-grained token has to be approved per organization by an owner. With single sign-on, a classic token also has to be authorized for the organization, otherwise its repositories stay invisible without any error.',
  },
  GITLAB: {
    name: 'GitLab',
    tokenUrl: 'https://gitlab.com/-/user_settings/personal_access_tokens?name=Dev+Hub&scopes=read_api,read_repository',
    scopeHint: 'The token needs the scopes read_api and read_repository.',
    organizationHint: 'Group projects appear as soon as the account behind the token is a member with at least reporter access.',
  },
}

const statusCopy: Record<GitCredentialStatus, { label: string; color: 'default' | 'error' | 'success' | 'warning' }> = {
  VERIFIED: { label: 'Connected', color: 'success' },
  INVALID: { label: 'Token rejected', color: 'error' },
  UNREADABLE: { label: 'Token unreadable', color: 'error' },
  UNVERIFIED: { label: 'Not checked', color: 'warning' },
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

interface SettingsViewProps {
  /** Lets the shell reload its project list after an import created projects. */
  onProjectsChanged: () => void
}

export function SettingsView({ onProjectsChanged }: SettingsViewProps) {
  const navigate = useNavigate()
  const [credentials, setCredentials] = useState<GitCredential[]>([])
  const [encryptionConfigured, setEncryptionConfigured] = useState(true)
  const [loading, setLoading] = useState(true)
  const [busyProvider, setBusyProvider] = useState<RepositoryProvider | null>(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [importOpen, setImportOpen] = useState(false)
  const [importing, setImporting] = useState(false)

  const [reloadCount, setReloadCount] = useState(0)

  useEffect(() => {
    let active = true

    api.gitCredentials
      .list()
      .then((overview) => {
        if (active) {
          setCredentials(overview.credentials)
          setEncryptionConfigured(overview.encryptionConfigured)
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(errorMessage(reason))
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [reloadCount])

  /** Each card shows its own spinner, so a reload does not blank the whole page. */
  async function run(provider: RepositoryProvider, action: () => Promise<string>) {
    setBusyProvider(provider)
    setError('')
    setNotice('')
    try {
      setNotice(await action())
      setReloadCount((current) => current + 1)
    } catch (reason: unknown) {
      setError(errorMessage(reason))
    } finally {
      setBusyProvider(null)
    }
  }

  async function importSelection(provider: RepositoryProvider, fullNames: string[]) {
    setImporting(true)
    setError('')
    try {
      const result = await api.gitRepositories.importSelection(provider, fullNames)
      const skipped = result.skipped.length ? ` ${result.skipped.length} were skipped.` : ''
      setNotice(`${result.created.length} project${result.created.length === 1 ? '' : 's'} created.${skipped}`)
      setImportOpen(false)
      onProjectsChanged()
    } catch (reason: unknown) {
      setError(errorMessage(reason))
    } finally {
      setImporting(false)
    }
  }

  const connectedProviders = credentials
    .filter((credential) => credential.status === 'VERIFIED')
    .map((credential) => credential.provider)

  return (
    <Box component="main" sx={{ maxWidth: 760, mx: 'auto', px: { xs: 2, sm: 3 }, py: { xs: 3, sm: 5 }, width: '100%' }}>
      <AccountPanel />

      <Typography component="h2" sx={{ fontWeight: 800, mb: 1 }} variant="h5">
        Appearance
      </Typography>
      <Paper component="section" elevation={0} sx={{ borderRadius: 1, mb: 4, p: { xs: 2, sm: 2.5 } }} variant="outlined">
        <Typography color="text.secondary" sx={{ mb: 2 }} variant="body2">
          System follows the light or dark setting of your operating system. The choice is kept in this browser
          only, so every device can differ.
        </Typography>
        <ColorModeChoice />
      </Paper>

      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography component="h1" sx={{ fontWeight: 800 }} variant="h5">
          Git access
        </Typography>
        <Button onClick={() => navigate('/dashboard')}>Back to projects</Button>
      </Stack>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        A stored token lets Dev Hub read your private repositories and the ones in your organizations. It is
        encrypted before it reaches the database and is never shown again.
      </Typography>

      {!encryptionConfigured ? (
        <Alert severity="warning" sx={{ mb: 2.5 }}>
          No encryption key is configured, so no token can be stored. Set DEVHUB_ENCRYPTION_KEY and restart the
          backend. Generate a key with: openssl rand -base64 32
        </Alert>
      ) : null}
      {error ? <Alert severity="error" sx={{ mb: 2.5 }} onClose={() => setError('')}>{error}</Alert> : null}
      {notice ? <Alert severity="success" sx={{ mb: 2.5 }} onClose={() => setNotice('')}>{notice}</Alert> : null}

      {loading ? (
        <Stack spacing={2}>
          <Skeleton height={200} variant="rounded" />
          <Skeleton height={200} variant="rounded" />
        </Stack>
      ) : (
        <Stack spacing={2.5}>
          {(['GITHUB', 'GITLAB'] as const).map((provider) => (
            <ProviderCard
              key={provider}
              busy={busyProvider === provider}
              copy={providerCopy[provider]}
              credential={credentials.find((candidate) => candidate.provider === provider) ?? null}
              disabled={!encryptionConfigured}
              provider={provider}
              onImport={() => setImportOpen(true)}
              onRemove={() => void run(provider, async () => {
                await api.gitCredentials.remove(provider)
                return `The ${providerCopy[provider].name} token was removed.`
              })}
              onSave={(label, token) => void run(provider, async () => {
                const saved = await api.gitCredentials.save(provider, { label, token })
                return `Connected to ${providerCopy[provider].name} as ${saved.accountLogin}.`
              })}
              onVerify={() => void run(provider, async () => {
                const checked = await api.gitCredentials.verify(provider)
                return checked.status === 'VERIFIED'
                  ? `The ${providerCopy[provider].name} token is still valid.`
                  : `The ${providerCopy[provider].name} token could not be confirmed.`
              })}
            />
          ))}
        </Stack>
      )}

      <RepositoryPickerDialog
        busy={importing}
        connectedProviders={connectedProviders}
        multiple
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onConfirm={(provider, fullNames) => void importSelection(provider, fullNames)}
      />
    </Box>
  )
}

interface ProviderCardProps {
  provider: RepositoryProvider
  copy: ProviderCopy
  credential: GitCredential | null
  busy: boolean
  disabled: boolean
  onSave: (label: string, token: string) => void
  onVerify: () => void
  onRemove: () => void
  onImport: () => void
}

function ProviderCard({
  provider,
  copy,
  credential,
  busy,
  disabled,
  onSave,
  onVerify,
  onRemove,
  onImport,
}: ProviderCardProps) {
  const [token, setToken] = useState('')
  const [label, setLabel] = useState('')
  const status = credential ? statusCopy[credential.status] : null

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSave(label, token)
    setToken('')
  }

  return (
    <Paper component="section" elevation={0} sx={{ borderRadius: 1, p: { xs: 2, sm: 2.5 } }} variant="outlined">
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
          {provider === 'GITHUB' ? <GitHubIcon /> : <AccountTreeOutlinedIcon />}
          <Box>
            <Typography sx={{ fontWeight: 800 }}>{copy.name}</Typography>
            <Typography color="text.secondary" variant="body2">
              {credential ? credential.host : 'Not connected'}
            </Typography>
          </Box>
        </Stack>
        {status ? <Chip color={status.color} label={status.label} size="small" /> : null}
      </Stack>

      {credential ? (
        <>
          <Divider sx={{ my: 2 }} />
          <Stack spacing={0.75}>
            <Typography variant="body2">
              Signed in as <strong>{credential.accountLogin || 'unknown account'}</strong>
              {credential.label && credential.label !== credential.accountLogin ? ` · ${credential.label}` : ''}
            </Typography>
            <Typography color="text.secondary" variant="body2">
              Token ending in {credential.tokenHint || 'unknown'}
              {credential.lastVerifiedAt ? ` · checked ${formatDate(credential.lastVerifiedAt)}` : ''}
            </Typography>
            {credential.scopes.length ? (
              <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5, pt: 0.5 }}>
                {credential.scopes.map((scope) => (
                  <Chip key={scope} label={scope} size="small" sx={{ bgcolor: 'action.hover' }} />
                ))}
              </Stack>
            ) : (
              <Typography color="text.secondary" variant="caption">
                The provider reported no scopes. Fine-grained tokens do not send any.
              </Typography>
            )}
          </Stack>
          {credential.lastError ? (
            <Alert severity="error" sx={{ mt: 2 }}>
              {credential.lastError}
            </Alert>
          ) : null}
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mt: 2 }}>
            <Button
              disabled={busy}
              startIcon={busy ? <CircularProgress size={16} /> : <CheckCircleOutlineRoundedIcon />}
              onClick={onVerify}
            >
              Check again
            </Button>
            {credential.status === 'VERIFIED' ? (
              <Button disabled={busy} startIcon={<DownloadRoundedIcon />} onClick={onImport}>
                Import repositories
              </Button>
            ) : null}
            <Button color="error" disabled={busy} startIcon={<DeleteOutlineRoundedIcon />} onClick={onRemove}>
              Remove token
            </Button>
          </Stack>
        </>
      ) : null}

      <Divider sx={{ my: 2 }} />
      <Box component="form" onSubmit={submit}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
          <TextField
            fullWidth
            label={credential ? 'Replace the token' : 'Personal access token'}
            placeholder={provider === 'GITHUB' ? 'ghp_...' : 'glpat-...'}
            size="small"
            type="password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
          />
          <TextField
            label="Label"
            placeholder="Private"
            size="small"
            sx={{ minWidth: 160 }}
            value={label}
            onChange={(event) => setLabel(event.target.value)}
          />
          <Button
            disabled={busy || disabled || !token.trim()}
            startIcon={busy ? <CircularProgress size={16} /> : <RefreshRoundedIcon />}
            type="submit"
            variant="contained"
          >
            {credential ? 'Replace' : 'Connect'}
          </Button>
        </Stack>
      </Box>
      <Typography color="text.secondary" sx={{ display: 'block', mt: 1.5 }} variant="caption">
        {copy.scopeHint}{' '}
        <Link href={copy.tokenUrl} rel="noreferrer" target="_blank">
          Create a token <OpenInNewRoundedIcon fontSize="inherit" sx={{ verticalAlign: 'middle' }} />
        </Link>
      </Typography>
      <Typography color="text.secondary" sx={{ display: 'block', mt: 1 }} variant="caption">
        {copy.organizationHint}
      </Typography>
    </Paper>
  )
}
