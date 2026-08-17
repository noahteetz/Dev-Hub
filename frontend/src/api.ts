import type {
  CodeSnippet,
  CodeSnippetInput,
  Idea,
  IdeaInput,
  Note,
  NoteInput,
  Project,
  ProjectInput,
  Tag,
  Todo,
  TodoInput,
} from './types'

interface ApiErrorPayload {
  message?: string
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

    if (body) {
      try {
        const payload = JSON.parse(body) as ApiErrorPayload
        message = payload.message ?? message
      } catch {
        message = body
      }
    }

    throw new Error(message)
  }

  return (body ? JSON.parse(body) : undefined) as T
}

function jsonBody(value: unknown): BodyInit {
  return JSON.stringify(value)
}

export const api = {
  projects: {
    list: () => request<Project[]>('/api/projects'),
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
    remove: (projectId: number) =>
      request<void>(`/api/projects/${projectId}`, {
        method: 'DELETE',
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
