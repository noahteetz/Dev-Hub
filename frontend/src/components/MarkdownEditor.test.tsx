import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { MarkdownEditor } from './MarkdownEditor'

function openEditor(initial = '') {
  function Editor() {
    const [value, setValue] = useState(initial)
    return <MarkdownEditor value={value} onChange={setValue} />
  }
  render(<MemoryRouter><Editor /></MemoryRouter>)
  return screen.getByRole('textbox', { name: 'Markdown' }) as HTMLTextAreaElement
}

describe('MarkdownEditor', () => {
  it('updates the preview while typing and keeps editing available when hiding it', () => {
    const field = openEditor()
    fireEvent.change(field, { target: { value: '## Plan\n\n- [x] Done' } })
    expect(screen.getByRole('heading', { name: 'Plan' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox')).toBeChecked()

    fireEvent.click(screen.getByRole('button', { name: 'Hide preview' }))
    expect(screen.queryByRole('region', { name: 'Markdown preview' })).not.toBeInTheDocument()
    expect(field).toHaveValue('## Plan\n\n- [x] Done')
    expect(screen.getByRole('toolbar')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Show preview' }))
    expect(screen.getByRole('heading', { name: 'Plan' })).toBeInTheDocument()
  })

  it('formats the selected word, retains focus and toggles the formatting off again', () => {
    const field = openEditor('Some useful text')
    field.focus()
    field.setSelectionRange(5, 11)
    fireEvent.click(screen.getByRole('button', { name: 'Bold' }))
    expect(field).toHaveValue('Some **useful** text')
    expect(field).toHaveFocus()
    expect(field.value.slice(field.selectionStart, field.selectionEnd)).toBe('useful')

    fireEvent.click(screen.getByRole('button', { name: 'Bold' }))
    expect(field).toHaveValue('Some useful text')
    expect(field.value.slice(field.selectionStart, field.selectionEnd)).toBe('useful')
  })

  it.each([{ ctrlKey: true }, { metaKey: true }])('supports bold, italic and link shortcuts with %j', (modifier) => {
    const field = openEditor('Word')
    field.setSelectionRange(0, 4)
    fireEvent.keyDown(field, { ...modifier, key: 'b' })
    expect(field).toHaveValue('**Word**')
    fireEvent.keyDown(field, { ...modifier, key: 'b' })
    expect(field).toHaveValue('Word')
    fireEvent.keyDown(field, { ...modifier, key: 'i' })
    expect(field).toHaveValue('_Word_')
    fireEvent.keyDown(field, { ...modifier, key: 'i' })
    fireEvent.keyDown(field, { ...modifier, key: 'k' })
    expect(field).toHaveValue('[Word](https://)')
    expect(field.value.slice(field.selectionStart, field.selectionEnd)).toBe('https://')
  })

  it('formats complete selected lines without changing the following line', () => {
    const field = openEditor('First item\nSecond item\nKeep this')
    field.setSelectionRange(2, 23)
    fireEvent.click(screen.getByRole('button', { name: 'Numbered list' }))
    expect(field).toHaveValue('1. First item\n2. Second item\nKeep this')
    expect(screen.getByRole('list').tagName).toBe('OL')
    fireEvent.click(screen.getByRole('button', { name: 'Numbered list' }))
    expect(field).toHaveValue('First item\nSecond item\nKeep this')
  })

  it('turns the current line into a heading when the caret is inside a word', () => {
    const field = openEditor('Before\nThe heading\nAfter')
    field.setSelectionRange(11, 11)
    fireEvent.click(screen.getByRole('button', { name: 'Heading' }))
    expect(field).toHaveValue('Before\n## The heading\nAfter')
    expect(screen.getByRole('heading', { name: 'The heading' })).toBeInTheDocument()
  })

  it('inserts editable placeholder text at the caret', () => {
    const field = openEditor('Before after')
    field.setSelectionRange(7, 7)
    fireEvent.click(screen.getByRole('button', { name: 'Inline code' }))
    expect(field).toHaveValue('Before `code`after')
    expect(field.value.slice(field.selectionStart, field.selectionEnd)).toBe('code')
  })

  it('can add a block marker at the beginning of an empty first line', () => {
    const field = openEditor('\nKeep this')
    field.setSelectionRange(0, 0)
    fireEvent.click(screen.getByRole('button', { name: 'Quote' }))
    expect(field).toHaveValue('> \nKeep this')
  })
})
