export interface Project {
  id: number
  name: string
  description: string
  system: boolean
  createdAt: string
  updatedAt: string
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

export interface ProjectInput {
  name: string
  description: string
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
