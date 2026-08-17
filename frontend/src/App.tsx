import { useCallback, useEffect, useState } from 'react'
import { Alert, Box, Snackbar } from '@mui/material'
import './App.css'
import { api } from './api'
import { ConfirmDialog } from './components/ConfirmDialog'
import { IdeaDialog } from './components/IdeaDialog'
import { NoteDialog } from './components/NoteDialog'
import { ProjectDialog } from './components/ProjectDialog'
import { ProjectSidebar, type ApiState } from './components/ProjectSidebar'
import { ProjectWorkspace, type WorkspaceTab } from './components/ProjectWorkspace'
import { SnippetDialog } from './components/SnippetDialog'
import { TodoDialog } from './components/TodoDialog'
import type {
  CodeSnippet,
  CodeSnippetInput,
  Idea,
  IdeaInput,
  Note,
  NoteInput,
  Project,
  ProjectInput,
  Todo,
  TodoInput,
} from './types'

type ProjectDialogState = {
  project: Project | null
} | null

type NoteDialogState = {
  note: Note | null
} | null

type SnippetDialogState = {
  snippet: CodeSnippet | null
} | null

type IdeaDialogState = {
  idea: Idea | null
} | null

type TodoDialogState = {
  todo: Todo | null
} | null

type PendingDelete =
  | { type: 'project'; project: Project }
  | { type: 'note'; projectId: number; note: Note }
  | { type: 'snippet'; projectId: number; snippet: CodeSnippet }
  | { type: 'idea'; projectId: number; idea: Idea }
  | { type: 'todo'; projectId: number; todo: Todo }
  | null

type Notice = {
  message: string
  severity: 'error' | 'success'
} | null

type SavingAction = 'project' | 'note' | 'snippet' | 'idea' | 'todo' | 'conversion' | 'delete' | null

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

function replaceItem<T extends { id: number }>(items: T[], updated: T) {
  return items.map((item) => (item.id === updated.id ? updated : item))
}

function App() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [snippets, setSnippets] = useState<CodeSnippet[]>([])
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [todos, setTodos] = useState<Todo[]>([])
  const [tagOptions, setTagOptions] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('notes')
  const [apiState, setApiState] = useState<ApiState>('loading')
  const [contentLoading, setContentLoading] = useState(false)
  const [savingAction, setSavingAction] = useState<SavingAction>(null)
  const [projectDialog, setProjectDialog] = useState<ProjectDialogState>(null)
  const [noteDialog, setNoteDialog] = useState<NoteDialogState>(null)
  const [snippetDialog, setSnippetDialog] = useState<SnippetDialogState>(null)
  const [ideaDialog, setIdeaDialog] = useState<IdeaDialogState>(null)
  const [todoDialog, setTodoDialog] = useState<TodoDialogState>(null)
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null)
  const [notice, setNotice] = useState<Notice>(null)

  const applyProjects = useCallback((loadedProjects: Project[]) => {
    setProjects(loadedProjects)
    setSelectedProjectId((currentId) => {
      if (currentId && loadedProjects.some((project) => project.id === currentId)) {
        return currentId
      }
      return loadedProjects[0]?.id ?? null
    })
  }, [])

  const loadProjects = useCallback(async () => {
    setApiState('loading')

    try {
      const loadedProjects = await api.projects.list()
      applyProjects(loadedProjects)
      setApiState('ready')
    } catch (error) {
      setApiState('error')
      setNotice({ message: errorMessage(error), severity: 'error' })
    }
  }, [applyProjects])

  useEffect(() => {
    let active = true

    api.projects
      .list()
      .then((loadedProjects) => {
        if (!active) {
          return
        }
        applyProjects(loadedProjects)
        setContentLoading(loadedProjects.length > 0)
        setApiState('ready')
      })
      .catch((error: unknown) => {
        if (active) {
          setApiState('error')
          setNotice({ message: errorMessage(error), severity: 'error' })
        }
      })

    return () => {
      active = false
    }
  }, [applyProjects])

  useEffect(() => {
    let active = true

    api.tags.list()
      .then((tags) => {
        if (active) {
          setTagOptions(tags.map((tag) => tag.name))
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setNotice({ message: errorMessage(error), severity: 'error' })
        }
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!selectedProjectId) {
      return
    }

    let active = true

    Promise.all([
      api.notes.list(selectedProjectId),
      api.snippets.list(selectedProjectId),
      api.ideas.list(selectedProjectId),
      api.todos.list(selectedProjectId),
    ])
      .then(([loadedNotes, loadedSnippets, loadedIdeas, loadedTodos]) => {
        if (!active) {
          return
        }
        setNotes(loadedNotes)
        setSnippets(loadedSnippets)
        setIdeas(loadedIdeas)
        setTodos(loadedTodos)
      })
      .catch((error: unknown) => {
        if (active) {
          setNotice({ message: errorMessage(error), severity: 'error' })
        }
      })
      .finally(() => {
        if (active) {
          setContentLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [selectedProjectId])

  const selectedProject =
    projects.find((project) => project.id === selectedProjectId) ?? null

  async function saveProject(input: ProjectInput) {
    setSavingAction('project')

    try {
      if (projectDialog?.project) {
        const updated = await api.projects.update(projectDialog.project.id, input)
        setProjects((current) => replaceItem(current, updated))
        setNotice({ message: 'Project updated.', severity: 'success' })
      } else {
        const created = await api.projects.create(input)
        setProjects((current) => [created, ...current])
        setContentLoading(true)
        setSelectedProjectId(created.id)
        setActiveTab('notes')
        setNotice({ message: 'Project created.', severity: 'success' })
      }
      setProjectDialog(null)
    } catch (error) {
      setNotice({ message: errorMessage(error), severity: 'error' })
    } finally {
      setSavingAction(null)
    }
  }

  async function saveNote(input: NoteInput) {
    if (!selectedProjectId) {
      return
    }

    setSavingAction('note')

    try {
      if (noteDialog?.note) {
        const updated = await api.notes.update(selectedProjectId, noteDialog.note.id, input)
        setNotes((current) => replaceItem(current, updated))
        setNotice({ message: 'Note updated.', severity: 'success' })
      } else {
        const created = await api.notes.create(selectedProjectId, input)
        setNotes((current) => [created, ...current])
        setNotice({ message: 'Note added.', severity: 'success' })
      }
      setNoteDialog(null)
    } catch (error) {
      setNotice({ message: errorMessage(error), severity: 'error' })
    } finally {
      setSavingAction(null)
    }
  }

  async function saveSnippet(input: CodeSnippetInput) {
    if (!selectedProjectId) {
      return
    }

    setSavingAction('snippet')

    try {
      if (snippetDialog?.snippet) {
        const updated = await api.snippets.update(
          selectedProjectId,
          snippetDialog.snippet.id,
          input,
        )
        setSnippets((current) => replaceItem(current, updated))
        setNotice({ message: 'Snippet updated.', severity: 'success' })
      } else {
        const created = await api.snippets.create(selectedProjectId, input)
        setSnippets((current) => [created, ...current])
        setNotice({ message: 'Snippet added.', severity: 'success' })
      }
      setSnippetDialog(null)
    } catch (error) {
      setNotice({ message: errorMessage(error), severity: 'error' })
    } finally {
      setSavingAction(null)
    }
  }

  function mergeTagOptions(itemTags: { name: string }[]) {
    setTagOptions((current) => Array.from(new Set([...current, ...itemTags.map((tag) => tag.name)])).sort())
  }

  async function saveIdea(input: IdeaInput) {
    if (!selectedProjectId) {
      return
    }

    setSavingAction('idea')

    try {
      if (ideaDialog?.idea) {
        const updated = await api.ideas.update(selectedProjectId, ideaDialog.idea.id, input)
        setIdeas((current) => replaceItem(current, updated))
        mergeTagOptions(updated.tags)
        setNotice({ message: 'Idea updated.', severity: 'success' })
      } else {
        const created = await api.ideas.create(selectedProjectId, input)
        setIdeas((current) => [created, ...current])
        mergeTagOptions(created.tags)
        setNotice({ message: 'Idea added.', severity: 'success' })
      }
      setIdeaDialog(null)
    } catch (error) {
      setNotice({ message: errorMessage(error), severity: 'error' })
    } finally {
      setSavingAction(null)
    }
  }

  async function saveTodo(input: TodoInput) {
    if (!selectedProjectId) {
      return
    }

    setSavingAction('todo')

    try {
      if (todoDialog?.todo) {
        const updated = await api.todos.update(selectedProjectId, todoDialog.todo.id, input)
        setTodos((current) => replaceItem(current, updated))
        mergeTagOptions(updated.tags)
        setNotice({ message: 'Todo updated.', severity: 'success' })
      } else {
        const created = await api.todos.create(selectedProjectId, input)
        setTodos((current) => [created, ...current])
        mergeTagOptions(created.tags)
        setNotice({ message: 'Todo added.', severity: 'success' })
      }
      setTodoDialog(null)
    } catch (error) {
      setNotice({ message: errorMessage(error), severity: 'error' })
    } finally {
      setSavingAction(null)
    }
  }

  async function convertIdea(idea: Idea) {
    if (!selectedProjectId) {
      return
    }

    setSavingAction('conversion')

    try {
      const todo = await api.ideas.convert(selectedProjectId, idea.id)
      setTodos((current) => [todo, ...current])
      setIdeas((current) => replaceItem(current, {
        ...idea,
        converted: true,
        convertedTodoId: todo.id,
      }))
      mergeTagOptions(todo.tags)
      setActiveTab('todos')
      setNotice({ message: 'Idea converted to a todo.', severity: 'success' })
    } catch (error) {
      setNotice({ message: errorMessage(error), severity: 'error' })
    } finally {
      setSavingAction(null)
    }
  }

  async function toggleTodo(todo: Todo) {
    if (!selectedProjectId) {
      return
    }

    setSavingAction('todo')

    try {
      const updated = await api.todos.setCompleted(selectedProjectId, todo.id, !todo.completed)
      setTodos((current) => replaceItem(current, updated))
      setNotice({ message: updated.completed ? 'Todo completed.' : 'Todo reopened.', severity: 'success' })
    } catch (error) {
      setNotice({ message: errorMessage(error), severity: 'error' })
    } finally {
      setSavingAction(null)
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) {
      return
    }

    setSavingAction('delete')

    try {
      if (pendingDelete.type === 'project') {
        const deletedProjectId = pendingDelete.project.id
        await api.projects.remove(deletedProjectId)
        const remainingProjects = projects.filter((project) => project.id !== deletedProjectId)
        setProjects(remainingProjects)
        if (selectedProjectId === deletedProjectId) {
          setNotes([])
          setSnippets([])
          setIdeas([])
          setTodos([])
          setContentLoading(remainingProjects.length > 0)
        }
        setSelectedProjectId((currentId) =>
          currentId === deletedProjectId ? remainingProjects[0]?.id ?? null : currentId,
        )
        setNotice({ message: 'Project deleted.', severity: 'success' })
      } else if (pendingDelete.type === 'note') {
        await api.notes.remove(pendingDelete.projectId, pendingDelete.note.id)
        setNotes((current) => current.filter((note) => note.id !== pendingDelete.note.id))
        setNotice({ message: 'Note deleted.', severity: 'success' })
      } else if (pendingDelete.type === 'snippet') {
        await api.snippets.remove(pendingDelete.projectId, pendingDelete.snippet.id)
        setSnippets((current) =>
          current.filter((snippet) => snippet.id !== pendingDelete.snippet.id),
        )
        setNotice({ message: 'Snippet deleted.', severity: 'success' })
      } else if (pendingDelete.type === 'idea') {
        await api.ideas.remove(pendingDelete.projectId, pendingDelete.idea.id)
        setIdeas((current) => current.filter((idea) => idea.id !== pendingDelete.idea.id))
        setNotice({ message: 'Idea deleted.', severity: 'success' })
      } else {
        await api.todos.remove(pendingDelete.projectId, pendingDelete.todo.id)
        setTodos((current) => current.filter((todo) => todo.id !== pendingDelete.todo.id))
        setNotice({ message: 'Todo deleted.', severity: 'success' })
      }
      setPendingDelete(null)
    } catch (error) {
      setNotice({ message: errorMessage(error), severity: 'error' })
    } finally {
      setSavingAction(null)
    }
  }

  const confirmTitle =
    pendingDelete?.type === 'project'
      ? 'Delete project?'
      : pendingDelete?.type === 'note'
        ? 'Delete note?'
        : pendingDelete?.type === 'snippet'
          ? 'Delete code snippet?'
          : pendingDelete?.type === 'idea'
            ? 'Delete idea?'
            : 'Delete todo?'
  const confirmMessage =
    pendingDelete?.type === 'project'
      ? 'This will also remove every note and code snippet inside the project.'
      : 'This information will be permanently removed.'
  const confirmLabel =
    pendingDelete?.type === 'project'
      ? 'Delete project'
      : pendingDelete?.type === 'note'
        ? 'Delete note'
        : pendingDelete?.type === 'snippet'
          ? 'Delete snippet'
          : pendingDelete?.type === 'idea'
            ? 'Delete idea'
            : 'Delete todo'

  return (
    <Box className="app-shell">
      <ProjectSidebar
        apiState={apiState}
        onCreateProject={() => setProjectDialog({ project: null })}
        onDeleteProject={(project) => setPendingDelete({ type: 'project', project })}
        onEditProject={(project) => setProjectDialog({ project })}
        onRetry={() => void loadProjects()}
        onSelectProject={(projectId) => {
          if (projectId !== selectedProjectId) {
            setContentLoading(true)
          }
          setSelectedProjectId(projectId)
          setActiveTab('notes')
        }}
        projects={projects}
        selectedProjectId={selectedProjectId}
      />
      <ProjectWorkspace
        activeTab={activeTab}
        ideas={ideas}
        loading={contentLoading}
        notes={notes}
        onCreateNote={() => setNoteDialog({ note: null })}
        onCreateProject={() => setProjectDialog({ project: null })}
        onCreateSnippet={() => setSnippetDialog({ snippet: null })}
        onCreateIdea={() => setIdeaDialog({ idea: null })}
        onCreateTodo={() => setTodoDialog({ todo: null })}
        onDeleteNote={(note) =>
          selectedProjectId
            ? setPendingDelete({ type: 'note', note, projectId: selectedProjectId })
            : undefined
        }
        onDeleteProject={() =>
          selectedProject ? setPendingDelete({ type: 'project', project: selectedProject }) : undefined
        }
        onDeleteSnippet={(snippet) =>
          selectedProjectId
            ? setPendingDelete({ type: 'snippet', snippet, projectId: selectedProjectId })
            : undefined
        }
        onDeleteIdea={(idea) =>
          selectedProjectId
            ? setPendingDelete({ type: 'idea', idea, projectId: selectedProjectId })
            : undefined
        }
        onDeleteTodo={(todo) =>
          selectedProjectId
            ? setPendingDelete({ type: 'todo', todo, projectId: selectedProjectId })
            : undefined
        }
        onEditNote={(note) => setNoteDialog({ note })}
        onEditProject={() =>
          selectedProject ? setProjectDialog({ project: selectedProject }) : undefined
        }
        onEditSnippet={(snippet) => setSnippetDialog({ snippet })}
        onEditIdea={(idea) => setIdeaDialog({ idea })}
        onEditTodo={(todo) => setTodoDialog({ todo })}
        onConvertIdea={(idea) => void convertIdea(idea)}
        onToggleTodo={(todo) => void toggleTodo(todo)}
        onTabChange={setActiveTab}
        project={selectedProject}
        snippets={snippets}
        tagOptions={tagOptions}
        todos={todos}
      />

      {projectDialog ? (
        <ProjectDialog
          open
          onClose={() => setProjectDialog(null)}
          onSubmit={saveProject}
          project={projectDialog.project}
          saving={savingAction === 'project'}
        />
      ) : null}
      {noteDialog ? (
        <NoteDialog
          open
          note={noteDialog.note}
          onClose={() => setNoteDialog(null)}
          onSubmit={saveNote}
          saving={savingAction === 'note'}
        />
      ) : null}
      {snippetDialog ? (
        <SnippetDialog
          open
          onClose={() => setSnippetDialog(null)}
          onSubmit={saveSnippet}
          saving={savingAction === 'snippet'}
          snippet={snippetDialog.snippet}
        />
      ) : null}
      {ideaDialog ? (
        <IdeaDialog
          idea={ideaDialog.idea}
          open
          saving={savingAction === 'idea'}
          tagOptions={tagOptions}
          onClose={() => setIdeaDialog(null)}
          onSubmit={saveIdea}
        />
      ) : null}
      {todoDialog ? (
        <TodoDialog
          open
          saving={savingAction === 'todo'}
          tagOptions={tagOptions}
          todo={todoDialog.todo}
          onClose={() => setTodoDialog(null)}
          onSubmit={saveTodo}
        />
      ) : null}
      <ConfirmDialog
        confirmLabel={confirmLabel}
        loading={savingAction === 'delete'}
        message={confirmMessage}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => void confirmDelete()}
        open={Boolean(pendingDelete)}
        title={confirmTitle}
      />
      <Snackbar
        autoHideDuration={3600}
        open={Boolean(notice)}
        onClose={() => setNotice(null)}
      >
        <Alert
          severity={notice?.severity}
          variant="filled"
          onClose={() => setNotice(null)}
        >
          {notice?.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default App
