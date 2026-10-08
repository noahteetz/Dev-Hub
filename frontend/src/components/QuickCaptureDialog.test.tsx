import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { QuickCaptureDialog } from './QuickCaptureDialog'

describe('QuickCaptureDialog', () => {
  it('keeps entered text when switching the content type and submits it', async () => {
    const submit = vi.fn()
    render(<MemoryRouter><QuickCaptureDialog open saving={false} onClose={vi.fn()} onSubmit={submit} /></MemoryRouter>)
    fireEvent.change(screen.getByRole('textbox', { name: /Title/ }), { target: { value: 'Remember this' } })
    fireEvent.change(screen.getByRole('textbox', { name: 'Content' }), { target: { value: 'https://example.com useful context' } })
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Type' }))
    fireEvent.click(await screen.findByRole('option', { name: 'Idea' }))
    expect(screen.getByRole('textbox', { name: /Title/ })).toHaveValue('Remember this')
    expect(screen.getByRole('button', { name: 'Use detected URL' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Capture' }))
    await waitFor(() => expect(submit).toHaveBeenCalledWith(expect.objectContaining({ type: 'IDEA', title: 'Remember this' }), false))
  })

  it('offers Markdown formatting and a live preview before an entry exists', async () => {
    const submit = vi.fn()
    render(<MemoryRouter><QuickCaptureDialog open saving={false} onClose={vi.fn()} onSubmit={submit} /></MemoryRouter>)
    fireEvent.change(screen.getByRole('textbox', { name: /Title/ }), { target: { value: 'New note' } })
    const field = screen.getByRole('textbox', { name: 'Content' }) as HTMLTextAreaElement
    fireEvent.change(field, { target: { value: 'A useful detail' } })
    field.setSelectionRange(2, 8)
    fireEvent.click(screen.getByRole('button', { name: 'Bold' }))

    expect(field).toHaveValue('A **useful** detail')
    expect(screen.getByRole('region', { name: 'Content preview' }).querySelector('strong')).toHaveTextContent('useful')
    expect(submit).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Capture' }))
    await waitFor(() => expect(submit).toHaveBeenCalledWith(expect.objectContaining({ content: 'A **useful** detail' }), false))
  })

  it('preserves content when switching between Markdown and raw snippet code', async () => {
    render(<MemoryRouter><QuickCaptureDialog open saving={false} onClose={vi.fn()} onSubmit={vi.fn()} /></MemoryRouter>)
    fireEvent.change(screen.getByRole('textbox', { name: 'Content' }), { target: { value: '**unchanged**' } })
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Type' }))
    fireEvent.click(await screen.findByRole('option', { name: 'Snippet' }))
    expect(screen.getByRole('textbox', { name: 'Code' })).toHaveValue('**unchanged**')
    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument()

    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Type' }))
    fireEvent.click(await screen.findByRole('option', { name: 'Todo' }))
    expect(screen.getByRole('textbox', { name: 'Content' })).toHaveValue('**unchanged**')
    expect(screen.getByRole('toolbar', { name: 'Markdown formatting' })).toBeInTheDocument()
  })
})
