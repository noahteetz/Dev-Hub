import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SearchResult } from '../types'
import { projectFixture } from '../test/projectFixture'
import { SearchView } from './SearchView'

const mocks = vi.hoisted(() => ({ query: vi.fn() }))

vi.mock('../api', () => ({ api: { search: mocks } }))

function result(overrides: Partial<SearchResult> = {}): SearchResult {
  return {
    type: 'NOTE',
    id: 4,
    title: 'Kafka retries',
    projectId: null,
    projectName: '',
    excerpt: 'We retry kafka messages three times',
    tags: [],
    titleMatch: true,
    archived: false,
    completed: false,
    url: '/notes/4',
    createdAt: '2026-09-10T10:00:00Z',
    updatedAt: '2026-09-10T10:00:00Z',
    ...overrides,
  }
}

function view(path = '/search') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SearchView projects={[projectFixture({ id: 7, name: 'Target project' })]} onCapture={vi.fn()} />
    </MemoryRouter>,
  )
}

describe('SearchView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.query.mockResolvedValue([result(), result({ type: 'TODO', id: 9, title: 'Fix kafka lag', titleMatch: true, url: '/todos/9' })])
  })

  it('keeps short terms away from the server', async () => {
    view('/search?q=k')

    expect(await screen.findByText('Type at least two characters to search.')).toBeInTheDocument()
    expect(mocks.query).not.toHaveBeenCalled()
  })

  it('searches with the filters from the URL and groups the results by type', async () => {
    view('/search?q=kafka&types=NOTE,TODO&archived=true')

    await waitFor(() =>
      expect(mocks.query).toHaveBeenCalledWith(
        expect.objectContaining({ q: 'kafka', types: ['NOTE', 'TODO'], includeArchived: true, includeCompleted: false }),
      ),
    )
    expect(await screen.findAllByText((_text, element) => element?.textContent === 'Kafka retries')).not.toHaveLength(0)
    expect(screen.getAllByText('Kafka')[0].tagName.toLowerCase()).toBe('mark')
    expect(screen.getByText('Note (1)')).toBeInTheDocument()
    expect(screen.getByText('Todo (1)')).toBeInTheDocument()
  })

  it('narrows the search when a type filter is switched off', async () => {
    view('/search?q=kafka&types=NOTE,TODO')

    await waitFor(() => expect(mocks.query).toHaveBeenCalled())
    fireEvent.click(screen.getByRole('button', { name: 'Todo' }))

    await waitFor(() => expect(mocks.query).toHaveBeenLastCalledWith(expect.objectContaining({ types: ['NOTE'] })))
  })

  it('shows an empty state when nothing matches', async () => {
    mocks.query.mockResolvedValue([])
    view('/search?q=kafka')

    expect(await screen.findByText(/Nothing matches/)).toBeInTheDocument()
  })

  it('reports a failing search instead of showing stale results', async () => {
    mocks.query.mockRejectedValue(new Error('Search is unavailable'))
    view('/search?q=kafka')

    expect(await screen.findByText('Search is unavailable')).toBeInTheDocument()
  })
})
