import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material'
import type { Project, ProjectInput } from '../types'

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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void onSubmit({ name, description })
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
