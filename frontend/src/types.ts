export type ProjectStatus = 'PLANNED' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED'

export interface Project {
  id: number
  name: string
  description: string
  system: boolean
  status: ProjectStatus
  priority: number
  favorite: boolean
  statusBeforeArchive: ProjectStatus | null
  repositoryUrl: string
  deploymentUrl: string
  progressSummary: string
  nextStep: string
  blockers: string
  startCommand: string
  buildCommand: string
  technicalDecisions: string
  contextUpdatedAt: string | null
  archivedAt: string | null
  archiveReason: string
  links: ProjectLink[]
  createdAt: string
  updatedAt: string
  effectiveActivityAt: string
  stale: boolean
}

export interface ProjectOrganizationInput {
  status?: ProjectStatus
  priority?: number
  favorite?: boolean
}

export interface ProjectContextInput {
  progressSummary: string
  nextStep: string
  blockers: string
  startCommand: string
  buildCommand: string
  technicalDecisions: string
}

export type RepositoryProvider = 'GITHUB' | 'GITLAB' | 'GENERIC'
export type RepositorySyncStatus =
  | 'NEVER_SYNCED'
  | 'SYNCING'
  | 'READY'
  | 'PRIVATE_OR_NOT_FOUND'
  | 'RATE_LIMITED'
  | 'FAILED'
  | 'UNSUPPORTED'

export interface RepositoryMetadata {
  projectId: number
  provider: RepositoryProvider
  owner: string
  repositoryName: string
  canonicalUrl: string
  defaultBranch: string
  lastCommitSha: string
  lastCommitMessage: string
  lastCommitAuthor: string
  lastCommitAt: string | null
  readmeFileName: string
  readmeContent: string
  languages: Record<string, number>
  syncStatus: RepositorySyncStatus
  lastAttemptAt: string | null
  lastSuccessfulSyncAt: string | null
  errorCode: string
  errorMessage: string
  branchesUrl: string
  issuesUrl: string
  pullRequestsUrl: string
}

export interface RepositoryConnection {
  projectId: number
  inputUrl: string
  provider: RepositoryProvider | null
  owner: string
  repositoryName: string
  canonicalUrl: string
  metadata: RepositoryMetadata | null
}

export interface ProjectLink {
  id: number
  projectId: number
  label: string
  url: string
  order: number
}

export interface Note {
  id: number
  projectId: number
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

export interface CodeSnippet {
  id: number
  projectId: number
  title: string
  language: string
  code: string
  createdAt: string
  updatedAt: string
}

export interface Tag {
  id: number
  name: string
}

export interface Idea {
  id: number
  projectId: number
  title: string
  content: string
  converted: boolean
  convertedTodoId: number | null
  tags: Tag[]
  createdAt: string
  updatedAt: string
}

export interface Todo {
  id: number
  projectId: number
  title: string
  content: string
  completed: boolean
  completedAt: string | null
  tags: Tag[]
  createdAt: string
  updatedAt: string
}

export interface ProjectLinkInput {
  label: string
  url: string
}

export interface ProjectInput {
  name: string
  description: string
  repositoryUrl: string
  deploymentUrl: string
  links: ProjectLinkInput[]
}

export interface NoteInput {
  title: string
  content: string
}

export interface CodeSnippetInput {
  title: string
  language: string
  code: string
}

export interface IdeaInput {
  title: string
  content: string
  tags: string[]
}

export interface TodoInput {
  title: string
  content: string
  tags: string[]
}
