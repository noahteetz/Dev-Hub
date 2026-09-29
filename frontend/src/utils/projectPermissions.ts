import type { Project } from '../types'

export type ProjectAction =
  | 'writeContent'
  | 'editContext'
  | 'editMetadata'
  | 'manageRepository'
  | 'manageMembers'
  | 'archive'
  | 'detachContent'

const editorActions: ProjectAction[] = ['writeContent', 'editContext']

/** Mirrors the server rules; the server stays the authority, this only hides what would be refused. */
export function projectCan(project: Pick<Project, 'role'>, action: ProjectAction): boolean {
  if (project.role === 'OWNER') return true
  if (project.role === 'EDITOR') return editorActions.includes(action)
  return false
}

export function roleLabel(role: Project['role']): string {
  return role === 'OWNER' ? 'Owner' : role === 'EDITOR' ? 'Editor' : 'Viewer'
}
