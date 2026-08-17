import AddRoundedIcon from '@mui/icons-material/AddRounded'
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined'
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded'
import CodeOutlinedIcon from '@mui/icons-material/CodeOutlined'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined'
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined'
import MoreHorizRoundedIcon from '@mui/icons-material/MoreHorizRounded'
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import type { ReactNode } from 'react'
import type { CodeSnippet, Idea, Note, Project, Todo } from '../types'
import { formatDate } from '../utils/formatDate'
import { EmptyState } from './EmptyState'

export type WorkspaceTab = 'notes' | 'snippets' | 'ideas' | 'todos'

interface ProjectWorkspaceProps {
  project: Project | null
  notes: Note[]
  snippets: CodeSnippet[]
  ideas: Idea[]
  todos: Todo[]
  tagOptions: string[]
  activeTab: WorkspaceTab
  loading: boolean
  onTabChange: (tab: WorkspaceTab) => void
  onCreateNote: () => void
  onEditNote: (note: Note) => void
  onDeleteNote: (note: Note) => void
  onCreateSnippet: () => void
  onEditSnippet: (snippet: CodeSnippet) => void
  onDeleteSnippet: (snippet: CodeSnippet) => void
  onCreateIdea: () => void
  onEditIdea: (idea: Idea) => void
  onDeleteIdea: (idea: Idea) => void
  onConvertIdea: (idea: Idea) => void
  onCreateTodo: () => void
  onEditTodo: (todo: Todo) => void
  onDeleteTodo: (todo: Todo) => void
  onToggleTodo: (todo: Todo) => void
  onEditProject: () => void
  onDeleteProject: () => void
  onCreateProject: () => void
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: number | string
}) {
  return (
    <Box
      sx={{
        bgcolor: 'rgba(255, 255, 255, 0.72)',
        borderRadius: 1,
        p: 2,
        transition: 'background-color 160ms ease, box-shadow 160ms ease, transform 160ms ease',
        '&:hover': {
          bgcolor: 'background.paper',
          boxShadow: '0 12px 28px rgba(30, 42, 80, 0.08)',
          transform: 'translateY(-2px)',
        },
      }}
    >
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
        <Box
          sx={{
            alignItems: 'center',
            bgcolor: 'rgba(91, 97, 232, 0.08)',
            borderRadius: 1,
            color: 'primary.main',
            display: 'flex',
            height: 34,
            justifyContent: 'center',
            width: 34,
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 800 }} variant="h6">
            {value}
          </Typography>
          <Typography color="text.secondary" variant="caption">
            {label}
          </Typography>
        </Box>
      </Stack>
    </Box>
  )
}

function NoteCard({
  note,
  onEdit,
  onDelete,
}: {
  note: Note
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <Card
      elevation={0}
      sx={{
        bgcolor: 'background.paper',
        borderRadius: 1,
        boxShadow: '0 1px 2px rgba(30, 42, 80, 0.04)',
        transition: 'box-shadow 160ms ease, transform 160ms ease',
        '&:hover': {
          boxShadow: '0 12px 28px rgba(30, 42, 80, 0.09)',
          transform: 'translateY(-2px)',
        },
      }}
    >
      <CardContent sx={{ p: 2.25, '&:last-child': { pb: 2.25 } }}>
        <Stack
          direction="row"
          spacing={2}
          sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography noWrap sx={{ fontWeight: 750 }}>
              {note.title}
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.75, whiteSpace: 'pre-wrap' }} variant="body2">
              {note.content}
            </Typography>
          </Box>
          <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0 }}>
            <Tooltip title="Edit note">
              <IconButton
                aria-label={`Edit ${note.title}`}
                size="small"
                sx={{
                  transition: 'background-color 160ms ease, transform 160ms ease',
                  '&:hover': {
                    bgcolor: 'action.hover',
                    transform: 'scale(1.08)',
                  },
                }}
                onClick={onEdit}
              >
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
              <Tooltip title="Delete note">
                <IconButton
                  aria-label={`Delete ${note.title}`}
                  color="error"
                  size="small"
                  sx={{
                    transition: 'background-color 160ms ease, transform 160ms ease',
                    '&:hover': {
                      bgcolor: 'rgba(211, 47, 47, 0.08)',
                      transform: 'scale(1.08)',
                    },
                  }}
                  onClick={onDelete}
                >
                  <DeleteOutlineRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
          </Stack>
        </Stack>
        <Typography color="text.disabled" sx={{ display: 'block', mt: 1.75 }} variant="caption">
          Updated {formatDate(note.updatedAt)}
        </Typography>
      </CardContent>
    </Card>
  )
}

function SnippetCard({
  snippet,
  onEdit,
  onDelete,
}: {
  snippet: CodeSnippet
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <Card
      elevation={0}
      sx={{
        bgcolor: 'background.paper',
        borderRadius: 1,
        boxShadow: '0 1px 2px rgba(30, 42, 80, 0.04)',
        overflow: 'hidden',
        transition: 'box-shadow 160ms ease, transform 160ms ease',
        '&:hover': {
          boxShadow: '0 12px 28px rgba(30, 42, 80, 0.09)',
          transform: 'translateY(-2px)',
        },
      }}
    >
      <CardContent sx={{ p: 2.25, '&:last-child': { pb: 2.25 } }}>
        <Stack
          direction="row"
          spacing={2}
          sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography noWrap sx={{ fontWeight: 750 }}>
              {snippet.title}
            </Typography>
            <Chip
              label={snippet.language || 'text'}
              size="small"
              sx={{ mt: 0.75, bgcolor: 'action.hover', fontFamily: 'monospace', fontSize: 11 }}
            />
          </Box>
          <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0 }}>
            <Tooltip title="Edit snippet">
              <IconButton
                aria-label={`Edit ${snippet.title}`}
                size="small"
                sx={{
                  transition: 'background-color 160ms ease, transform 160ms ease',
                  '&:hover': {
                    bgcolor: 'action.hover',
                    transform: 'scale(1.08)',
                  },
                }}
                onClick={onEdit}
              >
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete snippet">
              <IconButton
                aria-label={`Delete ${snippet.title}`}
                color="error"
                size="small"
                sx={{
                  transition: 'background-color 160ms ease, transform 160ms ease',
                  '&:hover': {
                    bgcolor: 'rgba(211, 47, 47, 0.08)',
                    transform: 'scale(1.08)',
                  },
                }}
                onClick={onDelete}
              >
                <DeleteOutlineRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
        <Box
          component="pre"
          sx={{
            bgcolor: '#172033',
            borderRadius: 1,
            color: '#dce7ff',
            fontFamily: '"ui-monospace", "SFMono-Regular", Consolas, monospace',
            fontSize: 13,
            lineHeight: 1.65,
            maxHeight: 280,
            mb: 0,
            mt: 1.75,
            overflow: 'auto',
            p: 1.75,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {snippet.code}
        </Box>
        <Typography color="text.disabled" sx={{ display: 'block', mt: 1.5 }} variant="caption">
          Updated {formatDate(snippet.updatedAt)}
        </Typography>
      </CardContent>
    </Card>
  )
}

function TagList({ tags }: { tags: Idea['tags'] }) {
  if (tags.length === 0) {
    return null
  }

  return (
    <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5, mt: 1.25 }}>
      {tags.map((tag) => (
        <Chip key={tag.id} label={tag.name} size="small" sx={{ bgcolor: 'action.hover' }} />
      ))}
    </Stack>
  )
}

function IdeaCard({
  idea,
  onConvert,
  onDelete,
  onEdit,
}: {
  idea: Idea
  onConvert: () => void
  onDelete: () => void
  onEdit: () => void
}) {
  return (
    <Card elevation={0} sx={{ bgcolor: 'background.paper', borderRadius: 1, boxShadow: '0 1px 2px rgba(30, 42, 80, 0.04)' }}>
      <CardContent sx={{ p: 2.25, '&:last-child': { pb: 2.25 } }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Typography noWrap sx={{ fontWeight: 750 }}>{idea.title}</Typography>
              {idea.converted ? <Chip color="success" label="Converted" size="small" /> : null}
            </Stack>
            {idea.content ? <Typography color="text.secondary" sx={{ mt: 0.75, whiteSpace: 'pre-wrap' }} variant="body2">{idea.content}</Typography> : null}
            <TagList tags={idea.tags} />
          </Box>
          <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0 }}>
            {!idea.converted ? (
              <Tooltip title="Convert to todo">
                <IconButton aria-label={`Convert ${idea.title} to todo`} color="primary" size="small" onClick={onConvert}>
                  <CheckCircleOutlineRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            ) : null}
            <Tooltip title="Edit idea">
              <IconButton aria-label={`Edit ${idea.title}`} size="small" onClick={onEdit}>
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete idea">
              <IconButton aria-label={`Delete ${idea.title}`} color="error" size="small" onClick={onDelete}>
                <DeleteOutlineRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
        <Typography color="text.disabled" sx={{ display: 'block', mt: 1.75 }} variant="caption">
          {idea.converted ? 'Converted' : 'Updated'} {formatDate(idea.updatedAt)}
        </Typography>
      </CardContent>
    </Card>
  )
}

function TodoCard({
  todo,
  onDelete,
  onEdit,
  onToggle,
}: {
  todo: Todo
  onDelete: () => void
  onEdit: () => void
  onToggle: () => void
}) {
  return (
    <Card elevation={0} sx={{ bgcolor: 'background.paper', borderRadius: 1, boxShadow: '0 1px 2px rgba(30, 42, 80, 0.04)', opacity: todo.completed ? 0.7 : 1 }}>
      <CardContent sx={{ p: 2.25, '&:last-child': { pb: 2.25 } }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
          <Checkbox
            aria-label={`Mark ${todo.title} as ${todo.completed ? 'open' : 'completed'}`}
            checked={todo.completed}
            size="small"
            sx={{ mt: -0.75 }}
            onChange={onToggle}
          />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography noWrap sx={{ fontWeight: 750, textDecoration: todo.completed ? 'line-through' : 'none' }}>{todo.title}</Typography>
            {todo.content ? <Typography color="text.secondary" sx={{ mt: 0.75, whiteSpace: 'pre-wrap' }} variant="body2">{todo.content}</Typography> : null}
            <TagList tags={todo.tags} />
          </Box>
          <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0 }}>
            <Tooltip title="Edit todo">
              <IconButton aria-label={`Edit ${todo.title}`} size="small" onClick={onEdit}>
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete todo">
              <IconButton aria-label={`Delete ${todo.title}`} color="error" size="small" onClick={onDelete}>
                <DeleteOutlineRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
        <Typography color="text.disabled" sx={{ display: 'block', ml: 4.25, mt: 1.75 }} variant="caption">
          {todo.completed ? 'Completed' : 'Updated'} {formatDate(todo.updatedAt)}
        </Typography>
      </CardContent>
    </Card>
  )
}

function LoadingCards() {
  return (
    <Stack spacing={1.5}>
      {[0, 1].map((item) => (
        <Box
          key={item}
          sx={{
            bgcolor: 'background.paper',
            borderRadius: 1,
            p: 2.25,
          }}
        >
          <Skeleton height={22} width="35%" />
          <Skeleton height={20} width="90%" />
          <Skeleton height={18} width="25%" />
        </Box>
      ))}
    </Stack>
  )
}

function WorkspaceHeader({
  project,
  onCreateProject,
  onDeleteProject,
  onEditProject,
}: {
  project: Project | null
  onCreateProject: () => void
  onEditProject: () => void
  onDeleteProject: () => void
}) {
  return (
    <Toolbar
      component="header"
      disableGutters
      sx={{
        alignItems: { xs: 'flex-start', sm: 'center' },
        flexDirection: { xs: 'column', sm: 'row' },
        gap: { xs: 2, sm: 3 },
        justifyContent: 'space-between',
        minHeight: 'auto',
        pb: { xs: 3, sm: 4 },
        width: '100%',
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography
          color="primary.main"
          sx={{ fontWeight: 800, letterSpacing: 1.1, textTransform: 'uppercase' }}
          variant="overline"
        >
          {project ? 'Project space' : 'Workspace'}
        </Typography>
        <Typography
          component="h1"
          noWrap
          sx={{
            fontWeight: 800,
            letterSpacing: -1,
            mt: 0.5,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          variant={project ? 'h3' : 'h4'}
        >
          {project?.name ?? 'Your workspace is ready'}
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 0.75 }} variant="body1">
          {project?.description || 'A focused place for everything this project needs.'}
        </Typography>
      </Box>

      {project && !project.system ? (
        <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
          {project.repositoryUrl ? (
            <Tooltip title="Open repository">
              <IconButton aria-label="Open repository" component="a" href={project.repositoryUrl} rel="noreferrer" target="_blank">
                <OpenInNewRoundedIcon />
              </IconButton>
            </Tooltip>
          ) : null}
          {project.deploymentUrl ? (
            <Tooltip title="Open deployment">
              <IconButton aria-label="Open deployment" component="a" href={project.deploymentUrl} rel="noreferrer" target="_blank">
                <OpenInNewRoundedIcon />
              </IconButton>
            </Tooltip>
          ) : null}
          {project.links.map((link) => (
            <Tooltip key={link.id} title={link.label}>
              <IconButton aria-label={`Open ${link.label}`} component="a" href={link.url} rel="noreferrer" target="_blank">
                <OpenInNewRoundedIcon />
              </IconButton>
            </Tooltip>
          ))}
          <Button
            startIcon={<EditOutlinedIcon />}
            sx={{
              borderRadius: 1,
              color: 'text.secondary',
              px: 1.5,
              transition: 'background-color 160ms ease, box-shadow 160ms ease, color 160ms ease, transform 160ms ease',
              '&:hover': {
                bgcolor: 'action.hover',
                boxShadow: '0 8px 18px rgba(30, 42, 80, 0.08)',
                color: 'text.primary',
                transform: 'translateY(-1px)',
              },
            }}
            variant="text"
            onClick={onEditProject}
          >
            Edit
          </Button>
          <Tooltip title="Delete project">
            <IconButton
              aria-label={`Delete ${project.name}`}
              color="error"
              sx={{
                borderRadius: 1,
                transition: 'background-color 160ms ease, transform 160ms ease',
                '&:hover': {
                  bgcolor: 'rgba(211, 47, 47, 0.08)',
                  transform: 'scale(1.08)',
                },
              }}
              onClick={onDeleteProject}
            >
              <DeleteOutlineRoundedIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      ) : !project ? (
        <Button
          startIcon={<AddRoundedIcon />}
          sx={{
            alignSelf: { xs: 'flex-start', sm: 'auto' },
            bgcolor: 'rgba(91, 97, 232, 0.08)',
            borderRadius: 1,
            color: 'primary.main',
            px: 1.75,
            transition: 'background-color 160ms ease, box-shadow 160ms ease, transform 160ms ease',
            '&:hover': {
              bgcolor: 'rgba(91, 97, 232, 0.14)',
              boxShadow: '0 8px 18px rgba(91, 97, 232, 0.16)',
              transform: 'translateY(-1px)',
            },
          }}
          variant="text"
          onClick={onCreateProject}
        >
          New project
        </Button>
      ) : null}
    </Toolbar>
  )
}

export function ProjectWorkspace({
  project,
  notes,
  snippets,
  ideas,
  todos,
  tagOptions,
  activeTab,
  loading,
  onTabChange,
  onCreateNote,
  onEditNote,
  onDeleteNote,
  onCreateSnippet,
  onEditSnippet,
  onDeleteSnippet,
  onCreateIdea,
  onEditIdea,
  onDeleteIdea,
  onConvertIdea,
  onCreateTodo,
  onEditTodo,
  onDeleteTodo,
  onToggleTodo,
  onEditProject,
  onDeleteProject,
  onCreateProject,
}: ProjectWorkspaceProps) {
  const [tagFilter, setTagFilter] = useState('')

  if (!project) {
    return (
      <Box component="main" sx={{ flex: 1, minWidth: 0 }}>
        <Box
          sx={{
            mx: 'auto',
            maxWidth: 1180,
            p: { xs: 2, sm: 3.5, lg: 5 },
          }}
        >
          <WorkspaceHeader
            onCreateProject={onCreateProject}
            onDeleteProject={onDeleteProject}
            onEditProject={onEditProject}
            project={project}
          />
          <EmptyState
            description="Projects keep your notes, decisions, commands, and code snippets together in one calm space."
            actionLabel="Create your first project"
            icon={<FolderOpenOutlinedIcon sx={{ color: 'primary.main', fontSize: 42 }} />}
            onAction={onCreateProject}
            title="Your workspace is ready"
          />
        </Box>
      </Box>
    )
  }

  const isSystemSection = project.system
  const filteredIdeas = tagFilter
    ? ideas.filter((idea) => idea.tags.some((tag) => tag.name === tagFilter))
    : ideas
  const filteredTodos = tagFilter
    ? todos.filter((todo) => todo.tags.some((tag) => tag.name === tagFilter))
    : todos
  const sectionTitle = isSystemSection
    ? project.name
    : activeTab === 'notes'
      ? 'Notes and ideas'
      : activeTab === 'snippets'
        ? 'Reusable code'
        : activeTab === 'ideas'
          ? 'Ideas to explore'
          : 'Things to do'
  const sectionDescription = isSystemSection
    ? project.description
    : activeTab === 'notes'
      ? 'Keep context close to the work.'
      : activeTab === 'snippets'
        ? 'Save commands and snippets you want to find again.'
        : activeTab === 'ideas'
          ? 'Collect opportunities before they become work.'
          : 'Keep the next useful actions visible.'
  const visibleItemCount = isSystemSection || activeTab === 'notes'
    ? notes.length
    : activeTab === 'snippets'
      ? snippets.length
      : activeTab === 'ideas'
        ? filteredIdeas.length
        : filteredTodos.length
  const createAction = isSystemSection || activeTab === 'notes'
    ? onCreateNote
    : activeTab === 'snippets'
      ? onCreateSnippet
      : activeTab === 'ideas'
        ? onCreateIdea
        : onCreateTodo
  const createLabel = isSystemSection || activeTab === 'notes'
    ? 'Add note'
    : activeTab === 'snippets'
      ? 'Add snippet'
      : activeTab === 'ideas'
        ? 'Add idea'
        : 'Add todo'

  return (
    <Box component="main" sx={{ flex: 1, minWidth: 0 }}>
      <Box
        sx={{
          mx: 'auto',
          maxWidth: 1180,
          p: { xs: 2, sm: 3.5, lg: 5 },
        }}
      >
        <WorkspaceHeader
          onCreateProject={onCreateProject}
          onDeleteProject={onDeleteProject}
          onEditProject={onEditProject}
          project={project}
        />

        <Box
          sx={{
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))' },
          }}
        >
          <Metric icon={<DescriptionOutlinedIcon fontSize="small" />} label="Notes" value={notes.length} />
          {!isSystemSection ? (
            <Metric icon={<CodeOutlinedIcon fontSize="small" />} label="Code snippets" value={snippets.length} />
          ) : null}
          {!isSystemSection ? (
            <Metric icon={<LightbulbOutlinedIcon fontSize="small" />} label="Active ideas" value={ideas.filter((idea) => !idea.converted).length} />
          ) : null}
          {!isSystemSection ? (
            <Metric icon={<CheckCircleOutlineRoundedIcon fontSize="small" />} label="Open todos" value={todos.filter((todo) => !todo.completed).length} />
          ) : null}
          <Metric
            icon={<CalendarTodayOutlinedIcon fontSize="small" />}
            label="Last updated"
            value={formatDate(project.updatedAt)}
          />
        </Box>

        <Box sx={{ mt: 3.5 }}>
          <Tabs
            value={activeTab}
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              minHeight: 48,
              '& .MuiTab-root': {
                minHeight: 48,
                px: 1.5,
                transition: 'background-color 160ms ease, color 160ms ease',
              },
              '& .MuiTab-root:hover': {
                bgcolor: 'rgba(91, 97, 232, 0.06)',
                color: 'primary.main',
              },
              '& .MuiTabs-indicator': {
                borderRadius: '3px 3px 0 0',
                height: 3,
              },
            }}
            onChange={(_, value: WorkspaceTab) => onTabChange(value)}
          >
            <Tab
              icon={<DescriptionOutlinedIcon fontSize="small" />}
              iconPosition="start"
              label={`Notes ${notes.length}`}
              value="notes"
            />
            {!isSystemSection ? (
              <Tab
                icon={<CodeOutlinedIcon fontSize="small" />}
                iconPosition="start"
                label={`Code snippets ${snippets.length}`}
                value="snippets"
              />
            ) : null}
            {!isSystemSection ? (
              <Tab
                icon={<LightbulbOutlinedIcon fontSize="small" />}
                iconPosition="start"
                label={`Ideas ${ideas.length}`}
                value="ideas"
              />
            ) : null}
            {!isSystemSection ? (
              <Tab
                icon={<CheckCircleOutlineRoundedIcon fontSize="small" />}
                iconPosition="start"
                label={`Todos ${todos.length}`}
                value="todos"
              />
            ) : null}
          </Tabs>

          <Box
            sx={{
              bgcolor: 'background.paper',
              borderRadius: 1,
              boxShadow: '0 1px 2px rgba(30, 42, 80, 0.04)',
              mt: 1.5,
              p: { xs: 1.5, sm: 2.5 },
            }}
          >
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              sx={{
                alignItems: { xs: 'flex-start', sm: 'center' },
                justifyContent: 'space-between',
                mb: 2,
              }}
            >
              <Box>
                <Typography sx={{ fontWeight: 750 }}>{sectionTitle}</Typography>
                <Typography color="text.secondary" variant="body2">{sectionDescription}</Typography>
              </Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                {!isSystemSection && (activeTab === 'ideas' || activeTab === 'todos') ? (
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel id="tag-filter-label">Tag</InputLabel>
                    <Select
                      label="Tag"
                      labelId="tag-filter-label"
                      value={tagFilter}
                      onChange={(event) => setTagFilter(event.target.value)}
                    >
                      <MenuItem value="">All tags</MenuItem>
                      {tagOptions.map((tag) => <MenuItem key={tag} value={tag}>{tag}</MenuItem>)}
                    </Select>
                  </FormControl>
                ) : null}
                <Button
                  startIcon={<AddRoundedIcon />}
                  sx={{
                    bgcolor: 'rgba(91, 97, 232, 0.08)',
                    borderRadius: 1,
                    color: 'primary.main',
                    px: 1.5,
                    transition: 'background-color 160ms ease, box-shadow 160ms ease, transform 160ms ease',
                    '&:hover': {
                      bgcolor: 'rgba(91, 97, 232, 0.14)',
                      boxShadow: '0 8px 18px rgba(91, 97, 232, 0.14)',
                      transform: 'translateY(-1px)',
                    },
                  }}
                  variant="text"
                  onClick={createAction}
                >
                  {createLabel}
                </Button>
              </Stack>
            </Stack>

            {loading ? <LoadingCards /> : null}

            {!loading && visibleItemCount === 0 ? (
              <EmptyState
                description={
                  activeTab === 'notes' || isSystemSection
                    ? 'Write down the decisions and details you do not want to lose.'
                    : activeTab === 'snippets'
                      ? 'Store a useful command or code block for the next time you need it.'
                      : activeTab === 'ideas'
                        ? tagFilter ? 'No ideas use this tag yet.' : 'Capture a possibility before it gets lost.'
                        : tagFilter ? 'No todos use this tag yet.' : 'Add the next useful task for this project.'
                }
                actionLabel={createLabel}
                icon={
                  activeTab === 'notes' || isSystemSection ? (
                    <DescriptionOutlinedIcon sx={{ color: 'primary.main', fontSize: 38 }} />
                  ) : activeTab === 'snippets' ? (
                    <CodeOutlinedIcon sx={{ color: 'primary.main', fontSize: 38 }} />
                  ) : activeTab === 'ideas' ? (
                    <LightbulbOutlinedIcon sx={{ color: 'primary.main', fontSize: 38 }} />
                  ) : (
                    <CheckCircleOutlineRoundedIcon sx={{ color: 'primary.main', fontSize: 38 }} />
                  )
                }
                onAction={createAction}
                title={
                  activeTab === 'notes' || isSystemSection
                    ? 'No notes yet'
                    : activeTab === 'snippets'
                      ? 'No snippets yet'
                      : activeTab === 'ideas'
                        ? 'No ideas yet'
                        : 'No todos yet'
                }
              />
            ) : null}

            {!loading && notes.length > 0 && (activeTab === 'notes' || isSystemSection) ? (
              <Stack spacing={1.5}>
                {notes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onDelete={() => onDeleteNote(note)}
                    onEdit={() => onEditNote(note)}
                  />
                ))}
              </Stack>
            ) : null}

            {!loading && snippets.length > 0 && activeTab === 'snippets' && !isSystemSection ? (
              <Stack spacing={1.5}>
                {snippets.map((snippet) => (
                  <SnippetCard
                    key={snippet.id}
                    snippet={snippet}
                    onDelete={() => onDeleteSnippet(snippet)}
                    onEdit={() => onEditSnippet(snippet)}
                  />
                ))}
              </Stack>
            ) : null}

            {!loading && filteredIdeas.length > 0 && activeTab === 'ideas' && !isSystemSection ? (
              <Stack spacing={1.5}>
                {filteredIdeas.map((idea) => (
                  <IdeaCard
                    key={idea.id}
                    idea={idea}
                    onConvert={() => onConvertIdea(idea)}
                    onDelete={() => onDeleteIdea(idea)}
                    onEdit={() => onEditIdea(idea)}
                  />
                ))}
              </Stack>
            ) : null}

            {!loading && filteredTodos.length > 0 && activeTab === 'todos' && !isSystemSection ? (
              <Stack spacing={1.5}>
                {filteredTodos.map((todo) => (
                  <TodoCard
                    key={todo.id}
                    todo={todo}
                    onDelete={() => onDeleteTodo(todo)}
                    onEdit={() => onEditTodo(todo)}
                    onToggle={() => onToggleTodo(todo)}
                  />
                ))}
              </Stack>
            ) : null}
          </Box>
        </Box>

        <Stack
          direction="row"
          spacing={0.75}
          sx={{
            alignItems: 'center',
            color: 'text.disabled',
            justifyContent: 'center',
            mt: 2.5,
          }}
        >
          <MoreHorizRoundedIcon fontSize="small" />
          <Typography variant="caption">
            {isSystemSection ? 'Everything here stays in this personal space' : 'Everything here stays attached to this project'}
          </Typography>
        </Stack>
      </Box>
    </Box>
  )
}
