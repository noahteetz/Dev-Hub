import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { RepositoryConnection, RepositoryMetadata } from '../types'
import { projectFixture } from '../test/projectFixture'
import { RepositoryPanel } from './RepositoryPanel'

function metadata(overrides: Partial<RepositoryMetadata> = {}): RepositoryMetadata {
  return {
    projectId: 1,
    provider: 'GITHUB',
    owner: 'octocat',
    repositoryName: 'vibe-thing',
    canonicalUrl: 'https://github.com/octocat/vibe-thing',
    defaultBranch: 'main',
    lastCommitSha: 'abc1234',
    lastCommitMessage: 'Wire up the picker',
    lastCommitAuthor: 'Ada Lovelace',
    lastCommitAt: '2026-09-01T08:00:00Z',
    readmeFileName: 'README.md',
    readmeContent: '',
    languages: { Java: 80 },
    syncStatus: 'READY',
    lastAttemptAt: '2026-09-10T08:00:00Z',
    lastSuccessfulSyncAt: '2026-09-10T08:00:00Z',
    errorCode: '',
    errorMessage: '',
    branchesUrl: '',
    issuesUrl: '',
    pullRequestsUrl: '',
    etag: '"v1"',
    rateLimit: { limit: null, remaining: null, resetAt: null },
    ...overrides,
  }
}

function view(connection: RepositoryMetadata | null) {
  const repository: RepositoryConnection = {
    projectId: 1,
    inputUrl: 'https://github.com/octocat/vibe-thing',
    provider: 'GITHUB',
    owner: 'octocat',
    repositoryName: 'vibe-thing',
    canonicalUrl: 'https://github.com/octocat/vibe-thing',
    metadata: connection,
  }
  return render(
    <MemoryRouter>
      <RepositoryPanel
        loading={false}
        project={projectFixture({ repositoryUrl: 'https://github.com/octocat/vibe-thing' })}
        refreshing={false}
        repository={repository}
        onRefresh={vi.fn()}
      />
    </MemoryRouter>,
  )
}

describe('RepositoryPanel', () => {
  it('names a rejected token and offers the way to fix it', () => {
    view(metadata({
      syncStatus: 'CREDENTIAL_INVALID',
      errorMessage: 'The stored GitHub token was rejected. Update it in the settings.',
    }))

    expect(screen.getByText('Token rejected')).toBeInTheDocument()
    expect(screen.getByText(/Update it in the settings/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open the Git access settings' })).toHaveAttribute('href', '/settings')
  })

  it('separates a missing scope from a rejected token', () => {
    view(metadata({ syncStatus: 'CREDENTIAL_INSUFFICIENT' }))

    expect(screen.getByText('Token lacks access')).toBeInTheDocument()
  })

  it('shows the quota left when the provider reported it', () => {
    view(metadata({ rateLimit: { limit: 5000, remaining: 4997, resetAt: null } }))

    expect(screen.getByText('4997/5000 requests left')).toBeInTheDocument()
  })

  it('leaves out the quota when the provider reported none', () => {
    view(metadata())

    expect(screen.queryByText(/requests left/)).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Open the Git access settings' })).not.toBeInTheDocument()
  })
})
