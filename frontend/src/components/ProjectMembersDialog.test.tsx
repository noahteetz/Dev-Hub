import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProjectMember } from '../types'
import { projectFixture } from '../test/projectFixture'
import { ProjectMembersDialog } from './ProjectMembersDialog'

const mocks = vi.hoisted(() => ({
  members: { list: vi.fn(), add: vi.fn(), changeRole: vi.fn(), remove: vi.fn(), leave: vi.fn() },
  users: { lookup: vi.fn() },
}))

vi.mock('../api', () => ({
  api: { members: mocks.members, users: mocks.users },
}))

const owner: ProjectMember = { userId: 1, username: 'alice', displayName: 'Alice', role: 'OWNER', addedAt: null }
const editor: ProjectMember = { userId: 2, username: 'ed', displayName: 'Ed', role: 'EDITOR', addedAt: '2026-09-02T08:00:00Z' }

describe('ProjectMembersDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.members.list.mockResolvedValue([owner, editor])
  })

  it('lets the owner add a member found by exact username', async () => {
    mocks.users.lookup.mockResolvedValue({ id: 3, username: 'vera', displayName: 'Vera' })
    mocks.members.add.mockResolvedValue({ userId: 3, username: 'vera', displayName: 'Vera', role: 'EDITOR', addedAt: null })
    const changed = vi.fn()
    render(<ProjectMembersDialog project={projectFixture({ role: 'OWNER' })} onClose={vi.fn()} onLeft={vi.fn()} onMembersChanged={changed} />)

    await screen.findByText('Ed')
    fireEvent.change(screen.getByLabelText('Username or e-mail'), { target: { value: 'vera' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    await waitFor(() => expect(mocks.members.add).toHaveBeenCalledWith(1, 3, 'EDITOR'))
    expect(mocks.users.lookup).toHaveBeenCalledWith('vera')
    expect(changed).toHaveBeenCalled()
  })

  it('lets the owner remove a member', async () => {
    mocks.members.remove.mockResolvedValue(undefined)
    render(<ProjectMembersDialog project={projectFixture({ role: 'OWNER' })} onClose={vi.fn()} onLeft={vi.fn()} onMembersChanged={vi.fn()} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Remove Ed' }))

    await waitFor(() => expect(mocks.members.remove).toHaveBeenCalledWith(1, 2))
  })

  it('shows a member the list without any management controls and lets them leave', async () => {
    mocks.members.leave.mockResolvedValue(undefined)
    const left = vi.fn()
    render(<ProjectMembersDialog project={projectFixture({ role: 'VIEWER', shared: true })} onClose={vi.fn()} onLeft={left} onMembersChanged={vi.fn()} />)

    await screen.findByText('Ed')
    expect(screen.queryByLabelText('Username or e-mail')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remove Ed' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Leave this project' }))
    fireEvent.click(screen.getByRole('button', { name: 'Leave project' }))

    await waitFor(() => expect(mocks.members.leave).toHaveBeenCalledWith(1))
    expect(left).toHaveBeenCalled()
  })

  it('reports why a user could not be added', async () => {
    mocks.users.lookup.mockRejectedValue(new Error('No user matches that username or e-mail'))
    render(<ProjectMembersDialog project={projectFixture({ role: 'OWNER' })} onClose={vi.fn()} onLeft={vi.fn()} onMembersChanged={vi.fn()} />)

    await screen.findByText('Ed')
    fireEvent.change(screen.getByLabelText('Username or e-mail'), { target: { value: 'nobody' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    expect(await screen.findByText('No user matches that username or e-mail')).toBeInTheDocument()
    expect(mocks.members.add).not.toHaveBeenCalled()
  })
})
