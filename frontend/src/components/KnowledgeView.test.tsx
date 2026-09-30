import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ContentEntry } from '../types'
import { projectFixture } from '../test/projectFixture'
import { KnowledgeView } from './KnowledgeView'

const mocks = vi.hoisted(() => ({
  inbox: vi.fn(), list: vi.fn(), assign: vi.fn(), promote: vi.fn(), archive: vi.fn(), complete: vi.fn(), remove: vi.fn(),
}))

vi.mock('../api', () => ({ api: { content: mocks } }))

function entry(overrides: Partial<ContentEntry> = {}): ContentEntry {
  return { id: 1, type: 'NOTE', projectId: null, title: 'Inbox note', content: 'Keep this', language: '', sourceUrl: '', archived: false, completed: false, converted: false, projectArchived: false, tags: [], filedAt: null, createdAt: '2026-09-10T10:00:00Z', updatedAt: '2026-09-10T10:00:00Z', ...overrides }
}

function view(entries: ContentEntry[], projects = [projectFixture({ id: 7, name: 'Target project' })]) {
  mocks.inbox.mockResolvedValue(entries)
  return render(<MemoryRouter initialEntries={['/inbox']}><KnowledgeView mode="inbox" projects={projects} version={0} onCapture={vi.fn()} onEdit={vi.fn()} onChanged={vi.fn()} onProjectsChanged={vi.fn()} /></MemoryRouter>)
}

describe('KnowledgeView', () => {
  beforeEach(() => { vi.resetAllMocks(); localStorage.clear(); mocks.assign.mockResolvedValue(entry()); mocks.promote.mockResolvedValue(projectFixture()) })

  it('hides completed content until the state filter is enabled', async () => {
    view([entry(), entry({ id: 2, type: 'TODO', title: 'Done task', completed: true })])
    expect(await screen.findByText('Inbox note')).toBeInTheDocument()
    expect(screen.queryByText('Done task')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Show completed / archived' }))
    expect(await screen.findByText('Done task')).toBeInTheDocument()
  })

  it('assigns an inbox entry to a project', async () => {
    view([entry()])
    const card = (await screen.findByText('Inbox note')).closest('.MuiCard-root') as HTMLElement
    fireEvent.mouseDown(within(card).getByRole('combobox'))
    fireEvent.click(await screen.findByRole('option', { name: 'Target project' }))
    await waitFor(() => expect(mocks.assign).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }), 7))
  })

  it('turns an inbox entry into a project', async () => {
    view([entry()])
    fireEvent.click(await screen.findByRole('button', { name: 'Turn into project' }))
    await waitFor(() => expect(mocks.promote).toHaveBeenCalledWith(expect.objectContaining({ id: 1 })))
  })

  it('lets an owner undo a successful assignment', async () => {
    view([entry()])
    const card = (await screen.findByText('Inbox note')).closest('.MuiCard-root') as HTMLElement
    fireEvent.mouseDown(within(card).getByRole('combobox'))
    fireEvent.click(await screen.findByRole('option', { name: 'Target project' }))

    fireEvent.click(await screen.findByRole('button', { name: 'Undo' }))

    await waitFor(() => expect(mocks.assign).toHaveBeenCalledWith(expect.objectContaining({ id: 1, projectId: 7 }), null))
    await waitFor(() => expect(screen.queryByText(/was assigned to a project/)).not.toBeInTheDocument())
  })

  it('does not offer undo after filing into a project as an editor', async () => {
    view([entry()], [projectFixture({ id: 7, name: 'Target project', role: 'EDITOR', shared: true })])
    const card = (await screen.findByText('Inbox note')).closest('.MuiCard-root') as HTMLElement
    fireEvent.mouseDown(within(card).getByRole('combobox'))
    fireEvent.click(await screen.findByRole('option', { name: 'Target project' }))

    expect(await screen.findByText(/Only the project owner can move it back/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument()
    expect(mocks.assign).toHaveBeenCalledTimes(1)
  })

  it('does not announce success or remember a failed assignment', async () => {
    mocks.assign.mockRejectedValueOnce(new Error('Assignment refused'))
    view([entry()])
    const card = (await screen.findByText('Inbox note')).closest('.MuiCard-root') as HTMLElement
    fireEvent.mouseDown(within(card).getByRole('combobox'))
    fireEvent.click(await screen.findByRole('option', { name: 'Target project' }))

    expect(await screen.findByText('Assignment refused')).toBeInTheDocument()
    expect(screen.queryByText(/was assigned to a project/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument()
    expect(localStorage.getItem('devhub.recentProjects')).toBeNull()
  })

  it('keeps the assignment notice when undo fails and allows a retry', async () => {
    view([entry()])
    const card = (await screen.findByText('Inbox note')).closest('.MuiCard-root') as HTMLElement
    fireEvent.mouseDown(within(card).getByRole('combobox'))
    fireEvent.click(await screen.findByRole('option', { name: 'Target project' }))
    const undo = await screen.findByRole('button', { name: 'Undo' })
    mocks.assign.mockRejectedValueOnce(new Error('Undo refused'))

    fireEvent.click(undo)

    expect(await screen.findByText('Undo refused')).toBeInTheDocument()
    expect(screen.getByText(/was assigned to a project/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    await waitFor(() => expect(mocks.assign).toHaveBeenCalledTimes(3))
    await waitFor(() => expect(screen.queryByText(/was assigned to a project/)).not.toBeInTheDocument())
  })
})
