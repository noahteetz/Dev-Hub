import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { projectFixture } from '../test/projectFixture'
import type { RemoteWorkspace } from '../types'
import { RemoteWorkspacePanel } from './RemoteWorkspacePanel'

const mocks = vi.hoisted(() => ({
  config: vi.fn(), list: vi.fn(), get: vi.fn(), create: vi.fn(), start: vi.fn(), stop: vi.fn(),
  resources: vi.fn(), terminals: vi.fn(), deletionCheck: vi.fn(), remove: vi.fn(), profiles: vi.fn(),
}))
vi.mock('../api', () => ({ api: { workspaces: mocks, aiProfiles: { list: mocks.profiles } } }))
vi.mock('./TerminalPane', () => ({ TerminalPane: () => null }))
const id = '11111111-2222-3333-4444-555555555555'
function workspace(status: RemoteWorkspace['status'] = 'STOPPED'): RemoteWorkspace {
  return { id, projectId: 1, ownerId: 1, repositoryUrl: 'https://github.com/a/b', repositories: [{ repositoryUrl: 'https://github.com/a/b', directory: 'repo' }], branch: 'work/test', newBranch: true,
    commitName: 'Test', commitEmail: 'test@example.com', status, desired: status === 'RUNNING' ? 'RUNNING' : 'STOPPED',
    generation: 1, error: '', authorizedUntil: '', createdAt: '', updatedAt: '' }
}
function view() { return render(<MemoryRouter><RemoteWorkspacePanel project={projectFixture({ repositoryUrl: 'https://github.com/a/b' })} /></MemoryRouter>) }
describe('remote workspaces', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.config.mockResolvedValue({ enabled: true, allowed: true })
    mocks.list.mockResolvedValue([])
    mocks.profiles.mockResolvedValue([])
    mocks.terminals.mockResolvedValue([])
    mocks.resources.mockResolvedValue({ memoryBytes: 0, cpuPercent: 0, diskBytes: 0, reason: '' })
  })
  it('starts a personal workspace with explicit branch and commit identity', async () => {
    mocks.create.mockResolvedValue({ ...workspace('PROVISIONING'), desired: 'RUNNING' })
    view()
    await screen.findByRole('button', { name: 'Start workspace' })
    fireEvent.change(screen.getByLabelText('Workspace branch'), { target: { value: 'work/feature' } })
    fireEvent.change(screen.getByLabelText('Git commit name'), { target: { value: 'Noah' } })
    fireEvent.change(screen.getByLabelText('Git commit email'), { target: { value: 'noah@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Start workspace' }))
    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith(1, { branch: 'work/feature', newBranch: true, commitName: 'Noah', commitEmail: 'noah@example.com' }))
    expect(await screen.findByText('PROVISIONING')).toBeInTheDocument()
  })
  it('shows the saved checkout paths even when project repositories have changed', async () => {
    const saved = { ...workspace(), repositories: [
      { repositoryUrl: 'https://github.com/a/b', directory: 'repo' },
      { repositoryUrl: 'https://gitlab.com/a/docs', directory: 'repo-2-docs' },
    ] }
    mocks.list.mockResolvedValue([saved]); mocks.get.mockResolvedValue(saved)
    view()
    expect(await screen.findByText('/workspace/repo-2-docs')).toBeInTheDocument()
    expect(screen.getByText('/workspace/repo')).toBeInTheDocument()
  })
  it('does not offer execution when the feature or account is unavailable', async () => {
    mocks.config.mockResolvedValue({ enabled: true, allowed: false })
    view()
    expect(await screen.findByText('Your account needs access to remote workspaces.')).toBeInTheDocument()
    expect(mocks.list).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Start workspace' })).not.toBeInTheDocument()
  })
  it('stops compute without requesting checkout deletion', async () => {
    mocks.list.mockResolvedValue([workspace('RUNNING')]); mocks.get.mockResolvedValue(workspace('RUNNING'))
    mocks.stop.mockResolvedValue({ ...workspace('STOPPING'), desired: 'STOPPED' })
    view()
    fireEvent.click(await screen.findByRole('button', { name: 'Stop' }))
    await waitFor(() => expect(mocks.stop).toHaveBeenCalledWith(id))
    expect(await screen.findByText('STOPPING')).toBeInTheDocument()
    expect(mocks.remove).not.toHaveBeenCalled()
  })
  it('unknown Git state requires explicit discard and exact ID confirmation', async () => {
    mocks.list.mockResolvedValue([workspace()]); mocks.get.mockResolvedValue(workspace())
    mocks.deletionCheck.mockResolvedValue({ safe: false, known: false, warnings: ['Origin unavailable'], changedFiles: [], unpushedBranches: [], branch: '' })
    mocks.remove.mockResolvedValue({ ...workspace('DELETING'), desired: 'DELETED' })
    view()
    fireEvent.click(await screen.findByRole('button', { name: 'Delete checkout' }))
    const remove = await screen.findByRole('button', { name: 'Delete files' })
    expect(remove).toBeDisabled()
    fireEvent.click(screen.getByLabelText('I want to discard these files and local Git data'))
    fireEvent.change(screen.getByLabelText('Workspace ID confirmation'), { target: { value: 'yes' } })
    expect(remove).toBeDisabled(); expect(mocks.remove).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('Workspace ID confirmation'), { target: { value: id } })
    fireEvent.click(remove)
    await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith(id, true, id))
  })
})
