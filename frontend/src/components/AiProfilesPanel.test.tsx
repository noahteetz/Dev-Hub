import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { AiProfilesPanel } from './AiProfilesPanel'
const mocks = vi.hoisted(() => ({ config: vi.fn(), list: vi.fn(), create: vi.fn(), remove: vi.fn() }))
vi.mock('../api', () => ({ api: { workspaces: { config: mocks.config }, aiProfiles: mocks } }))
beforeEach(() => {
  vi.clearAllMocks(); mocks.config.mockResolvedValue({ enabled: true, allowed: true })
  mocks.list.mockResolvedValue([{ id: 'profile', name: 'Personal', provider: 'CODEX' }])
})
it('does not delete stored login files without confirmation and keeps a blocked profile', async () => {
  mocks.remove.mockRejectedValue(new Error('Stop your workspaces first'))
  render(<AiProfilesPanel />)
  fireEvent.click(await screen.findByRole('button', { name: 'Remove profile' }))
  expect(mocks.remove).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Delete profile and login' }))
  expect(await screen.findByText('Stop your workspaces first')).toBeInTheDocument()
  expect(screen.getByText('CODEX · Personal')).toBeInTheDocument()
})
it('creates a named provider profile without collecting a login token', async () => {
  mocks.create.mockResolvedValue({ id: 'new', name: 'Work', provider: 'CLAUDE' })
  render(<AiProfilesPanel />)
  await screen.findByText('CODEX · Personal')
  fireEvent.change(screen.getByLabelText('Profile name'), { target: { value: 'Work' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add profile' }))
  await waitFor(() => expect(mocks.create).toHaveBeenCalledWith('CLAUDE', 'Work'))
  expect(screen.queryByLabelText(/token/i)).not.toBeInTheDocument()
})
