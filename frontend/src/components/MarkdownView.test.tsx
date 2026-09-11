import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { ContentEntry } from '../types'
import { MarkdownView } from './MarkdownView'

function view(content: string, snippets: ContentEntry[] = []) {
  return render(
    <MemoryRouter>
      <MarkdownView content={content} snippets={snippets} />
    </MemoryRouter>,
  )
}

function snippet(overrides: Partial<ContentEntry> = {}): ContentEntry {
  return {
    id: 12,
    type: 'SNIPPET',
    projectId: null,
    title: 'Deploy',
    content: 'npm run build',
    language: 'bash',
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

describe('MarkdownView', () => {
  it('renders headings, lists, checkboxes, tables and highlighted code blocks', () => {
    const { container } = view(
      [
        '# Release plan',
        '',
        '- [x] Write the migration',
        '- [ ] Ship it',
        '',
        '| Step | Owner |',
        '| --- | --- |',
        '| Deploy | Team |',
        '',
        '```ts',
        'const value: number = 1',
        '```',
        '',
        '> A quote',
      ].join('\n'),
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Release plan' })).toBeInTheDocument()
    expect(screen.getAllByRole('checkbox')).toHaveLength(2)
    expect(screen.getAllByRole('checkbox')[0]).toBeChecked()
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'Deploy' })).toBeInTheDocument()
    expect(container.querySelector('pre code')?.className).toContain('language-ts')
    expect(container.querySelector('pre code .hljs-keyword')).not.toBeNull()
    expect(container.querySelector('blockquote')).not.toBeNull()
  })

  it('never renders embedded HTML or javascript links', () => {
    const { container } = view('<script>window.attacked = true</script>\n\n<img src="x" onerror="window.attacked = true">\n\n[click me](javascript:alert(1))')

    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByText('click me').getAttribute('href')).toBeNull()
    expect((window as unknown as { attacked?: boolean }).attacked).toBeUndefined()
  })

  it('opens external links in a new tab and keeps internal links inside the app', () => {
    view('[docs](https://example.com/docs) and [note](/notes/4)')

    const external = screen.getByText('docs')
    expect(external).toHaveAttribute('target', '_blank')
    expect(external).toHaveAttribute('rel', 'noreferrer')
    const internal = screen.getByText('note')
    expect(internal).not.toHaveAttribute('target')
    expect(internal).toHaveAttribute('href', '/notes/4')
  })

  it('fills live snippet references and shows a hint for deleted snippets', () => {
    const { container } = view('Before\n\n{{snippet:12}}\n\n{{snippet:99}}', [snippet()])

    expect(container.querySelector('pre code')?.textContent).toContain('npm run build')
    expect(screen.getByText(/Referenced snippet 99 is no longer available/)).toBeInTheDocument()
  })
})
