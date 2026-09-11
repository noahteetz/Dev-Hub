import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import type { ContentEntry } from '../types'

export type SnippetInsertMode = 'copy' | 'reference'

interface SnippetPickerDialogProps {
  open: boolean
  snippets: ContentEntry[]
  onClose: () => void
  onInsert: (snippet: ContentEntry, mode: SnippetInsertMode) => void
}

/**
 * Picks a snippet for a note. A copy stays stable in the text, a reference keeps showing the
 * current snippet; both forms remain valid side by side.
 */
export function SnippetPickerDialog({ open, snippets, onClose, onInsert }: SnippetPickerDialogProps) {
  const [filter, setFilter] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const visible = useMemo(
    () =>
      snippets.filter((snippet) =>
        `${snippet.title} ${snippet.language}`.toLowerCase().includes(filter.trim().toLowerCase()),
      ),
    [filter, snippets],
  )
  const selected = visible.find((snippet) => snippet.id === selectedId) ?? null

  return (
    <Dialog fullWidth maxWidth="sm" open={open} onClose={onClose}>
      <DialogTitle>Insert snippet</DialogTitle>
      <DialogContent dividers>
        <TextField
          autoFocus
          fullWidth
          label="Filter snippets"
          margin="dense"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
        {visible.length ? (
          <List dense sx={{ maxHeight: 320, overflowY: 'auto' }}>
            {visible.map((snippet) => (
              <ListItem disablePadding key={snippet.id}>
                <ListItemButton selected={snippet.id === selectedId} onClick={() => setSelectedId(snippet.id)}>
                  <ListItemText
                    primary={snippet.title}
                    secondary={`${snippet.language || 'text'} · ${snippet.content.split('\n')[0].slice(0, 60)}`}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography color="text.secondary" sx={{ py: 3 }}>
            No snippet matches. Capture one first, then insert it here.
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Stack direction="row" spacing={1}>
          <Button disabled={!selected} onClick={() => selected && onInsert(selected, 'reference')}>
            Insert as live reference
          </Button>
          <Button disabled={!selected} variant="contained" onClick={() => selected && onInsert(selected, 'copy')}>
            Insert as code block
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  )
}
