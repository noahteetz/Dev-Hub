export type ProjectStatus = 'PLANNED' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED'

export interface Project {
  id: number
  name: string
  description: string
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
  | 'CREDENTIAL_INVALID'
  | 'CREDENTIAL_INSUFFICIENT'
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
  /** Sent back to the provider so an unchanged repository costs no quota. */
  etag: string
  rateLimit: RepositoryRateLimit
}

/** The provider quota reported on the last sync. Every field is null when unknown. */
export interface RepositoryRateLimit {
  limit: number | null
  remaining: number | null
  resetAt: string | null
}

export type GitCredentialStatus = 'VERIFIED' | 'INVALID' | 'UNREADABLE' | 'UNVERIFIED'

/** What the API shows about a stored token. The value itself is never part of it. */
export interface GitCredential {
  provider: RepositoryProvider
  label: string
  host: string
  tokenHint: string
  accountLogin: string
  scopes: string[]
  status: GitCredentialStatus
  lastError: string
  createdAt: string
  lastVerifiedAt: string | null
}

export interface GitCredentialOverview {
  /** False when no encryption key is set, in which case no token can be stored. */
  encryptionConfigured: boolean
  credentials: GitCredential[]
}

export interface GitCredentialInput {
  label: string
  token: string
}

export interface RemoteRepository {
  provider: RepositoryProvider
  owner: string
  name: string
  fullName: string
  description: string
  privateRepository: boolean
  archived: boolean
  defaultBranch: string
  lastActivityAt: string | null
  primaryLanguage: string
  webUrl: string
}

export type RepositoryOwnerType = 'USER' | 'ORGANIZATION'

export interface RepositoryOwner {
  login: string
  name: string
  type: RepositoryOwnerType
  repositoryCount: number
}

export interface RepositoryImportResult {
  created: Project[]
  /** Already connected, or no longer visible to the token. */
  skipped: string[]
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

export type ContentType = 'NOTE' | 'SNIPPET' | 'IDEA' | 'TODO'

export interface ContentEntry {
  id: number
  type: ContentType
  projectId: number | null
  title: string
  content: string
  language: string
  sourceUrl: string
  archived: boolean
  completed: boolean
  converted: boolean
  projectArchived: boolean
  tags: Tag[]
  filedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CaptureInput {
  type: ContentType
  title: string
  content: string
  tags: string[]
  sourceUrl: string
  language: string
  /** Timestamp the editor loaded; the server answers 409 when its own state is newer. */
  expectedUpdatedAt?: string
}

export interface ContentListParams {
  scope?: 'all' | 'inbox' | 'project'
  projectId?: number
  tags?: string[]
  archived?: boolean
  completed?: boolean
  converted?: boolean
  sort?: 'created' | 'updated' | 'title'
  limit?: number
  offset?: number
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

export type EntityType = 'PROJECT' | 'NOTE' | 'SNIPPET' | 'IDEA' | 'TODO'

export interface SearchResult {
  type: EntityType
  id: number
  title: string
  projectId: number | null
  projectName: string
  excerpt: string
  tags: Tag[]
  titleMatch: boolean
  archived: boolean
  completed: boolean
  url: string
  createdAt: string
  updatedAt: string
}

export interface SearchParams {
  q: string
  types?: EntityType[]
  projectId?: number
  tags?: string[]
  includeArchived?: boolean
  includeCompleted?: boolean
  limit?: number
  offset?: number
}

export interface EntityReference {
  id: number
  sourceType: EntityType
  sourceId: number
  sourceTitle: string
  targetType: EntityType
  targetId: number
  targetTitle: string
  targetUrl: string
  sourceUrl: string
  createdAt: string
}

export interface ReferenceGroup {
  outgoing: EntityReference[]
  incoming: EntityReference[]
}
