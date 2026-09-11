import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { EntityReference } from '../types'
import { EntryReferences } from './EntryReferences'

const mocks = vi.hoisted(() => ({ list: vi.fn(), create: vi.fn(), remove: vi.fn(), query: vi.fn() }))

vi.mock('../api', () => ({
  api: {
    references: { list: mocks.list, create: mocks.create, remove: mocks.remove },
    search: { query: mocks.query },
  },
}))

function reference(overrides: Partial<EntityReference> = {}): EntityReference {
  return {
    id: 1,
    sourceType: 'NOTE',
    sourceId: 5,
    sourceTitle: 'Release plan',
    targetType: 'SNIPPET',
    targetId: 12,
    targetTitle: 'Deploy command',
    targetUrl: '/snippets/12',
    sourceUrl: '/notes/5',
    createdAt: '2026-09-10T10:00:00Z',
    ...overrides,
  }
}

function view() {
  return render(
    <MemoryRouter>
      <EntryReferences id={5} type="NOTE" />
    </MemoryRouter>,
  )
}

describe('EntryReferences', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.query.mockResolvedValue([])
  })

  it('shows outgoing links and backlinks in both directions', async () => {
    mocks.list.mockResolvedValue({
      outgoing: [reference()],
      incoming: [reference({ id: 2, sourceType: 'IDEA', sourceTitle: 'Automate the deploy', sourceUrl: '/ideas/8' })],
    })

    view()

    expect(await screen.findByRole('button', { name: 'Deploy command' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Automate the deploy' })).toBeInTheDocument()
  })

  it('removes a single link without touching the entry', async () => {
    mocks.list.mockResolvedValueOnce({ outgoing: [reference()], incoming: [] })
    mocks.list.mockResolvedValue({ outgoing: [], incoming: [] })
    mocks.remove.mockResolvedValue(undefined)

    view()
    fireEvent.click(await screen.findByRole('button', { name: 'Remove link to Deploy command' }))

    await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith(1))
    expect(await screen.findByText('No links yet.')).toBeInTheDocument()
  })

  it('reports a failing link instead of dropping it silently', async () => {
    mocks.list.mockResolvedValue({ outgoing: [], incoming: [] })
    view()

    expect(await screen.findByText('No links yet.')).toBeInTheDocument()
    expect(screen.getByText('Nothing points here yet.')).toBeInTheDocument()
  })
})
