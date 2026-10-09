import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { AiProfilesPanel } from './AiProfilesPanel'
const mocks = vi.hoisted(() => ({ config: vi.fn(), list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() }))
vi.mock('../api', () => ({ api: { workspaces: { config: mocks.config }, aiProfiles: mocks } }))
beforeEach(() => {
  vi.clearAllMocks(); mocks.config.mockResolvedValue({ enabled: true, allowed: true })
  mocks.list.mockResolvedValue([{ id: 'profile', name: 'Personal', providers: ['CODEX'] }])
})
it('does not delete stored login files without confirmation and keeps a blocked profile', async () => {
  mocks.remove.mockRejectedValue(new Error('Stop your workspaces first'))
  render(<AiProfilesPanel />)
  fireEvent.click(await screen.findByRole('button', { name: 'Remove profile' }))
  expect(mocks.remove).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Delete profile and login' }))
  expect(await screen.findByText('Stop your workspaces first')).toBeInTheDocument()
  expect(screen.getByText('Personal')).toBeInTheDocument()
})
it('creates one named profile for both providers without collecting a login token', async () => {
  mocks.create.mockResolvedValue({ id: 'new', name: 'Work', providers: ['CLAUDE', 'CODEX'] })
  render(<AiProfilesPanel />)
  await screen.findByText('Personal')
  fireEvent.change(screen.getByLabelText('Profile name'), { target: { value: 'Work' } })
  fireEvent.click(screen.getByRole('checkbox', { name: 'Codex' }))
  fireEvent.click(screen.getByRole('button', { name: 'Add profile' }))
  await waitFor(() => expect(mocks.create).toHaveBeenCalledWith(['CLAUDE', 'CODEX'], 'Work'))
  expect(screen.queryByLabelText(/token/i)).not.toBeInTheDocument()
})
it('requires at least one provider and edits the name and selected providers', async () => {
  mocks.update.mockResolvedValue({})
  render(<AiProfilesPanel />)
  fireEvent.click(await screen.findByRole('button', { name: 'Edit profile Personal' }))
  fireEvent.click(screen.getByRole('checkbox', { name: 'Codex' }))
  expect(screen.getByRole('button', { name: 'Save profile' })).toBeDisabled()
  fireEvent.click(screen.getByRole('checkbox', { name: 'Claude' }))
  fireEvent.change(screen.getByLabelText('Profile name'), { target: { value: 'Work' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save profile' }))
  await waitFor(() => expect(mocks.update).toHaveBeenCalledWith('profile', { name: 'Work', providers: ['CLAUDE'] }))
})
