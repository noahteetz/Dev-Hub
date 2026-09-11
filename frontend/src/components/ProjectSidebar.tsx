import AddRoundedIcon from '@mui/icons-material/AddRounded'
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined'
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import HubOutlinedIcon from '@mui/icons-material/HubOutlined'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined'
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
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
import { Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import { accentText, tint, tintShadow } from '../theme'
import type { Project } from '../types'
import { ColorModeToggle } from './ColorModeToggle'

export type ApiState = 'loading' | 'ready' | 'error'

interface ProjectSidebarProps {
  projects: Project[]
  selectedProjectId: number | null
  apiState: ApiState
  onSelectProject: (projectId: number) => void
  onCreateProject: () => void
  onEditProject: (project: Project) => void
  onArchiveProject: (project: Project) => void
  onShowDashboard: (view: 'active' | 'archived') => void
  dashboardView: 'active' | 'archived'
  archivedProjectCount: number
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
  onArchiveProject,
  onShowDashboard,
  dashboardView,
  archivedProjectCount,
  onRetry,
}: ProjectSidebarProps) {
  const navigate = useNavigate()
  const visibleProjects = projects

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
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
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
          <ColorModeToggle />
        </Stack>
      </Box>

      <Box sx={{ px: 2.5 }}>
        <Button
          fullWidth
          startIcon={<AddRoundedIcon />}
          sx={(theme) => ({
            bgcolor: tint(theme, 0.08),
            borderRadius: 1,
            color: 'primary.main',
            transition: 'background-color 160ms ease, box-shadow 160ms ease, transform 160ms ease',
            '&:hover': {
              bgcolor: tint(theme, 0.14),
              boxShadow: tintShadow(theme),
              transform: 'translateY(-1px)',
            },
          })}
          variant="text"
          onClick={onCreateProject}
        >
          New project
        </Button>
      </Box>

      <List disablePadding sx={{ px: 1.25, pt: 2 }}>
        <ListItem disablePadding sx={{ mb: 0.5 }}>
          <ListItemButton
            selected={selectedProjectId === null && dashboardView === 'active'}
            sx={(theme) => ({
              borderRadius: 1,
              '&.Mui-selected': { bgcolor: tint(theme, 0.08), color: accentText(theme) },
              '&.Mui-selected:hover': { bgcolor: tint(theme, 0.14) },
            })}
            onClick={() => onShowDashboard('active')}
          >
            <DashboardOutlinedIcon fontSize="small" sx={{ color: 'primary.main', mr: 1.25 }} />
            <ListItemText primary="Project overview" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            selected={selectedProjectId === null && dashboardView === 'archived'}
            sx={(theme) => ({
              borderRadius: 1,
              '&.Mui-selected': { bgcolor: tint(theme, 0.08), color: accentText(theme) },
              '&.Mui-selected:hover': { bgcolor: tint(theme, 0.14) },
            })}
            onClick={() => onShowDashboard('archived')}
          >
            <ArchiveOutlinedIcon fontSize="small" sx={{ color: 'text.secondary', mr: 1.25 }} />
            <ListItemText primary="Archive" />
            <Chip label={archivedProjectCount} size="small" sx={{ bgcolor: 'action.hover', fontWeight: 700 }} />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding sx={{ mt: 1 }}><ListItemButton sx={{ borderRadius: 1 }} onClick={() => navigate('/inbox')}><InboxOutlinedIcon fontSize="small" sx={{ mr: 1.25 }} /><ListItemText primary="Inbox" /></ListItemButton></ListItem>
        <ListItem disablePadding><ListItemButton sx={{ borderRadius: 1 }} onClick={() => navigate('/notes')}><DescriptionOutlinedIcon fontSize="small" sx={{ mr: 1.25 }} /><ListItemText primary="All notes" /></ListItemButton></ListItem>
        <ListItem disablePadding><ListItemButton sx={{ borderRadius: 1 }} onClick={() => navigate('/ideas')}><LightbulbOutlinedIcon fontSize="small" sx={{ mr: 1.25 }} /><ListItemText primary="All ideas" /></ListItemButton></ListItem>
        <ListItem disablePadding><ListItemButton sx={{ borderRadius: 1 }} onClick={() => navigate('/settings')}><SettingsOutlinedIcon fontSize="small" sx={{ mr: 1.25 }} /><ListItemText primary="Settings" /></ListItemButton></ListItem>
      </List>

      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', px: 2.5, pb: 1, pt: 3 }}>
        <Typography color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase' }} variant="caption">Projects</Typography>
        <Chip label={visibleProjects.length} size="small" sx={{ bgcolor: 'action.hover', fontWeight: 700 }} />
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

        {apiState === 'ready' && visibleProjects.length === 0 ? (
          <Typography color="text.secondary" sx={{ px: 1.25, py: 2 }} variant="body2">
            Create a project to get started.
          </Typography>
        ) : null}

        {visibleProjects.map((project) => (
          <Fragment key={project.id}>
            <ListItem
            disablePadding
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
                <Tooltip title="Archive project">
                  <IconButton
                    aria-label={`Archive ${project.name}`}
                    size="small"
                    sx={{
                      transition: 'background-color 160ms ease, transform 160ms ease',
                      '&:hover': { bgcolor: 'action.hover', transform: 'scale(1.08)' },
                    }}
                    onClick={() => onArchiveProject(project)}
                  >
                    <ArchiveOutlinedIcon fontSize="inherit" />
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
              sx={(theme) => ({
                borderRadius: 1,
                pr: 11,
                transition: 'background-color 160ms ease, transform 160ms ease',
                '&:hover': {
                  bgcolor: tint(theme, 0.05),
                  transform: 'translateX(2px)',
                },
                '&.Mui-selected': {
                  bgcolor: tint(theme, 0.08),
                  color: accentText(theme),
                },
                '&.Mui-selected:hover': {
                  bgcolor: tint(theme, 0.14),
                },
              })}
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
          </Fragment>
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
