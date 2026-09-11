import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ContentEntry } from '../types'
import { EntryEditor } from './EntryEditor'

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  update: vi.fn(),
  list: vi.fn(),
  capture: vi.fn(),
  referenceList: vi.fn(),
  referenceCreate: vi.fn(),
  referenceRemove: vi.fn(),
}))

vi.mock('../api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api')>()
  return {
    ConflictError: actual.ConflictError,
    api: {
      content: { get: mocks.get, update: mocks.update, list: mocks.list, capture: mocks.capture },
      references: { list: mocks.referenceList, create: mocks.referenceCreate, remove: mocks.referenceRemove },
    },
  }
})

const { ConflictError } = await vi.importActual<typeof import('../api')>('../api')

function entry(overrides: Partial<ContentEntry> = {}): ContentEntry {
  return {
    id: 5,
    type: 'NOTE',
    projectId: null,
    title: 'Release plan',
    content: 'First version',
    language: '',
    sourceUrl: '',
    archived: false,
    completed: false,
    converted: false,
    projectArchived: false,
    tags: [],
    filedAt: null,
    createdAt: '2026-09-10T10:00:00Z',
    updatedAt: '2026-09-10T10:00:00Z',
    ...overrides,
  }
}

async function openEditor() {
  const view = render(
    <MemoryRouter initialEntries={['/notes/5']}>
      <EntryEditor entryId={5} projects={[]} type="NOTE" onChanged={vi.fn()} />
    </MemoryRouter>,
  )
  await screen.findByDisplayValue('First version')
  return view
}

function markdownField() {
  return screen.getByLabelText('Markdown')
}

function type(value: string) {
  fireEvent.change(markdownField(), { target: { value } })
}

describe('EntryEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    mocks.get.mockResolvedValue(entry())
    mocks.list.mockResolvedValue([])
    mocks.referenceList.mockResolvedValue({ outgoing: [], incoming: [] })
    mocks.referenceCreate.mockResolvedValue({})
    mocks.update.mockImplementation((_target: ContentEntry, input: { title: string; content: string }) =>
      Promise.resolve(entry({ ...input, updatedAt: '2026-09-10T11:00:00Z' })),
    )
  })

  it('saves exactly once per typing pause', async () => {
    await openEditor()

    type('Second')
    type('Second version')
    type('Second version ready')
    expect(mocks.update).not.toHaveBeenCalled()

    await waitFor(() => expect(mocks.update).toHaveBeenCalled(), { timeout: 3000 })

    expect(mocks.update).toHaveBeenCalledTimes(1)
    expect(mocks.update.mock.calls[0][1]).toMatchObject({
      content: 'Second version ready',
      expectedUpdatedAt: '2026-09-10T10:00:00Z',
    })
    expect(await screen.findByText(/Saved at/)).toBeInTheDocument()
  })

  it('keeps the text and shows the error state when a save fails', async () => {
    mocks.update.mockRejectedValue(new Error('Network down'))
    await openEditor()

    type('Text that must survive')
    await waitFor(() => expect(mocks.update).toHaveBeenCalled(), { timeout: 3000 })

    expect(await screen.findByText('Network down')).toBeInTheDocument()
    expect(markdownField()).toHaveValue('Text that must survive')
    expect(localStorage.getItem('devhub.draft.NOTE.5')).toContain('Text that must survive')
  })

  it('never discards the local text when the server version is newer', async () => {
    mocks.update.mockRejectedValueOnce(
      new ConflictError('This entry changed on the server since you opened it', entry({ content: 'Saved elsewhere', updatedAt: '2026-09-10T12:00:00Z' })),
    )
    await openEditor()

    type('My local text')
    await waitFor(() => expect(mocks.update).toHaveBeenCalled(), { timeout: 3000 })

    expect(await screen.findByText('This entry changed on the server')).toBeInTheDocument()
    expect(screen.getByText('Saved elsewhere')).toBeInTheDocument()
    expect(markdownField()).toHaveValue('My local text')

    fireEvent.click(screen.getByRole('button', { name: 'Keep my version' }))
    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(2))

    expect(mocks.update).toHaveBeenCalledTimes(2)
    expect(mocks.update.mock.calls[1][1]).toMatchObject({ content: 'My local text', expectedUpdatedAt: undefined })
  })

  it('offers a local draft after a crash and restores it on request', async () => {
    localStorage.setItem(
      'devhub.draft.NOTE.5',
      JSON.stringify({ title: 'Release plan', content: 'Rescued draft', savedAt: '2026-09-10T10:30:00Z' }),
    )
    await openEditor()

    fireEvent.click(await screen.findByRole('button', { name: 'Restore draft' }))

    expect(markdownField()).toHaveValue('Rescued draft')
  })

  it('inserts a snippet as a code block and links it to the entry', async () => {
    mocks.list.mockResolvedValue([entry({ id: 12, type: 'SNIPPET', title: 'Deploy', content: 'npm run build', language: 'bash' })])
    await openEditor()

    fireEvent.click(screen.getByRole('button', { name: 'Insert snippet' }))
    fireEvent.click(await screen.findByText('Deploy'))
    fireEvent.click(screen.getByRole('button', { name: 'Insert as code block' }))

    await waitFor(() => expect((markdownField() as HTMLTextAreaElement).value).toContain('```bash\nnpm run build\n```'))
    expect(mocks.referenceCreate).toHaveBeenCalledWith('NOTE', 5, 'SNIPPET', 12)
  })

  it('inserts a live snippet reference that the preview fills in', async () => {
    mocks.list.mockResolvedValue([entry({ id: 12, type: 'SNIPPET', title: 'Deploy', content: 'npm run build', language: 'bash' })])
    await openEditor()

    fireEvent.click(screen.getByRole('button', { name: 'Insert snippet' }))
    fireEvent.click(await screen.findByText('Deploy'))
    fireEvent.click(screen.getByRole('button', { name: 'Insert as live reference' }))

    await waitFor(() => expect((markdownField() as HTMLTextAreaElement).value).toContain('{{snippet:12}}'))
    expect(screen.getByText('npm run build')).toBeInTheDocument()
  })
})
