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
import type { Todo, TodoInput } from '../types'

interface TodoDialogProps {
  open: boolean
  todo: Todo | null
  tagOptions: string[]
  saving: boolean
  onClose: () => void
  onSubmit: (input: TodoInput) => Promise<void>
}

export function TodoDialog({
  open,
  todo,
  tagOptions,
  saving,
  onClose,
  onSubmit,
}: TodoDialogProps) {
  const [title, setTitle] = useState(todo?.title ?? '')
  const [content, setContent] = useState(todo?.content ?? '')
  const [tags, setTags] = useState(todo?.tags.map((tag) => tag.name) ?? [])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void onSubmit({ title, content, tags })
  }

  return (
    <Dialog fullWidth maxWidth="sm" open={open} onClose={saving ? undefined : onClose}>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogTitle>{todo ? 'Edit todo' : 'Add a todo'}</DialogTitle>
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
            placeholder="Describe the work that needs doing..."
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
            {todo ? 'Save changes' : 'Add todo'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}