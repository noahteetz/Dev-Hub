import AddRoundedIcon from '@mui/icons-material/AddRounded'
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined'
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded'
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded'
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined'
import RestoreFromTrashOutlinedIcon from '@mui/icons-material/RestoreFromTrashOutlined'
import StarBorderRoundedIcon from '@mui/icons-material/StarBorderRounded'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import type { Project, ProjectOrganizationInput, ProjectStatus } from '../types'
import { formatDate } from '../utils/formatDate'
import { EmptyState } from './EmptyState'

export type DashboardView = 'active' | 'archived'

interface ProjectDashboardProps {
  activeProjects: Project[]
  archivedProjects: Project[]
  view: DashboardView
  onViewChange: (view: DashboardView) => void
  onSelectProject: (projectId: number) => void
  onCreateProject: () => void
  onArchiveProject: (project: Project) => void
  onRestoreProject: (project: Project) => void
  onUpdateOrganization: (projectId: number, input: ProjectOrganizationInput) => void
}

const statusLabels: Record<ProjectStatus, string> = {
  PLANNED: 'Planned',
  ACTIVE: 'Active',
  PAUSED: 'Paused',
  ARCHIVED: 'Archived',
}

const statusColors: Record<ProjectStatus, 'default' | 'info' | 'success' | 'warning'> = {
  PLANNED: 'info',
  ACTIVE: 'success',
  PAUSED: 'warning',
  ARCHIVED: 'default',
}

type StatusFilter = ProjectStatus | 'ALL'
type SortOrder = 'activity' | 'priority' | 'name'

function ProjectCard({
  project,
  archived,
  onSelect,
  onArchive,
  onRestore,
  onUpdateOrganization,
}: {
  project: Project
  archived: boolean
  onSelect: () => void
  onArchive: () => void
  onRestore: () => void
  onUpdateOrganization: (input: ProjectOrganizationInput) => void
}) {
  function toggleFavorite(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    onUpdateOrganization({ favorite: !project.favorite })
  }

  function setActive(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    onUpdateOrganization({ status: 'ACTIVE' })
  }

  return (
    <Card
      elevation={0}
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        cursor: 'pointer',
        transition: 'border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease',
        '&:hover': {
          borderColor: 'primary.light',
          boxShadow: '0 14px 30px rgba(30, 42, 80, 0.1)',
          transform: 'translateY(-2px)',
        },
      }}
      onClick={onSelect}
    >
      <CardContent sx={{ p: 2.25, '&:last-child': { pb: 2.25 } }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}>
              <Typography noWrap sx={{ fontWeight: 800 }}>{project.name}</Typography>
              <Chip color={statusColors[project.status]} label={statusLabels[project.status]} size="small" />
              {project.stale && !archived ? <Chip color="warning" label="Stale" size="small" variant="outlined" /> : null}
            </Stack>
            <Typography color="text.secondary" noWrap sx={{ mt: 0.75 }} variant="body2">
              {project.description || 'No description yet'}
            </Typography>
          </Box>
          <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0 }}>
            {!archived ? (
              <Tooltip title={project.favorite ? 'Remove favorite' : 'Add favorite'}>
                <IconButton aria-label={project.favorite ? `Remove ${project.name} from favorites` : `Favorite ${project.name}`} size="small" onClick={toggleFavorite}>
                  {project.favorite ? <FavoriteRoundedIcon color="error" fontSize="small" /> : <FavoriteBorderRoundedIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
            ) : null}
            <Tooltip title={archived ? 'Restore project' : 'Archive project'}>
              <IconButton
                aria-label={archived ? `Restore ${project.name}` : `Archive ${project.name}`}
                color={archived ? 'primary' : 'default'}
                size="small"
                onClick={(event) => {
                  event.stopPropagation()
                  if (archived) {
                    onRestore()
                  } else {
                    onArchive()
                  }
                }}
              >
                {archived ? <RestoreFromTrashOutlinedIcon fontSize="small" /> : <ArchiveOutlinedIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.75, mt: 2 }}>
          <FormControl size="small" sx={{ minWidth: 108 }} onClick={(event) => event.stopPropagation()}>
            <Select
              aria-label={`Set status for ${project.name}`}
              sx={{ fontSize: 12, height: 30 }}
              value={project.status}
              variant="standard"
              onChange={(event) => onUpdateOrganization({ status: event.target.value as ProjectStatus })}
            >
              <MenuItem value="ACTIVE">Active</MenuItem>
              <MenuItem value="PLANNED">Planned</MenuItem>
              <MenuItem value="PAUSED">Paused</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 102 }} onClick={(event) => event.stopPropagation()}>
            <Select
              aria-label={`Set priority for ${project.name}`}
              sx={{ fontSize: 12, height: 30 }}
              value={project.priority}
              variant="standard"
              onChange={(event) => onUpdateOrganization({ priority: Number(event.target.value) })}
            >
              <MenuItem value={0}>Priority 0</MenuItem>
              <MenuItem value={1}>Priority 1</MenuItem>
              <MenuItem value={2}>Priority 2</MenuItem>
              <MenuItem value={3}>Priority 3</MenuItem>
            </Select>
          </FormControl>
          <Chip icon={<StarBorderRoundedIcon />} label="Organize" size="small" sx={{ bgcolor: 'action.hover' }} />
          <Typography color="text.disabled" variant="caption">
            Updated {formatDate(project.effectiveActivityAt)}
          </Typography>
        </Stack>

        <Box sx={{ mt: 2 }}>
          <Typography color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.35, textTransform: 'uppercase' }} variant="caption">
            Next step
          </Typography>
          <Typography sx={{ mt: 0.5 }} variant="body2">
            {project.nextStep || 'Capture the next useful step'}
          </Typography>
        </Box>

        {archived ? (
          <Typography color="text.secondary" sx={{ mt: 1.5 }} variant="caption">
            Archived {project.archivedAt ? formatDate(project.archivedAt) : 'without a date'}
            {project.archiveReason ? ` - ${project.archiveReason}` : ''}
          </Typography>
        ) : project.status !== 'ACTIVE' ? (
          <Button
            size="small"
            sx={{ mt: 1.5, px: 0.5 }}
            onClick={setActive}
          >
            Mark active
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}

function Metric({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <Box sx={{ bgcolor: 'rgba(255, 255, 255, 0.72)', borderLeft: `3px solid ${accent ?? '#5b61e8'}`, borderRadius: 1, p: 2 }}>
      <Typography sx={{ fontWeight: 850 }} variant="h5">{value}</Typography>
      <Typography color="text.secondary" variant="caption">{label}</Typography>
    </Box>
  )
}

export function ProjectDashboard({
  activeProjects,
  archivedProjects,
  view,
  onViewChange,
  onSelectProject,
  onCreateProject,
  onArchiveProject,
  onRestoreProject,
  onUpdateOrganization,
}: ProjectDashboardProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [sortOrder, setSortOrder] = useState<SortOrder>('activity')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const projects = view === 'active' ? activeProjects : archivedProjects
  const activeRegularProjects = activeProjects

  const displayedProjects = useMemo(() => {
    const filtered = projects.filter((project) => {
      if (view === 'active' && statusFilter !== 'ALL' && project.status !== statusFilter) {
        return false
      }
      return view !== 'active' || !favoritesOnly || project.favorite
    })

    return [...filtered].sort((left, right) => {
      if (sortOrder === 'name') {
        return left.name.localeCompare(right.name)
      }
      if (sortOrder === 'priority') {
        return right.priority - left.priority || left.name.localeCompare(right.name)
      }
      return new Date(right.effectiveActivityAt).getTime() - new Date(left.effectiveActivityAt).getTime()
    })
  }, [favoritesOnly, projects, sortOrder, statusFilter, view])

  return (
    <Box component="main" sx={{ flex: 1, minWidth: 0 }}>
      <Box sx={{ mx: 'auto', maxWidth: 1180, p: { xs: 2, sm: 3.5, lg: 5 } }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', pb: 3.5 }}>
          <Box>
            <Typography color="primary.main" sx={{ fontWeight: 800, letterSpacing: 1.1, textTransform: 'uppercase' }} variant="overline">
              Project cockpit
            </Typography>
            <Typography component="h1" sx={{ fontWeight: 850, letterSpacing: -1, mt: 0.5 }} variant="h3">
              Keep the work findable
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.75, maxWidth: 600 }}>
              A compact view of what is moving, what is waiting, and where to resume.
            </Typography>
          </Box>
          <Button startIcon={<AddRoundedIcon />} variant="contained" onClick={onCreateProject}>
            New project
          </Button>
        </Stack>

        <Tabs
          value={view}
          sx={{ borderBottom: 1, borderColor: 'divider', mb: 3, minHeight: 48, '& .MuiTab-root': { minHeight: 48 } }}
          onChange={(_, value: DashboardView) => onViewChange(value)}
        >
          <Tab label={`Active projects ${activeRegularProjects.length}`} value="active" />
          <Tab label={`Archive ${archivedProjects.length}`} value="archived" />
        </Tabs>

        {view === 'active' ? (
          <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(4, minmax(0, 1fr))' }, mb: 3 }}>
            <Metric accent="#2e7d32" label="Active" value={activeRegularProjects.filter((project) => project.status === 'ACTIVE').length} />
            <Metric accent="#5b61e8" label="Favorites" value={activeRegularProjects.filter((project) => project.favorite).length} />
            <Metric accent="#ed6c02" label="Stale" value={activeRegularProjects.filter((project) => project.stale).length} />
            <Metric accent="#0288d1" label="Planned / paused" value={activeRegularProjects.filter((project) => project.status !== 'ACTIVE').length} />
          </Box>
        ) : null}

        {view === 'active' ? (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { xs: 'stretch', sm: 'center' }, mb: 2.5 }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel id="dashboard-status-label">Status</InputLabel>
              <Select
                label="Status"
                labelId="dashboard-status-label"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              >
                <MenuItem value="ALL">All statuses</MenuItem>
                <MenuItem value="ACTIVE">Active</MenuItem>
                <MenuItem value="PLANNED">Planned</MenuItem>
                <MenuItem value="PAUSED">Paused</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel id="dashboard-sort-label">Sort by</InputLabel>
              <Select
                label="Sort by"
                labelId="dashboard-sort-label"
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value as SortOrder)}
              >
                <MenuItem value="activity">Recent activity</MenuItem>
                <MenuItem value="priority">Priority</MenuItem>
                <MenuItem value="name">Name</MenuItem>
              </Select>
            </FormControl>
            <Button
              color={favoritesOnly ? 'primary' : 'inherit'}
              startIcon={favoritesOnly ? <FavoriteRoundedIcon /> : <FavoriteBorderRoundedIcon />}
              variant={favoritesOnly ? 'contained' : 'outlined'}
              onClick={() => setFavoritesOnly((current) => !current)}
            >
              Favorites only
            </Button>
          </Stack>
        ) : null}

        {displayedProjects.length === 0 ? (
          <EmptyState
            actionLabel={view === 'active' ? 'Create a project' : undefined}
            description={view === 'active' ? 'Start with the project you want to find quickly next time.' : 'Archived projects will stay available here until you restore them.'}
            icon={<FolderOpenOutlinedIcon sx={{ color: 'primary.main', fontSize: 42 }} />}
            onAction={view === 'active' ? onCreateProject : undefined}
            title={view === 'active' ? 'No projects match' : 'The archive is empty'}
          />
        ) : (
          <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' } }}>
            {displayedProjects.map((project) => (
              <ProjectCard
                key={project.id}
                archived={view === 'archived'}
                onArchive={() => onArchiveProject(project)}
                onRestore={() => onRestoreProject(project)}
                onSelect={() => onSelectProject(project.id)}
                onUpdateOrganization={(input) => onUpdateOrganization(project.id, input)}
                project={project}
              />
            ))}
          </Box>
        )}
      </Box>
    </Box>
  )
}
