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

function view(entries: ContentEntry[]) {
  mocks.inbox.mockResolvedValue(entries)
  return render(<MemoryRouter initialEntries={['/inbox']}><KnowledgeView mode="inbox" projects={[projectFixture({ id: 7, name: 'Target project' })]} version={0} onCapture={vi.fn()} onEdit={vi.fn()} onChanged={vi.fn()} onProjectsChanged={vi.fn()} /></MemoryRouter>)
}

describe('KnowledgeView', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.assign.mockResolvedValue(entry()); mocks.promote.mockResolvedValue(projectFixture()) })

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
})
