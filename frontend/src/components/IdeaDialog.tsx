import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material'
import type { Idea, IdeaInput } from '../types'

interface IdeaDialogProps {
  open: boolean
  idea: Idea | null
  tagOptions: string[]
  saving: boolean
  onClose: () => void
  onSubmit: (input: IdeaInput) => Promise<void>
}

export function IdeaDialog({
  open,
  idea,
  tagOptions,
  saving,
  onClose,
  onSubmit,
}: IdeaDialogProps) {
  const [title, setTitle] = useState(idea?.title ?? '')
  const [content, setContent] = useState(idea?.content ?? '')
  const [tags, setTags] = useState(idea?.tags.map((tag) => tag.name) ?? [])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void onSubmit({ title, content, tags })
  }

  return (
    <Dialog fullWidth maxWidth="sm" open={open} onClose={saving ? undefined : onClose}>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogTitle>{idea ? 'Edit idea' : 'Capture an idea'}</DialogTitle>
        <DialogContent dividers>
          <TextField
            autoFocus
            fullWidth
            label="Title"
            margin="normal"
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <TextField
            fullWidth
            label="Details"
            margin="normal"
            minRows={6}
            multiline
            placeholder="What could be useful to build, improve, or explore?"
            value={content}
            onChange={(event) => setContent(event.target.value)}
          />
          <Autocomplete
            freeSolo
            multiple
            options={tagOptions}
            renderInput={(params) => <TextField {...params} label="Tags" margin="normal" placeholder="Add a tag" />}
            value={tags}
            onChange={(_, values) => setTags(values.map((tag) => tag.trim()).filter(Boolean))}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button disabled={saving} onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={saving || !title.trim()}
            startIcon={saving ? <CircularProgress size={16} /> : null}
            type="submit"
            variant="contained"
          >
            {idea ? 'Save changes' : 'Add idea'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}