export interface Project {
  id: number
  name: string
  description: string
  system: boolean
  repositoryUrl: string
  deploymentUrl: string
  links: ProjectLink[]
  createdAt: string
  updatedAt: string
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
