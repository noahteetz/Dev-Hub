import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RemoteRepository } from '../types'
import { RepositoryPickerDialog } from './RepositoryPickerDialog'

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  owners: vi.fn(),
  refresh: vi.fn(),
  importSelection: vi.fn(),
}))

vi.mock('../api', () => ({ api: { gitRepositories: mocks } }))

function repository(overrides: Partial<RemoteRepository> = {}): RemoteRepository {
  return {
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
    ...overrides,
  }
}

describe('RepositoryPickerDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.owners.mockResolvedValue([
      { login: 'octocat', name: 'octocat', type: 'USER', repositoryCount: 2 },
      { login: 'acme', name: 'acme', type: 'ORGANIZATION', repositoryCount: 1 },
    ])
  })

  it('marks private repositories and hands the chosen one back', async () => {
    mocks.list.mockResolvedValue([repository()])
    const onSelect = vi.fn()
    render(
      <RepositoryPickerDialog
        connectedProviders={['GITHUB']}
        open
        onClose={vi.fn()}
        onSelect={onSelect}
      />,
    )

    fireEvent.click(await screen.findByText('octocat/vibe-thing'))

    expect(screen.getByTitle('Private repository')).toBeInTheDocument()
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ fullName: 'octocat/vibe-thing' }))
  })

  it('asks the server for the filtered listing instead of filtering a stale one', async () => {
    mocks.list.mockResolvedValue([repository()])
    render(
      <RepositoryPickerDialog
        connectedProviders={['GITHUB']}
        open
        onClose={vi.fn()}
        onSelect={vi.fn()}
      />,
    )
    await screen.findByText('octocat/vibe-thing')

    fireEvent.change(screen.getByLabelText('Search repositories'), { target: { value: 'tooling' } })

    await waitFor(() => expect(mocks.list).toHaveBeenCalledWith('GITHUB', 'tooling', ''))
  })

  it('points at the settings when no token is stored', () => {
    render(<RepositoryPickerDialog connectedProviders={[]} open onClose={vi.fn()} onSelect={vi.fn()} />)

    expect(screen.getByText(/No token is stored yet/)).toBeInTheDocument()
    expect(mocks.list).not.toHaveBeenCalled()
  })

  it('collects a multi selection before importing', async () => {
    mocks.list.mockResolvedValue([repository(), repository({ fullName: 'acme/internal', name: 'internal', owner: 'acme' })])
    const onConfirm = vi.fn()
    render(
      <RepositoryPickerDialog
        connectedProviders={['GITHUB']}
        multiple
        open
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    )

    fireEvent.click(await screen.findByText('octocat/vibe-thing'))
    fireEvent.click(screen.getByText('acme/internal'))
    fireEvent.click(screen.getByRole('button', { name: 'Import 2' }))

    expect(onConfirm).toHaveBeenCalledWith('GITHUB', ['octocat/vibe-thing', 'acme/internal'])
  })
})
