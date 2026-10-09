import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import { TerminalMenu } from './TerminalMenu'
import { terminalLabel } from './terminalLabel'
import type { AiProfile, WorkspaceTerminal } from '../types'
const profiles: AiProfile[] = [{ id: 'work', name: 'Work', providers: ['CLAUDE', 'CODEX'], createdAt: '' },
  { id: 'personal', name: 'Personal', providers: ['CLAUDE'], createdAt: '' }]
it('offers one profile shell and only its enabled CLIs', () => {
  const choose = vi.fn()
  const anchor = document.createElement('button'); document.body.append(anchor)
  render(<MemoryRouter><TerminalMenu profiles={profiles} anchorEl={anchor} onClose={vi.fn()} onManage={vi.fn()} onChoose={choose} /></MemoryRouter>)
  fireEvent.click(screen.getByRole('menuitem', { name: 'Work · Claude' }))
  expect(choose).toHaveBeenLastCalledWith('CLAUDE', 'work')
  fireEvent.click(screen.getByRole('menuitem', { name: 'Work Shell' }))
  expect(choose).toHaveBeenLastCalledWith('SHELL', 'work')
  fireEvent.click(screen.getByRole('menuitem', { name: 'Work · Codex' }))
  expect(choose).toHaveBeenLastCalledWith('CODEX', 'work')
  fireEvent.click(screen.getByRole('menuitem', { name: 'Shell' }))
  expect(choose).toHaveBeenLastCalledWith('SHELL', null)
  expect(screen.queryByRole('menuitem', { name: 'Personal · Codex' })).not.toBeInTheDocument()
  expect(screen.getByRole('menuitem', { name: 'Manage profiles…' })).toHaveAttribute('href', '/settings')
  anchor.remove()
})
it('distinguishes simultaneous sessions and resolves renamed profiles by ID', () => {
  const t: WorkspaceTerminal = { id: '1', workspaceId: 'w', profileId: 'work', launchMode: 'CLAUDE', providers: ['CLAUDE', 'CODEX'] }
  const second = { ...t, id: '2' }
  expect(terminalLabel(t, profiles, [t])).toBe('Work · Claude')
  expect(terminalLabel(second, profiles, [t, second])).toBe('Work · Claude 2')
  expect(terminalLabel(t, [{ ...profiles[0], name: 'Renamed' }], [t])).toBe('Renamed · Claude')
})
