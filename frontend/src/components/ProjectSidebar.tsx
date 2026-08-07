import AddRoundedIcon from '@mui/icons-material/AddRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import HubOutlinedIcon from '@mui/icons-material/HubOutlined'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import {
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import type { Project } from '../types'

export type ApiState = 'loading' | 'ready' | 'error'

interface ProjectSidebarProps {
  projects: Project[]
  selectedProjectId: number | null
  apiState: ApiState
  onSelectProject: (projectId: number) => void
  onCreateProject: () => void
  onEditProject: (project: Project) => void
  onDeleteProject: (project: Project) => void
  onRetry: () => void
}

function projectInitial(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || '?'
}

export function ProjectSidebar({
  projects,
  selectedProjectId,
  apiState,
  onSelectProject,
  onCreateProject,
  onEditProject,
  onDeleteProject,
  onRetry,
}: ProjectSidebarProps) {
  return (
    <Paper
      component="aside"
      elevation={0}
      square
      sx={{
        borderBottom: { xs: 1, md: 0 },
        borderColor: 'divider',
        borderRight: { md: 1 },
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        width: { xs: '100%', md: 288 },
      }}
    >
      <Box sx={{ p: 2.5 }}>
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
          <Avatar
            sx={{
              bgcolor: 'primary.main',
              borderRadius: 1,
              color: 'primary.contrastText',
              height: 38,
              width: 38,
            }}
          >
            <HubOutlinedIcon fontSize="small" />
          </Avatar>
          <Box>
            <Typography sx={{ fontWeight: 800, letterSpacing: -0.3 }}>
              Dev Hub
            </Typography>
            <Typography color="text.secondary" variant="caption">
              Your project memory
            </Typography>
          </Box>
        </Stack>
      </Box>

      <Box sx={{ px: 2.5 }}>
        <Button
          fullWidth
          startIcon={<AddRoundedIcon />}
          sx={{
            bgcolor: 'rgba(91, 97, 232, 0.08)',
            borderRadius: 1,
            color: 'primary.main',
            transition: 'background-color 160ms ease, box-shadow 160ms ease, transform 160ms ease',
            '&:hover': {
              bgcolor: 'rgba(91, 97, 232, 0.14)',
              boxShadow: '0 8px 18px rgba(91, 97, 232, 0.14)',
              transform: 'translateY(-1px)',
            },
          }}
          variant="text"
          onClick={onCreateProject}
        >
          New project
        </Button>
      </Box>

      <Stack
        direction="row"
        sx={{
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2.5,
          pb: 1,
          pt: 3,
        }}
      >
        <Typography
          color="text.secondary"
          sx={{ fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase' }}
          variant="caption"
        >
          Projects
        </Typography>
        <Chip
          label={projects.length}
          size="small"
          sx={{ bgcolor: 'action.hover', fontWeight: 700 }}
        />
      </Stack>

      <List disablePadding sx={{ flex: 1, overflow: 'auto', px: 1.25 }}>
        {apiState === 'loading' ? (
          <Typography color="text.secondary" sx={{ px: 1.25, py: 2 }} variant="body2">
            Loading projects...
          </Typography>
        ) : null}

        {apiState === 'error' ? (
          <Stack spacing={1} sx={{ alignItems: 'flex-start', px: 1.25, py: 2 }}>
            <Typography color="text.secondary" variant="body2">
              Projects could not be loaded.
            </Typography>
            <Button
              size="small"
              startIcon={<RefreshRoundedIcon />}
              onClick={onRetry}
            >
              Try again
            </Button>
          </Stack>
        ) : null}

        {apiState === 'ready' && projects.length === 0 ? (
          <Typography color="text.secondary" sx={{ px: 1.25, py: 2 }} variant="body2">
            Create a project to get started.
          </Typography>
        ) : null}

        {projects.map((project) => (
          <ListItem
            disablePadding
            key={project.id}
            secondaryAction={
              <Stack
                className="project-actions"
                direction="row"
                spacing={0.25}
                sx={{
                  opacity: 0.55,
                  transform: 'translateX(2px)',
                  transition: 'opacity 160ms ease, transform 160ms ease',
                }}
              >
                <Tooltip title="Edit project">
                  <IconButton
                    aria-label={`Edit ${project.name}`}
                    size="small"
                    sx={{
                      transition: 'background-color 160ms ease, transform 160ms ease',
                      '&:hover': {
                        bgcolor: 'action.hover',
                        transform: 'scale(1.08)',
                      },
                    }}
                    onClick={() => onEditProject(project)}
                  >
                    <EditOutlinedIcon fontSize="inherit" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete project">
                  <IconButton
                    aria-label={`Delete ${project.name}`}
                    color="error"
                    size="small"
                    sx={{
                      transition: 'background-color 160ms ease, transform 160ms ease',
                      '&:hover': {
                        bgcolor: 'rgba(211, 47, 47, 0.08)',
                        transform: 'scale(1.08)',
                      },
                    }}
                    onClick={() => onDeleteProject(project)}
                  >
                    <DeleteOutlineRoundedIcon fontSize="inherit" />
                  </IconButton>
                </Tooltip>
              </Stack>
            }
            sx={{
              mb: 0.5,
              '&:hover .project-actions, &:focus-within .project-actions': {
                opacity: 1,
                transform: 'translateX(0)',
              },
            }}
          >
            <ListItemButton
              selected={project.id === selectedProjectId}
              sx={{
                borderRadius: 1,
                pr: 11,
                transition: 'background-color 160ms ease, transform 160ms ease',
                '&:hover': {
                  bgcolor: 'rgba(91, 97, 232, 0.05)',
                  transform: 'translateX(2px)',
                },
                '&.Mui-selected': {
                  bgcolor: 'rgba(91, 97, 232, 0.08)',
                  color: 'primary.dark',
                },
                '&.Mui-selected:hover': {
                  bgcolor: 'rgba(91, 97, 232, 0.14)',
                },
              }}
              onClick={() => onSelectProject(project.id)}
            >
              <Avatar
                sx={{
                  bgcolor: project.id === selectedProjectId ? 'primary.main' : 'action.hover',
                  color: project.id === selectedProjectId ? 'primary.contrastText' : 'text.secondary',
                  fontSize: 13,
                  height: 30,
                  mr: 1.25,
                  width: 30,
                }}
              >
                {projectInitial(project.name)}
              </Avatar>
              <ListItemText
                primary={project.name}
                secondary={project.description || 'No description'}
                slotProps={{
                  primary: {
                    noWrap: true,
                    sx: {
                      fontWeight: project.id === selectedProjectId ? 700 : 500,
                    },
                  },
                  secondary: {
                    noWrap: true,
                    sx: { mt: 0.25 },
                  },
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider />
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', p: 2.5 }}>
        <Box
          sx={{
            bgcolor: apiState === 'error' ? 'error.main' : 'success.main',
            borderRadius: '50%',
            height: 8,
            width: 8,
          }}
        />
        <Typography color="text.secondary" variant="caption">
          {apiState === 'error' ? 'API unavailable' : 'API connected'}
        </Typography>
      </Stack>
    </Paper>
  )
}
