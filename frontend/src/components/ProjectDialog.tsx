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
  const [additionalRepositoryUrls, setAdditionalRepositoryUrls] = useState<string[]>(project?.additionalRepositoryUrls ?? [])
  const [pickerTarget, setPickerTarget] = useState<number | null>(null)
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
      additionalRepositoryUrls: additionalRepositoryUrls.map(url => url.trim()).filter(Boolean),
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
              onClick={() => { setPickerTarget(null); setPickerOpen(true) }}
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
          <Typography color="text.secondary" variant="caption" sx={{ display: 'block', mt: 1 }}>
            The main repository supplies project activity and uses the workspace branch you choose.
          </Typography>
          <Stack spacing={1.25} sx={{ mt: 2 }}>
            {additionalRepositoryUrls.map((url, index) => (
              <Stack key={index} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <TextField
                  fullWidth
                  label={`Additional repository ${index + 1}`}
                  placeholder="https://github.com/you/docs"
                  required
                  type="url"
                  size="small"
                  value={url}
                  onChange={event => setAdditionalRepositoryUrls(current => current.map((value, i) => i === index ? event.target.value : value))}
                />
                <IconButton
                  aria-label={`Choose additional repository ${index + 1}`}
                  disabled={connectedProviders.length === 0}
                  onClick={() => { setPickerTarget(index); setPickerOpen(true) }}
                ><FolderOpenRoundedIcon fontSize="small" /></IconButton>
                <IconButton
                  aria-label={`Remove repository ${index + 1}`}
                  color="error"
                  onClick={() => setAdditionalRepositoryUrls(current => current.filter((_, i) => i !== index))}
                ><DeleteOutlineRoundedIcon fontSize="small" /></IconButton>
              </Stack>
            ))}
            <Button
              startIcon={<AddRoundedIcon />}
              disabled={!repositoryUrl.trim() || additionalRepositoryUrls.length >= 9}
              sx={{ alignSelf: 'flex-start' }}
              onClick={() => setAdditionalRepositoryUrls(current => [...current, ''])}
            >Add repository</Button>
            <Typography color="text.secondary" variant="caption">
              New workspaces check out all repositories in separate folders. Additional repositories start on their default branch.
              Repository changes apply to new workspaces.
            </Typography>
          </Stack>
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
            disabled={saving || !name.trim() || (additionalRepositoryUrls.length > 0 && !repositoryUrl.trim())}
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
        if (pickerTarget !== null) {
          setAdditionalRepositoryUrls(current => current.map((url, index) => index === pickerTarget ? repository.webUrl : url))
          setPickerOpen(false)
          return
        }
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
