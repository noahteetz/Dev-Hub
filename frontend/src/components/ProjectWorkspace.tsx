import AddRoundedIcon from '@mui/icons-material/AddRounded'
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined'
import CodeOutlinedIcon from '@mui/icons-material/CodeOutlined'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined'
import MoreHorizRoundedIcon from '@mui/icons-material/MoreHorizRounded'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material'
import type { ReactNode } from 'react'
import type { CodeSnippet, Note, Project } from '../types'
import { formatDate } from '../utils/formatDate'
import { EmptyState } from './EmptyState'

export type WorkspaceTab = 'notes' | 'snippets'

interface ProjectWorkspaceProps {
  project: Project | null
  notes: Note[]
  snippets: CodeSnippet[]
  activeTab: WorkspaceTab
  loading: boolean
  onTabChange: (tab: WorkspaceTab) => void
  onCreateNote: () => void
  onEditNote: (note: Note) => void
  onDeleteNote: (note: Note) => void
  onCreateSnippet: () => void
  onEditSnippet: (snippet: CodeSnippet) => void
  onDeleteSnippet: (snippet: CodeSnippet) => void
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

      {project ? (
        <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
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
      ) : (
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
      )}
    </Toolbar>
  )
}

export function ProjectWorkspace({
  project,
  notes,
  snippets,
  activeTab,
  loading,
  onTabChange,
  onCreateNote,
  onEditNote,
  onDeleteNote,
  onCreateSnippet,
  onEditSnippet,
  onDeleteSnippet,
  onEditProject,
  onDeleteProject,
  onCreateProject,
}: ProjectWorkspaceProps) {
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

  const items = activeTab === 'notes' ? notes : snippets

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
          <Metric icon={<CodeOutlinedIcon fontSize="small" />} label="Code snippets" value={snippets.length} />
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
            <Tab
              icon={<CodeOutlinedIcon fontSize="small" />}
              iconPosition="start"
              label={`Code snippets ${snippets.length}`}
              value="snippets"
            />
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
                <Typography sx={{ fontWeight: 750 }}>
                  {activeTab === 'notes' ? 'Notes and ideas' : 'Reusable code'}
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  {activeTab === 'notes'
                    ? 'Keep context close to the work.'
                    : 'Save commands and snippets you want to find again.'}
                </Typography>
              </Box>
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
                onClick={activeTab === 'notes' ? onCreateNote : onCreateSnippet}
              >
                {activeTab === 'notes' ? 'Add note' : 'Add snippet'}
              </Button>
            </Stack>

            {loading ? <LoadingCards /> : null}

            {!loading && items.length === 0 ? (
              <EmptyState
                description={
                  activeTab === 'notes'
                    ? 'Write down the decisions and details you do not want to lose.'
                    : 'Store a useful command or code block for the next time you need it.'
                }
                actionLabel={activeTab === 'notes' ? 'Add a note' : 'Add a snippet'}
                icon={
                  activeTab === 'notes' ? (
                    <DescriptionOutlinedIcon sx={{ color: 'primary.main', fontSize: 38 }} />
                  ) : (
                    <CodeOutlinedIcon sx={{ color: 'primary.main', fontSize: 38 }} />
                  )
                }
                onAction={activeTab === 'notes' ? onCreateNote : onCreateSnippet}
                title={activeTab === 'notes' ? 'No notes yet' : 'No snippets yet'}
              />
            ) : null}

            {!loading && items.length > 0 && activeTab === 'notes' ? (
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

            {!loading && items.length > 0 && activeTab === 'snippets' ? (
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
          <Typography variant="caption">Everything here stays attached to this project</Typography>
        </Stack>
      </Box>
    </Box>
  )
}
