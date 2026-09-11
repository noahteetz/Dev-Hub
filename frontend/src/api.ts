import type {
  CodeSnippet,
  CodeSnippetInput,
  GitCredential,
  GitCredentialInput,
  GitCredentialOverview,
  RemoteRepository,
  RepositoryImportResult,
  RepositoryOwner,
  RepositoryProvider,
  Idea,
  IdeaInput,
  Note,
  NoteInput,
  Project,
  ProjectContextInput,
  ProjectInput,
  ProjectOrganizationInput,
  RepositoryConnection,
  Tag,
  Todo,
  TodoInput,
  CaptureInput,
  ContentEntry,
  ContentListParams,
  ContentType,
  EntityReference,
  EntityType,
  ReferenceGroup,
  SearchParams,
  SearchResult,
} from './types'

interface ApiErrorPayload {
  message?: string
  current?: ContentEntry
}

/** Raised when the server holds a newer version of an entry than the editor started from. */
export class ConflictError extends Error {
  readonly current: ContentEntry

  constructor(message: string, current: ContentEntry) {
    super(message)
    this.name = 'ConflictError'
    this.current = current
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(path, {
    ...options,
    headers,
  })
  const body = await response.text()

  if (!response.ok) {
    let message = `Request failed (${response.status})`
    let payload: ApiErrorPayload | null = null

    if (body) {
      try {
        payload = JSON.parse(body) as ApiErrorPayload
        message = payload.message ?? message
      } catch {
        message = body
      }
    }

    if (response.status === 409 && payload?.current) {
      throw new ConflictError(message, payload.current)
    }

    throw new Error(message)
  }

  return (body ? JSON.parse(body) : undefined) as T
}

function jsonBody(value: unknown): BodyInit {
  return JSON.stringify(value)
}

const contentPaths: Record<ContentType, string> = {
  NOTE: 'notes',
  SNIPPET: 'snippets',
  IDEA: 'ideas',
  TODO: 'todos',
}

function queryString(params: ContentListParams | Record<string, unknown> = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined) return
    if (Array.isArray(value)) value.forEach((item) => query.append(key, String(item)))
    else query.set(key, String(value))
  })
  const value = query.toString()
  return value ? `?${value}` : ''
}

export const api = {
  search: {
    query: ({ q, types, projectId, tags, includeArchived, includeCompleted, limit, offset }: SearchParams) =>
      request<SearchResult[]>(`/api/search${queryString({ q, types, projectId, tags, includeArchived, includeCompleted, limit, offset })}`),
  },
  references: {
    list: (type: EntityType, id: number) =>
      request<ReferenceGroup>(`/api/references${queryString({ type, id })}`),
    create: (sourceType: EntityType, sourceId: number, targetType: EntityType, targetId: number) =>
      request<EntityReference>('/api/references', {
        method: 'POST',
        body: jsonBody({ sourceType, sourceId, targetType, targetId }),
      }),
    remove: (referenceId: number) =>
      request<void>(`/api/references/${referenceId}`, { method: 'DELETE' }),
  },
  content: {
    list: (type: ContentType, params: ContentListParams = {}) =>
      request<ContentEntry[]>(`/api/${contentPaths[type]}${queryString(params)}`),
    get: (type: ContentType, id: number) => request<ContentEntry>(`/api/${contentPaths[type]}/${id}`),
    inbox: (type?: ContentType) =>
      request<ContentEntry[]>(`/api/inbox${type ? `?type=${type}` : ''}`),
    capture: (input: CaptureInput) => request<ContentEntry>('/api/inbox', { method: 'POST', body: jsonBody(input) }),
    update: (entry: ContentEntry, input: CaptureInput) => request<ContentEntry>(`/api/${contentPaths[entry.type]}/${entry.id}`, { method: 'PUT', body: jsonBody(input) }),
    assign: (entry: ContentEntry, projectId: number | null) => request<ContentEntry>(`/api/${contentPaths[entry.type]}/${entry.id}/assignment`, { method: 'PATCH', body: jsonBody({ projectId }) }),
    archive: (entry: ContentEntry, archived: boolean) => request<ContentEntry>(`/api/${contentPaths[entry.type]}/${entry.id}/archive`, { method: 'PATCH', body: jsonBody({ archived }) }),
    complete: (entry: ContentEntry, completed: boolean) => request<ContentEntry>(`/api/todos/${entry.id}/completion`, { method: 'PATCH', body: jsonBody({ completed }) }),
    promote: (entry: ContentEntry) => request<Project>(`/api/inbox/${contentPaths[entry.type]}/${entry.id}/promote`, { method: 'POST' }),
    remove: (entry: ContentEntry) => request<void>(`/api/${contentPaths[entry.type]}/${entry.id}`, { method: 'DELETE' }),
  },
  projects: {
    list: (archived = false) => request<Project[]>(`/api/projects?archived=${archived}`),
    create: (input: ProjectInput) =>
      request<Project>('/api/projects', {
        method: 'POST',
        body: jsonBody(input),
      }),
    update: (projectId: number, input: ProjectInput) =>
      request<Project>(`/api/projects/${projectId}`, {
        method: 'PUT',
        body: jsonBody(input),
      }),
    updateOrganization: (projectId: number, input: ProjectOrganizationInput) =>
      request<Project>(`/api/projects/${projectId}/organization`, {
        method: 'PATCH',
        body: jsonBody(input),
      }),
    updateContext: (projectId: number, input: ProjectContextInput) =>
      request<Project>(`/api/projects/${projectId}/context`, {
        method: 'PUT',
        body: jsonBody(input),
      }),
    archive: (projectId: number, reason = '') =>
      request<Project>(`/api/projects/${projectId}/archive`, {
        method: 'POST',
        body: jsonBody({ reason }),
      }),
    restore: (projectId: number) =>
      request<Project>(`/api/projects/${projectId}/restore`, {
        method: 'POST',
      }),
    remove: (projectId: number) =>
      request<void>(`/api/projects/${projectId}`, {
        method: 'DELETE',
      }),
  },
  repository: {
    get: (projectId: number) =>
      request<RepositoryConnection>(`/api/projects/${projectId}/repository`),
    refresh: (projectId: number) =>
      request<RepositoryConnection>(`/api/projects/${projectId}/repository/refresh`, {
        method: 'POST',
      }),
  },
  gitCredentials: {
    list: () => request<GitCredentialOverview>('/api/git-credentials'),
    save: (provider: RepositoryProvider, input: GitCredentialInput) =>
      request<GitCredential>(`/api/git-credentials/${provider.toLowerCase()}`, {
        method: 'PUT',
        body: jsonBody(input),
      }),
    verify: (provider: RepositoryProvider) =>
      request<GitCredential>(`/api/git-credentials/${provider.toLowerCase()}/verify`, { method: 'POST' }),
    remove: (provider: RepositoryProvider) =>
      request<void>(`/api/git-credentials/${provider.toLowerCase()}`, { method: 'DELETE' }),
  },
  gitRepositories: {
    list: (provider: RepositoryProvider, query = '', owner = '') =>
      request<RemoteRepository[]>(`/api/git-repositories${queryString({ provider, query: query || undefined, owner: owner || undefined })}`),
    owners: (provider: RepositoryProvider) =>
      request<RepositoryOwner[]>(`/api/git-repositories/owners${queryString({ provider })}`),
    refresh: (provider: RepositoryProvider) =>
      request<RemoteRepository[]>(`/api/git-repositories/refresh${queryString({ provider })}`, { method: 'POST' }),
    importSelection: (provider: RepositoryProvider, fullNames: string[]) =>
      request<RepositoryImportResult>('/api/git-repositories/import', {
        method: 'POST',
        body: jsonBody({ provider, fullNames }),
      }),
  },
  notes: {
    list: (projectId: number) =>
      request<Note[]>(`/api/projects/${projectId}/notes`),
    create: (projectId: number, input: NoteInput) =>
      request<Note>(`/api/projects/${projectId}/notes`, {
        method: 'POST',
        body: jsonBody(input),
      }),
    update: (projectId: number, noteId: number, input: NoteInput) =>
      request<Note>(`/api/projects/${projectId}/notes/${noteId}`, {
        method: 'PUT',
        body: jsonBody(input),
      }),
    remove: (projectId: number, noteId: number) =>
      request<void>(`/api/projects/${projectId}/notes/${noteId}`, {
        method: 'DELETE',
      }),
  },
  snippets: {
    list: (projectId: number) =>
      request<CodeSnippet[]>(`/api/projects/${projectId}/code-snippets`),
    create: (projectId: number, input: CodeSnippetInput) =>
      request<CodeSnippet>(`/api/projects/${projectId}/code-snippets`, {
        method: 'POST',
        body: jsonBody(input),
      }),
    update: (projectId: number, snippetId: number, input: CodeSnippetInput) =>
      request<CodeSnippet>(`/api/projects/${projectId}/code-snippets/${snippetId}`, {
        method: 'PUT',
        body: jsonBody(input),
      }),
    remove: (projectId: number, snippetId: number) =>
      request<void>(`/api/projects/${projectId}/code-snippets/${snippetId}`, {
        method: 'DELETE',
      }),
  },
  tags: {
    list: () => request<Tag[]>('/api/tags'),
  },
  ideas: {
    list: (projectId: number) => request<Idea[]>(`/api/projects/${projectId}/ideas`),
    create: (projectId: number, input: IdeaInput) =>
      request<Idea>(`/api/projects/${projectId}/ideas`, {
        method: 'POST',
        body: jsonBody(input),
      }),
    update: (projectId: number, ideaId: number, input: IdeaInput) =>
      request<Idea>(`/api/projects/${projectId}/ideas/${ideaId}`, {
        method: 'PUT',
        body: jsonBody(input),
      }),
    convert: (projectId: number, ideaId: number) =>
      request<Todo>(`/api/projects/${projectId}/ideas/${ideaId}/convert`, {
        method: 'POST',
      }),
    remove: (projectId: number, ideaId: number) =>
      request<void>(`/api/projects/${projectId}/ideas/${ideaId}`, {
        method: 'DELETE',
      }),
  },
  todos: {
    list: (projectId: number) => request<Todo[]>(`/api/projects/${projectId}/todos`),
    create: (projectId: number, input: TodoInput) =>
      request<Todo>(`/api/projects/${projectId}/todos`, {
        method: 'POST',
        body: jsonBody(input),
      }),
    update: (projectId: number, todoId: number, input: TodoInput) =>
      request<Todo>(`/api/projects/${projectId}/todos/${todoId}`, {
        method: 'PUT',
        body: jsonBody(input),
      }),
    setCompleted: (projectId: number, todoId: number, completed: boolean) =>
      request<Todo>(`/api/projects/${projectId}/todos/${todoId}/completion`, {
        method: 'PATCH',
        body: jsonBody({ completed }),
      }),
    remove: (projectId: number, todoId: number) =>
      request<void>(`/api/projects/${projectId}/todos/${todoId}`, {
        method: 'DELETE',
      }),
  },
}
