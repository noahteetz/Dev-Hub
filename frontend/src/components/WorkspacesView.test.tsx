import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { projectFixture } from '../test/projectFixture'
import type { RemoteWorkspace, WorkspaceTerminal } from '../types'
import { WorkspacesView } from './WorkspacesView'

const mocks = vi.hoisted(() => ({
  config: vi.fn(), mine: vi.fn(), get: vi.fn(), start: vi.fn(), stop: vi.fn(), terminals: vi.fn(),
  openTerminal: vi.fn(), closeTerminal: vi.fn(), profiles: vi.fn(),
}))
vi.mock('../api', () => ({ api: { workspaces: mocks, aiProfiles: { list: mocks.profiles } } }))
vi.mock('./TerminalPane', () => ({
  TerminalPane: ({ terminal, title, actions }: { terminal: WorkspaceTerminal; title?: string; actions?: React.ReactNode }) =>
    <div data-testid={'pane-' + terminal.id}>{title}{actions}</div>,
}))

function workspace(id: string, projectId: number, status: RemoteWorkspace['status']): RemoteWorkspace {
  return { id, projectId, ownerId: 1, repositoryUrl: 'https://github.com/a/b', repositories: [{ repositoryUrl: 'https://github.com/a/b', directory: 'repo' }], branch: 'work/' + id, newBranch: true,
    commitName: 'Test', commitEmail: 'test@example.com', status, desired: status === 'RUNNING' ? 'RUNNING' : 'STOPPED',
    generation: 1, error: '', authorizedUntil: '', createdAt: '', updatedAt: '' }
}
const shell: WorkspaceTerminal = { id: 't1', workspaceId: 'w1', provider: 'SHELL', profileId: null }

function view() {
  return render(<MemoryRouter><WorkspacesView projects={[projectFixture({ id: 1, name: 'Alpha' }), projectFixture({ id: 2, name: 'Beta' })]} /></MemoryRouter>)
}

describe('workspace overview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    const list = [workspace('w1', 1, 'RUNNING'), workspace('w2', 2, 'STOPPED')]
    mocks.config.mockResolvedValue({ enabled: true, allowed: true, maxRunning: 2, maxWorkspaces: 3 })
    mocks.mine.mockResolvedValue(list)
    mocks.get.mockImplementation(async (id: string) => list.find(w => w.id === id))
    mocks.terminals.mockResolvedValue([shell])
    mocks.profiles.mockResolvedValue([])
  })

  it('lists workspaces across projects with the usage limits', async () => {
    view()
    expect(await screen.findByRole('region', { name: 'Alpha' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Beta' })).toBeInTheDocument()
    expect(screen.getByText('Running 1 / 2')).toBeInTheDocument()
    expect(screen.getByText('Kept 2 / 3')).toBeInTheDocument()
    expect(mocks.terminals).toHaveBeenCalledWith('w1')
    expect(mocks.terminals).not.toHaveBeenCalledWith('w2')
  })

  it('pins a terminal into the grid and remembers it', async () => {
    view()
    fireEvent.click(await screen.findByText('shell 1'))
    expect(await screen.findByTestId('pane-t1')).toHaveTextContent('Alpha · shell 1')
    expect(JSON.parse(localStorage.getItem('devhub.workspaces.grid') ?? '[]')).toEqual(['t1'])
    fireEvent.click(screen.getByRole('button', { name: 'Remove from grid' }))
    expect(screen.queryByTestId('pane-t1')).not.toBeInTheDocument()
  })

  it('opens a new terminal straight into the grid', async () => {
    mocks.openTerminal.mockResolvedValue({ ...shell, id: 't2' })
    view()
    await screen.findByText('shell 1')
    mocks.terminals.mockResolvedValue([shell, { ...shell, id: 't2' }])
    const alpha = await screen.findByRole('region', { name: 'Alpha' })
    fireEvent.click(within(alpha).getByRole('button', { name: 'Terminal' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Shell' }))
    await waitFor(() => expect(mocks.openTerminal).toHaveBeenCalledWith('w1', 'SHELL', null))
    await waitFor(() => expect(JSON.parse(localStorage.getItem('devhub.workspaces.grid') ?? '[]')).toEqual(['t2']))
    expect(await screen.findByTestId('pane-t2')).toBeInTheDocument()
  })

  it('drops terminals that ended while the page was closed', async () => {
    localStorage.setItem('devhub.workspaces.grid', JSON.stringify(['gone', 't1']))
    view()
    expect(await screen.findByTestId('pane-t1')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('devhub.workspaces.grid') ?? '[]')).toEqual(['t1'])
  })

  it('resumes a stopped workspace', async () => {
    mocks.start.mockResolvedValue(workspace('w2', 2, 'PROVISIONING'))
    view()
    const beta = await screen.findByRole('region', { name: 'Beta' })
    fireEvent.click(within(beta).getByRole('button', { name: 'Resume' }))
    await waitFor(() => expect(mocks.start).toHaveBeenCalledWith('w2'))
  })
})
