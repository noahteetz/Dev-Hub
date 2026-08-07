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
import type { CodeSnippet, CodeSnippetInput } from '../types'

interface SnippetDialogProps {
  open: boolean
  snippet: CodeSnippet | null
  saving: boolean
  onClose: () => void
  onSubmit: (input: CodeSnippetInput) => Promise<void>
}

export function SnippetDialog({
  open,
  snippet,
  saving,
  onClose,
  onSubmit,
}: SnippetDialogProps) {
  const [title, setTitle] = useState(snippet?.title ?? '')
  const [language, setLanguage] = useState(snippet?.language ?? 'text')
  const [code, setCode] = useState(snippet?.code ?? '')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void onSubmit({ title, language, code })
  }

  return (
    <Dialog fullWidth maxWidth="md" open={open} onClose={saving ? undefined : onClose}>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogTitle>{snippet ? 'Edit code snippet' : 'Add a code snippet'}</DialogTitle>
        <DialogContent dividers>
          <Box
            sx={{
              display: 'grid',
              gap: 1,
              gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) 180px' },
            }}
          >
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
              label="Language"
              margin="normal"
              placeholder="text"
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
            />
          </Box>
          <TextField
            fullWidth
            label="Code"
            margin="normal"
            minRows={12}
            multiline
            placeholder="Paste a useful command or code block..."
            required
            slotProps={{
              input: {
                sx: {
                  fontFamily: '"ui-monospace", "SFMono-Regular", Consolas, monospace',
                  fontSize: 14,
                },
              },
            }}
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button disabled={saving} onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={saving || !title.trim() || !code.trim()}
            startIcon={saving ? <CircularProgress size={16} /> : null}
            type="submit"
            variant="contained"
          >
            {snippet ? 'Save changes' : 'Add snippet'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
