import AddRoundedIcon from '@mui/icons-material/AddRounded'
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined'
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import HubOutlinedIcon from '@mui/icons-material/HubOutlined'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined'
import KeyboardDoubleArrowLeftRoundedIcon from '@mui/icons-material/KeyboardDoubleArrowLeftRounded'
import KeyboardDoubleArrowRightRoundedIcon from '@mui/icons-material/KeyboardDoubleArrowRightRounded'
import TerminalRoundedIcon from '@mui/icons-material/TerminalRounded'
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
import { Fragment, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { accentText, tint, tintShadow } from '../theme'
import type { Project } from '../types'
import { projectCan, roleLabel } from '../utils/projectPermissions'
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
  workspacesAvailable?: boolean
}

const collapsedKey = 'devhub.sidebar.collapsed'

function readCollapsed() {
  try { return localStorage.getItem(collapsedKey) === 'true' } catch { return false }
}

function writeCollapsed(value: boolean) {
  try { localStorage.setItem(collapsedKey, String(value)) } catch { /* the preference is a convenience only */ }
}

/** Shows the label as a tooltip only while the sidebar is collapsed to icons. */
function CollapsedTip({ collapsed, title, children }: { collapsed: boolean; title: string; children: ReactNode }) {
  return collapsed ? <Tooltip placement="right" title={title}><Box>{children}</Box></Tooltip> : <>{children}</>
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
  workspacesAvailable = false,
}: ProjectSidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const workspacesRoute = location.pathname === '/workspaces'
  const dashboardSelected = selectedProjectId === null && !workspacesRoute
  const toggleCollapsed = () => setCollapsed((current) => { writeCollapsed(!current); return !current })
  const navText = collapsed ? { display: { md: 'none' } } : undefined
  // Own projects first, the ones shared with the user below their own heading.
  const visibleProjects = [
    ...projects.filter((project) => project.role === 'OWNER'),
    ...projects.filter((project) => project.role !== 'OWNER'),
  ]
  const firstSharedId = visibleProjects.find((project) => project.role !== 'OWNER')?.id ?? null

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
        // On wide screens the sidebar stays in view and scrolls on its own.
        height: { md: '100dvh' },
        position: { md: 'sticky' },
        top: { md: 0 },
        transition: 'width 180ms ease',
        width: { xs: '100%', md: collapsed ? 72 : 288 },
      }}
    >
      <Box sx={{ p: collapsed ? { xs: 2.5, md: 1.5 } : 2.5 }}>
        <Stack direction={{ xs: 'row', md: collapsed ? 'column' : 'row' }} spacing={1.25} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
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
            <Box sx={navText}>
              <Typography sx={{ fontWeight: 800, letterSpacing: -0.3 }}>
                Dev Hub
              </Typography>
              <Typography color="text.secondary" variant="caption">
                Your project memory
              </Typography>
            </Box>
          </Stack>
          <Stack direction={{ xs: 'row', md: collapsed ? 'column' : 'row' }} spacing={0.25} sx={{ alignItems: 'center' }}>
            <ColorModeToggle />
            <Tooltip placement="right" title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
              <IconButton aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!collapsed} size="small" onClick={toggleCollapsed}>
                {collapsed ? <KeyboardDoubleArrowRightRoundedIcon fontSize="small" /> : <KeyboardDoubleArrowLeftRoundedIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Box>

      {/* Collapsed on a narrow screen, only the header row remains. */}
      <Box sx={{ display: { xs: collapsed ? 'none' : 'flex', md: 'flex' }, flex: 1, flexDirection: 'column', minHeight: 0, overflowX: 'hidden', overflowY: 'auto' }}>
      <Box sx={{ px: collapsed ? { xs: 2.5, md: 1.25 } : 2.5 }}>
        {collapsed ? (
          <Box sx={{ display: { xs: 'none', md: 'block' }, textAlign: 'center' }}>
            <Tooltip placement="right" title="New project">
              <IconButton aria-label="New project" sx={{ color: 'primary.main' }} onClick={onCreateProject}>
                <AddRoundedIcon />
              </IconButton>
            </Tooltip>
          </Box>
        ) : null}
        <Button
          fullWidth
          startIcon={<AddRoundedIcon />}
          sx={(theme) => ({
            bgcolor: tint(theme, 0.08),
            borderRadius: 1,
            color: 'primary.main',
            display: collapsed ? { md: 'none' } : undefined,
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
        {[
          { label: 'Project overview', icon: <DashboardOutlinedIcon fontSize="small" sx={{ color: 'primary.main' }} />, selected: dashboardSelected && dashboardView === 'active', onClick: () => onShowDashboard('active') },
          { label: 'Archive', icon: <ArchiveOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />, selected: dashboardSelected && dashboardView === 'archived', onClick: () => onShowDashboard('archived'), count: archivedProjectCount },
          ...(workspacesAvailable ? [{ label: 'Workspaces', icon: <TerminalRoundedIcon fontSize="small" sx={{ color: 'primary.main' }} />, selected: workspacesRoute, onClick: () => navigate('/workspaces') }] : []),
          { label: 'Inbox', icon: <InboxOutlinedIcon fontSize="small" />, onClick: () => navigate('/inbox'), gap: true },
          { label: 'All notes', icon: <DescriptionOutlinedIcon fontSize="small" />, onClick: () => navigate('/notes') },
          { label: 'All ideas', icon: <LightbulbOutlinedIcon fontSize="small" />, onClick: () => navigate('/ideas') },
          { label: 'Settings', icon: <SettingsOutlinedIcon fontSize="small" />, onClick: () => navigate('/settings') },
        ].map((item) => (
          <ListItem disablePadding key={item.label} sx={{ mb: 0.5, mt: item.gap ? 1 : 0 }}>
            <CollapsedTip collapsed={collapsed} title={item.label}>
              <ListItemButton
                aria-label={collapsed ? item.label : undefined}
                selected={item.selected ?? false}
                sx={(theme) => ({
                  borderRadius: 1,
                  justifyContent: collapsed ? { md: 'center' } : undefined,
                  '&.Mui-selected': { bgcolor: tint(theme, 0.08), color: accentText(theme) },
                  '&.Mui-selected:hover': { bgcolor: tint(theme, 0.14) },
                })}
                onClick={item.onClick}
              >
                <Box sx={{ display: 'flex', mr: collapsed ? { xs: 1.25, md: 0 } : 1.25 }}>{item.icon}</Box>
                <ListItemText primary={item.label} sx={navText} />
                {item.count !== undefined ? <Chip label={item.count} size="small" sx={{ bgcolor: 'action.hover', fontWeight: 700, ...navText }} /> : null}
              </ListItemButton>
            </CollapsedTip>
          </ListItem>
        ))}
      </List>

      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', px: 2.5, pb: 1, pt: 3, ...navText }}>
        <Typography color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase' }} variant="caption">Projects</Typography>
        <Chip label={visibleProjects.length} size="small" sx={{ bgcolor: 'action.hover', fontWeight: 700 }} />
      </Stack>
      {collapsed ? <Divider sx={{ display: { xs: 'none', md: 'block' }, mx: 1.5, my: 1.5 }} /> : null}

      <List disablePadding sx={{ pb: 1, px: 1.25 }}>
        {apiState === 'loading' ? (
          <Typography color="text.secondary" sx={{ px: 1.25, py: 2, ...navText }} variant="body2">
            Loading projects...
          </Typography>
        ) : null}

        {apiState === 'error' ? (
          <Stack spacing={1} sx={{ alignItems: 'flex-start', px: 1.25, py: 2, ...navText }}>
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
          <Typography color="text.secondary" sx={{ px: 1.25, py: 2, ...navText }} variant="body2">
            Create a project to get started.
          </Typography>
        ) : null}

        {visibleProjects.map((project) => (
          <Fragment key={project.id}>
            {project.id === firstSharedId ? (
              <Typography color="text.secondary" sx={{ display: 'block', fontWeight: 700, letterSpacing: 0.8, px: 1.25, pb: 0.5, pt: 1.5, textTransform: 'uppercase', ...navText }} variant="caption">
                Shared with me
              </Typography>
            ) : null}
            <ListItem
            disablePadding
            secondaryAction={
              projectCan(project, 'editMetadata') && !collapsed ? (
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
              ) : undefined
            }
            sx={{
              mb: 0.5,
              '&:hover .project-actions, &:focus-within .project-actions': {
                opacity: 1,
                transform: 'translateX(0)',
              },
            }}
          >
            <CollapsedTip collapsed={collapsed} title={project.name}>
            <ListItemButton
              aria-label={collapsed ? project.name : undefined}
              selected={project.id === selectedProjectId}
              sx={(theme) => ({
                borderRadius: 1,
                justifyContent: collapsed ? { md: 'center' } : undefined,
                pr: projectCan(project, 'editMetadata') && !collapsed ? 11 : 1.5,
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
                  mr: collapsed ? { xs: 1.25, md: 0 } : 1.25,
                  width: 30,
                }}
              >
                {projectInitial(project.name)}
              </Avatar>
              <ListItemText
                sx={navText}
                primary={project.name}
                secondary={project.role === 'OWNER' ? project.description || 'No description' : `Shared by ${project.ownerName} - ${roleLabel(project.role)}`}
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
            </CollapsedTip>
            </ListItem>
          </Fragment>
        ))}
      </List>
      </Box>

      <Divider />
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: collapsed ? { md: 'center' } : undefined, p: 2.5 }}>
        <Box
          sx={{
            bgcolor: apiState === 'error' ? 'error.main' : 'success.main',
            borderRadius: '50%',
            height: 8,
            width: 8,
          }}
        />
        <Typography color="text.secondary" sx={navText} variant="caption">
          {apiState === 'error' ? 'API unavailable' : 'API connected'}
        </Typography>
      </Stack>
    </Paper>
  )
}
