import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { QuickCaptureDialog } from './QuickCaptureDialog'

describe('QuickCaptureDialog', () => {
  it('keeps entered text when switching the content type and submits it', async () => {
    const submit = vi.fn()
    render(<QuickCaptureDialog open saving={false} onClose={vi.fn()} onSubmit={submit} />)
    fireEvent.change(screen.getByRole('textbox', { name: /Title/ }), { target: { value: 'Remember this' } })
    fireEvent.change(screen.getByRole('textbox', { name: 'Content' }), { target: { value: 'https://example.com useful context' } })
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Type' }))
    fireEvent.click(await screen.findByRole('option', { name: 'Idea' }))
    expect(screen.getByRole('textbox', { name: /Title/ })).toHaveValue('Remember this')
    expect(screen.getByRole('button', { name: 'Use detected URL' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Capture' }))
    await waitFor(() => expect(submit).toHaveBeenCalledWith(expect.objectContaining({ type: 'IDEA', title: 'Remember this' }), false))
  })
})
