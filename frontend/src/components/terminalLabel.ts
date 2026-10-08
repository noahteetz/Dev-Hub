import type { AiProfile, WorkspaceTerminal } from '../types'

export function terminalLabel(terminal: WorkspaceTerminal, profiles: AiProfile[], sessions: WorkspaceTerminal[]) {
  const profile = profiles.find(p => p.id === terminal.profileId)
  const mode = terminal.launchMode === 'CLAUDE' ? 'Claude' : terminal.launchMode === 'CODEX' ? 'Codex' : 'Shell'
  const label = profile ? profile.name + (terminal.launchMode === 'SHELL' ? '' : ' · ' + mode) : mode
  const same = sessions.filter(t => t.profileId === terminal.profileId && t.launchMode === terminal.launchMode)
  return same.length > 1 ? label + ' ' + (same.findIndex(t => t.id === terminal.id) + 1) : label
}
