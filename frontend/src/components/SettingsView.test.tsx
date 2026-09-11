import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GitCredential, GitCredentialOverview } from '../types'
import { SettingsView } from './SettingsView'

const mocks = vi.hoisted(() => ({
  credentials: { list: vi.fn(), save: vi.fn(), verify: vi.fn(), remove: vi.fn() },
  repositories: { list: vi.fn(), owners: vi.fn(), refresh: vi.fn(), importSelection: vi.fn() },
}))

vi.mock('../api', () => ({
  api: { gitCredentials: mocks.credentials, gitRepositories: mocks.repositories },
}))

function credential(overrides: Partial<GitCredential> = {}): GitCredential {
  return {
    provider: 'GITHUB',
    label: 'Privat',
    host: 'github.com',
    tokenHint: 'x9k2',
    accountLogin: 'octocat',
    scopes: ['repo', 'read:org'],
    status: 'VERIFIED',
    lastError: '',
    createdAt: '2026-09-01T10:00:00Z',
    lastVerifiedAt: '2026-09-10T10:00:00Z',
    ...overrides,
  }
}

function overview(partial: Partial<GitCredentialOverview> = {}): GitCredentialOverview {
  return { encryptionConfigured: true, credentials: [], ...partial }
}

function view() {
  return render(
    <MemoryRouter initialEntries={['/settings']}>
      <SettingsView onProjectsChanged={vi.fn()} />
    </MemoryRouter>,
  )
}

describe('SettingsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.repositories.list.mockResolvedValue([])
    mocks.repositories.owners.mockResolvedValue([])
  })

  it('sends a typed token to the provider it belongs to', async () => {
    mocks.credentials.list.mockResolvedValue(overview())
    mocks.credentials.save.mockResolvedValue(credential())
    view()

    const field = (await screen.findAllByLabelText('Personal access token'))[0]
    fireEvent.change(field, { target: { value: 'ghp_typed_value' } })
    fireEvent.click(screen.getAllByRole('button', { name: 'Connect' })[0])

    await waitFor(() => expect(mocks.credentials.save).toHaveBeenCalledWith('GITHUB', {
      label: '',
      token: 'ghp_typed_value',
    }))
    expect(await screen.findByText(/Connected to GitHub as octocat/)).toBeInTheDocument()
  })

  it('never renders the token itself, only the account and the hint', async () => {
    mocks.credentials.list.mockResolvedValue(overview({ credentials: [credential()] }))
    view()

    expect(await screen.findByText('octocat')).toBeInTheDocument()
    expect(screen.getByText(/Token ending in x9k2/)).toBeInTheDocument()
    expect(screen.getByText('read:org')).toBeInTheDocument()
    expect(screen.queryAllByRole('textbox', { name: /token/i })).toHaveLength(0)
  })

  it('explains that no token can be stored without an encryption key', async () => {
    mocks.credentials.list.mockResolvedValue(overview({ encryptionConfigured: false }))
    view()

    expect(await screen.findByText(/No encryption key is configured/)).toBeInTheDocument()
  })

  it('shows what the provider said about a rejected token', async () => {
    mocks.credentials.list.mockResolvedValue(overview({
      credentials: [credential({ status: 'INVALID', lastError: 'The provider rejected the token.' })],
    }))
    view()

    expect(await screen.findByText('Token rejected')).toBeInTheDocument()
    expect(screen.getByText('The provider rejected the token.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Import repositories' })).not.toBeInTheDocument()
  })

  it('removes a stored token and reloads the overview', async () => {
    mocks.credentials.list
      .mockResolvedValueOnce(overview({ credentials: [credential()] }))
      .mockResolvedValue(overview())
    mocks.credentials.remove.mockResolvedValue(undefined)
    view()

    fireEvent.click(await screen.findByRole('button', { name: 'Remove token' }))

    await waitFor(() => expect(mocks.credentials.remove).toHaveBeenCalledWith('GITHUB'))
    expect(await screen.findByText(/token was removed/)).toBeInTheDocument()
    await waitFor(() => expect(mocks.credentials.list).toHaveBeenCalledTimes(2))
  })

  it('imports the repositories picked from the listing', async () => {
    mocks.credentials.list.mockResolvedValue(overview({ credentials: [credential()] }))
    mocks.repositories.list.mockResolvedValue([
      {
        provider: 'GITHUB',
        owner: 'octocat',
        name: 'vibe-thing',
        fullName: 'octocat/vibe-thing',
        description: 'A weekend experiment',
        privateRepository: true,
        archived: false,
        defaultBranch: 'main',
        lastActivityAt: '2026-09-05T10:00:00Z',
        primaryLanguage: 'Java',
        webUrl: 'https://github.com/octocat/vibe-thing',
      },
    ])
    mocks.repositories.importSelection.mockResolvedValue({ created: [], skipped: [] })
    view()

    fireEvent.click(await screen.findByRole('button', { name: 'Import repositories' }))
    fireEvent.click(await screen.findByText('octocat/vibe-thing'))
    fireEvent.click(await screen.findByRole('button', { name: 'Import 1' }))

    await waitFor(() => expect(mocks.repositories.importSelection).toHaveBeenCalledWith('GITHUB', [
      'octocat/vibe-thing',
    ]))
  })
})
