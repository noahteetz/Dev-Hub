import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined'
import GitHubIcon from '@mui/icons-material/GitHub'
import LanguageRoundedIcon from '@mui/icons-material/LanguageRounded'
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import {
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import type { Project, RepositoryConnection, RepositoryProvider, RepositorySyncStatus } from '../types'
import { formatDate } from '../utils/formatDate'
import { MarkdownView } from './MarkdownView'

interface RepositoryPanelProps {
  project: Project
  repository: RepositoryConnection | null
  loading: boolean
  refreshing: boolean
  onRefresh: () => void
}

const statusLabels: Record<RepositorySyncStatus, string> = {
  NEVER_SYNCED: 'Not synced',
  SYNCING: 'Syncing',
  READY: 'Synced',
  PRIVATE_OR_NOT_FOUND: 'Private or not found',
  CREDENTIAL_INVALID: 'Token rejected',
  CREDENTIAL_INSUFFICIENT: 'Token lacks access',
  RATE_LIMITED: 'Rate limited',
  FAILED: 'Sync failed',
  UNSUPPORTED: 'Unsupported provider',
}

const statusColors: Record<RepositorySyncStatus, 'default' | 'error' | 'info' | 'success' | 'warning'> = {
  NEVER_SYNCED: 'default',
  SYNCING: 'info',
  READY: 'success',
  PRIVATE_OR_NOT_FOUND: 'warning',
  CREDENTIAL_INVALID: 'error',
  CREDENTIAL_INSUFFICIENT: 'warning',
  RATE_LIMITED: 'warning',
  FAILED: 'error',
  UNSUPPORTED: 'default',
}

function providerLabel(provider: RepositoryProvider | null) {
  if (provider === 'GITHUB') return 'GitHub'
  if (provider === 'GITLAB') return 'GitLab'
  return 'Generic Git URL'
}

export function RepositoryPanel({ project, repository, loading, refreshing, onRefresh }: RepositoryPanelProps) {
  if (!project.repositoryUrl) {
    return null
  }

  const metadata = repository?.metadata ?? null
  const syncStatus = metadata?.syncStatus ?? 'NEVER_SYNCED'
  const languageEntries = Object.entries(metadata?.languages ?? {}).sort((left, right) => right[1] - left[1])
  // Every one of these is fixed in the settings, so the panel offers the way there.
  const tokenProblem =
    syncStatus === 'CREDENTIAL_INVALID'
    || syncStatus === 'CREDENTIAL_INSUFFICIENT'
    || syncStatus === 'PRIVATE_OR_NOT_FOUND'
  const remaining = metadata?.rateLimit?.remaining ?? null
  const quotaLabel = remaining === null
    ? ''
    : `${remaining}${metadata?.rateLimit?.limit ? `/${metadata.rateLimit.limit}` : ''} requests left`

  return (
    <Box
      component="section"
      sx={{ bgcolor: 'background.paper', borderRadius: 1, boxShadow: '0 1px 2px rgba(30, 42, 80, 0.04)', mt: 2.5, p: { xs: 2, sm: 2.5 } }}
    >
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0 }}>
          <Box sx={{ alignItems: 'center', bgcolor: 'rgba(91, 97, 232, 0.08)', borderRadius: 1, color: 'primary.main', display: 'flex', height: 36, justifyContent: 'center', width: 36 }}>
            {repository?.provider === 'GITHUB' ? <GitHubIcon fontSize="small" /> : <AccountTreeOutlinedIcon fontSize="small" />}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 800 }}>Repository pulse</Typography>
            <Typography color="text.secondary" noWrap variant="body2">
              {repository?.owner && repository.repositoryName ? `${repository.owner}/${repository.repositoryName}` : project.repositoryUrl}
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexShrink: 0 }}>
          {repository?.canonicalUrl ? (
            <Tooltip title="Open repository">
              <IconButton aria-label="Open repository" component="a" href={repository.canonicalUrl} rel="noreferrer" size="small" target="_blank">
                <OpenInNewRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : null}
          <Button disabled={loading || refreshing} startIcon={<RefreshRoundedIcon />} variant="outlined" onClick={onRefresh}>
            {refreshing ? 'Syncing' : 'Sync now'}
          </Button>
        </Stack>
      </Stack>

      {loading ? (
        <Stack spacing={1} sx={{ mt: 2.5 }}>
          <Skeleton height={24} width="35%" />
          <Skeleton height={20} width="75%" />
          <Skeleton height={80} />
        </Stack>
      ) : (
        <>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.75, mt: 2.5 }}>
            <Chip color={statusColors[syncStatus]} label={statusLabels[syncStatus]} size="small" />
            <Chip label={providerLabel(repository?.provider ?? null)} size="small" sx={{ bgcolor: 'action.hover' }} />
            {metadata?.defaultBranch ? <Chip icon={<AccountTreeOutlinedIcon />} label={metadata.defaultBranch} size="small" sx={{ bgcolor: 'action.hover' }} /> : null}
            {quotaLabel ? (
              <Tooltip title="Requests left before the provider stops answering">
                <Chip label={quotaLabel} size="small" sx={{ bgcolor: 'action.hover' }} />
              </Tooltip>
            ) : null}
          </Stack>

          {metadata?.errorMessage ? (
            <Typography color={syncStatus === 'FAILED' ? 'error.main' : 'text.secondary'} sx={{ mt: 1.5 }} variant="body2">
              {metadata.errorMessage}
              {metadata.lastSuccessfulSyncAt ? ` Last successful sync: ${formatDate(metadata.lastSuccessfulSyncAt)}.` : ''}
            </Typography>
          ) : null}

          {tokenProblem ? (
            <Button component={RouterLink} size="small" sx={{ mt: 0.5 }} to="/settings">
              Open the Git access settings
            </Button>
          ) : null}

          {metadata ? (
            <>
              <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' }, mt: 2.5 }}>
                <Box>
                  <Typography color="text.secondary" variant="caption">Latest commit</Typography>
                  <Typography noWrap sx={{ fontWeight: 700, mt: 0.35 }} title={metadata.lastCommitMessage || undefined}>
                    {metadata.lastCommitMessage || 'No commit message'}
                  </Typography>
                  <Typography color="text.disabled" variant="caption">
                    {metadata.lastCommitAuthor || 'Unknown author'}{metadata.lastCommitAt ? ` - ${formatDate(metadata.lastCommitAt)}` : ''}
                  </Typography>
                </Box>
                <Box>
                  <Typography color="text.secondary" variant="caption">Languages</Typography>
                  <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5, mt: 0.75 }}>
                    {languageEntries.length > 0 ? languageEntries.slice(0, 5).map(([language, percentage]) => (
                      <Chip key={language} label={`${language} ${percentage}%`} size="small" sx={{ bgcolor: 'action.hover', fontFamily: 'monospace', fontSize: 11 }} />
                    )) : <Typography color="text.disabled" variant="body2">No language data</Typography>}
                  </Stack>
                </Box>
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 0.75 }}>
                  {metadata.branchesUrl ? <Button component="a" href={metadata.branchesUrl} rel="noreferrer" size="small" startIcon={<AccountTreeOutlinedIcon />} target="_blank">Branches</Button> : null}
                  {metadata.issuesUrl ? <Button component="a" href={metadata.issuesUrl} rel="noreferrer" size="small" startIcon={<LanguageRoundedIcon />} target="_blank">Issues</Button> : null}
                  {metadata.pullRequestsUrl ? <Button component="a" href={metadata.pullRequestsUrl} rel="noreferrer" size="small" startIcon={<GitHubIcon />} target="_blank">Pull requests</Button> : null}
                </Stack>
              </Box>

              {metadata.readmeContent ? (
                <>
                  <Divider sx={{ my: 2.5 }} />
                  <Typography sx={{ fontWeight: 800 }}>{metadata.readmeFileName || 'README.md'}</Typography>
                  <MarkdownView
                    content={metadata.readmeContent}
                    sx={{ bgcolor: 'action.hover', borderRadius: 1, fontSize: 13.5, maxHeight: 320, mt: 1.25, overflow: 'auto', p: 1.75 }}
                  />
                </>
              ) : null}
            </>
          ) : (
            <Typography color="text.secondary" sx={{ mt: 2.5 }} variant="body2">
              No repository snapshot yet. Sync this project to capture its branch, latest commit, languages, and README.
            </Typography>
          )}
        </>
      )}
    </Box>
  )
}