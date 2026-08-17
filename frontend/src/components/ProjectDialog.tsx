import { useState } from 'react'
import type { FormEvent } from 'react'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
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
} from '@mui/material'
import type { Project, ProjectInput, ProjectLinkInput } from '../types'

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
          <TextField
            fullWidth
            label="Repository URL"
            margin="normal"
            placeholder="https://github.com/you/project"
            type="url"
            value={repositoryUrl}
            onChange={(event) => setRepositoryUrl(event.target.value)}
          />
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
  )
}
