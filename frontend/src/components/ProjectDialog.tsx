import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import FolderOpenRoundedIcon from '@mui/icons-material/FolderOpenRounded'
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { api } from '../api'
import { RepositoryPickerDialog } from './RepositoryPickerDialog'
import type { Project, ProjectInput, ProjectLinkInput, RepositoryProvider } from '../types'

interface ProjectDialogProps {
  open: boolean
  project: Project | null
  saving: boolean
  onClose: () => void
  onSubmit: (input: ProjectInput) => Promise<void>
}

export function ProjectDialog({
  open,
  project,
  saving,
  onClose,
  onSubmit,
}: ProjectDialogProps) {
  const [name, setName] = useState(project?.name ?? '')
  const [description, setDescription] = useState(project?.description ?? '')
  const [repositoryUrl, setRepositoryUrl] = useState(project?.repositoryUrl ?? '')
  const [deploymentUrl, setDeploymentUrl] = useState(project?.deploymentUrl ?? '')
  const [links, setLinks] = useState<ProjectLinkInput[]>(
    project?.links.map(({ label, url }) => ({ label, url })) ?? [],
  )
  const [pickerOpen, setPickerOpen] = useState(false)
  const [connectedProviders, setConnectedProviders] = useState<RepositoryProvider[]>([])

  useEffect(() => {
    if (!open) {
      return
    }

    let active = true
    api.gitCredentials
      .list()
      .then((overview) => {
        if (active) {
          setConnectedProviders(
            overview.credentials
              .filter((credential) => credential.status === 'VERIFIED')
              .map((credential) => credential.provider),
          )
        }
      })
      // Without a stored token the dialog simply keeps the plain URL field.
      .catch(() => {
        if (active) {
          setConnectedProviders([])
        }
      })

    return () => {
      active = false
    }
  }, [open])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void onSubmit({
      name,
      description,
      repositoryUrl,
      deploymentUrl,
      links: links.filter((link) => link.label.trim() || link.url.trim()),
    })
  }

  function updateLink(index: number, field: keyof ProjectLinkInput, value: string) {
    setLinks((current) => current.map((link, linkIndex) => (
      linkIndex === index ? { ...link, [field]: value } : link
    )))
  }

  return (
    <>
    <Dialog fullWidth maxWidth="sm" open={open} onClose={saving ? undefined : onClose}>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogTitle>{project ? 'Edit project' : 'Create a project'}</DialogTitle>
        <DialogContent dividers>
          <TextField
            autoFocus
            fullWidth
            label="Project name"
            margin="normal"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <TextField
            fullWidth
            label="Description"
            margin="normal"
            minRows={3}
            multiline
            placeholder="What are you working on?"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ alignItems: 'flex-start', mt: 2 }}>
            <TextField
              fullWidth
              label="Repository URL"
              placeholder="https://github.com/you/project"
              type="url"
              value={repositoryUrl}
              onChange={(event) => setRepositoryUrl(event.target.value)}
            />
            <Button
              disabled={connectedProviders.length === 0}
              startIcon={<FolderOpenRoundedIcon />}
              sx={{ flexShrink: 0, mt: { sm: 1 } }}
              onClick={() => setPickerOpen(true)}
            >
              Choose
            </Button>
          </Stack>
          {connectedProviders.length === 0 ? (
            <Typography color="text.secondary" sx={{ display: 'block', mt: 0.5 }} variant="caption">
              Connect a token under <RouterLink to="/settings">Settings</RouterLink> to pick from your private
              repositories instead of pasting a URL.
            </Typography>
          ) : null}
          <TextField
            fullWidth
            label="Deployment URL"
            margin="normal"
            placeholder="https://project.example.com"
            type="url"
            value={deploymentUrl}
            onChange={(event) => setDeploymentUrl(event.target.value)}
          />
          <Stack spacing={1.25} sx={{ mt: 2.5 }}>
            {links.map((link, index) => (
              <Stack key={index} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <TextField
                  label="Link label"
                  size="small"
                  value={link.label}
                  onChange={(event) => updateLink(index, 'label', event.target.value)}
                />
                <TextField
                  fullWidth
                  label="URL"
                  size="small"
                  type="url"
                  value={link.url}
                  onChange={(event) => updateLink(index, 'url', event.target.value)}
                />
                <IconButton
                  aria-label={`Remove link ${index + 1}`}
                  color="error"
                  onClick={() => setLinks((current) => current.filter((_, linkIndex) => linkIndex !== index))}
                >
                  <DeleteOutlineRoundedIcon fontSize="small" />
                </IconButton>
              </Stack>
            ))}
            <Button
              startIcon={<AddRoundedIcon />}
              sx={{ alignSelf: 'flex-start' }}
              onClick={() => setLinks((current) => [...current, { label: '', url: '' }])}
            >
              Add link
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button disabled={saving} onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={saving || !name.trim()}
            startIcon={saving ? <CircularProgress size={16} /> : null}
            type="submit"
            variant="contained"
          >
            {project ? 'Save changes' : 'Create project'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
    <RepositoryPickerDialog
      connectedProviders={connectedProviders}
      open={pickerOpen}
      onClose={() => setPickerOpen(false)}
      onSelect={(repository) => {
        setRepositoryUrl(repository.webUrl)
        if (!name.trim()) {
          setName(repository.name)
        }
        if (!description.trim()) {
          setDescription(repository.description)
        }
        setPickerOpen(false)
      }}
    />
    </>
  )
}
