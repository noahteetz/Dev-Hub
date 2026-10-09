import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { projectFixture } from '../test/projectFixture'
import { ProjectDialog } from './ProjectDialog'

const mocks = vi.hoisted(() => ({ credentials: vi.fn() }))
vi.mock('../api', () => ({ api: { gitCredentials: { list: mocks.credentials } } }))
vi.mock('./RepositoryPickerDialog', () => ({
  RepositoryPickerDialog: ({ open, onSelect }: { open: boolean; onSelect: (repo: object) => void }) => open
    ? <button onClick={() => onSelect({ webUrl: 'https://github.com/example/api', name: 'API', description: 'Public API' })}>Pick API</button> : null,
}))
beforeEach(() => { mocks.credentials.mockResolvedValue({ credentials: [{ status: 'VERIFIED', provider: 'GITHUB' }] }) })

it('links additional repositories using URLs and the picker without replacing the main repository', async () => {
  const submit = vi.fn().mockResolvedValue(undefined)
  render(<MemoryRouter><ProjectDialog open project={projectFixture({ repositoryUrl: 'https://github.com/example/private' })}
    saving={false} onClose={vi.fn()} onSubmit={submit} /></MemoryRouter>)
  await waitFor(() => expect(screen.getByRole('button', { name: 'Choose' })).toBeEnabled())
  fireEvent.click(screen.getByRole('button', { name: 'Add repository' }))
  fireEvent.change(screen.getByRole('textbox', { name: /^Additional repository 1/ }), { target: { value: 'https://github.com/example/docs' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add repository' }))
  fireEvent.click(screen.getByRole('button', { name: 'Choose additional repository 2' }))
  fireEvent.click(screen.getByText('Pick API'))
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
  await waitFor(() => expect(submit).toHaveBeenCalledWith(expect.objectContaining({
    name: 'Dev Hub', repositoryUrl: 'https://github.com/example/private',
    additionalRepositoryUrls: ['https://github.com/example/docs', 'https://github.com/example/api'],
  })))
})

it('edits and removes saved repositories', async () => {
  const submit = vi.fn().mockResolvedValue(undefined)
  render(<MemoryRouter><ProjectDialog open project={projectFixture({ repositoryUrl: 'https://github.com/example/private',
    additionalRepositoryUrls: ['https://github.com/example/docs', 'https://github.com/example/api'] })}
    saving={false} onClose={vi.fn()} onSubmit={submit} /></MemoryRouter>)
  await waitFor(() => expect(screen.getByRole('button', { name: 'Choose' })).toBeEnabled())
  fireEvent.click(screen.getByRole('button', { name: 'Remove repository 1' }))
  expect(screen.getByRole('textbox', { name: /^Additional repository 1/ })).toHaveValue('https://github.com/example/api')
  fireEvent.click(screen.getByRole('button', { name: 'Remove repository 1' }))
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
  await waitFor(() => expect(submit).toHaveBeenCalledWith(expect.objectContaining({ additionalRepositoryUrls: [] })))
})
