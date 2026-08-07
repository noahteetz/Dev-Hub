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
import type { Note, NoteInput } from '../types'

interface NoteDialogProps {
  open: boolean
  note: Note | null
  saving: boolean
  onClose: () => void
  onSubmit: (input: NoteInput) => Promise<void>
}

export function NoteDialog({
  open,
  note,
  saving,
  onClose,
  onSubmit,
}: NoteDialogProps) {
  const [title, setTitle] = useState(note?.title ?? '')
  const [content, setContent] = useState(note?.content ?? '')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void onSubmit({ title, content })
  }

  return (
    <Dialog fullWidth maxWidth="sm" open={open} onClose={saving ? undefined : onClose}>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogTitle>{note ? 'Edit note' : 'Add a note'}</DialogTitle>
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
            label="Note"
            margin="normal"
            minRows={7}
            multiline
            placeholder="Capture an idea, decision, or useful detail..."
            required
            value={content}
            onChange={(event) => setContent(event.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button disabled={saving} onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={saving || !title.trim() || !content.trim()}
            startIcon={saving ? <CircularProgress size={16} /> : null}
            type="submit"
            variant="contained"
          >
            {note ? 'Save changes' : 'Add note'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
