import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { IdeaDialog } from './IdeaDialog'
import { NoteDialog } from './NoteDialog'
import { TodoDialog } from './TodoDialog'

describe('Markdown in project content dialogs', () => {
  it.each(['note', 'idea', 'todo'] as const)('formats, previews and submits a new %s', async (kind) => {
    const submit = vi.fn().mockResolvedValue(undefined)
    const props = { open: true, saving: false, onClose: vi.fn(), onSubmit: submit }
    render(
      <MemoryRouter>
        {kind === 'note' ? <NoteDialog {...props} note={null} /> : kind === 'idea' ? <IdeaDialog {...props} idea={null} tagOptions={[]} /> : <TodoDialog {...props} todo={null} tagOptions={[]} />}
      </MemoryRouter>,
    )
    fireEvent.change(screen.getByRole('textbox', { name: /Title/ }), { target: { value: 'My entry' } })
    const field = screen.getByRole('textbox', { name: kind === 'note' ? /Note/ : 'Details' }) as HTMLTextAreaElement
    fireEvent.change(field, { target: { value: 'First\nSecond' } })
    field.setSelectionRange(0, field.value.length)
    fireEvent.click(screen.getByRole('button', { name: 'List' }))
    expect(field).toHaveValue('- First\n- Second')
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(submit).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: kind === 'note' ? 'Add note' : kind === 'idea' ? 'Add idea' : 'Add todo' }))
    await waitFor(() => expect(submit).toHaveBeenCalledWith(expect.objectContaining({ title: 'My entry', content: '- First\n- Second' })))
  })
})
