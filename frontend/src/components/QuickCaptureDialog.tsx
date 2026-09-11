import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material'
import { useMemo, useState } from 'react'
import type { CaptureInput, ContentEntry, ContentType } from '../types'

const emptyInput: CaptureInput = {
  type: 'NOTE',
  title: '',
  content: '',
  tags: [],
  sourceUrl: '',
  language: 'text',
}

function entryInput(entry: ContentEntry): CaptureInput {
  return {
    type: entry.type,
    title: entry.title,
    content: entry.content,
    tags: entry.tags.map((tag) => tag.name),
    sourceUrl: entry.sourceUrl,
    language: entry.language || 'text',
  }
}

interface QuickCaptureDialogProps {
  open: boolean
  entry?: ContentEntry | null
  saving: boolean
  error?: string
  onClose: () => void
  onSubmit: (input: CaptureInput, keepOpen: boolean) => Promise<void> | void
}

export function QuickCaptureDialog({ open, entry = null, saving, error, onClose, onSubmit }: QuickCaptureDialogProps) {
  const initialInput = entry ? entryInput(entry) : emptyInput
  const [input, setInput] = useState<CaptureInput>(initialInput)
  const [tagText, setTagText] = useState(initialInput.tags.join(', '))
  const [keepOpen, setKeepOpen] = useState(false)

  const detectedUrl = useMemo(() => input.content.match(/https?:\/\/[^\s]+/)?.[0] ?? '', [input.content])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!input.title.trim()) return
    await onSubmit({ ...input, title: input.title.trim(), tags: tagText.split(',').map((tag) => tag.trim()).filter(Boolean) }, keepOpen)
    if (!entry && keepOpen) {
      setInput((current) => ({ ...emptyInput, type: current.type }))
      setTagText('')
    }
  }

  return (
    <Dialog fullWidth maxWidth="sm" open={open} onClose={saving ? undefined : onClose}>
      <form onSubmit={submit}>
        <DialogTitle>{entry ? 'Edit entry' : 'Quick capture'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error ? <Alert severity="error">{error}</Alert> : null}
            <TextField disabled={Boolean(entry)} select label="Type" value={input.type} onChange={(event) => setInput((current) => ({ ...current, type: event.target.value as ContentType }))}>
              <MenuItem value="NOTE">Note</MenuItem><MenuItem value="IDEA">Idea</MenuItem><MenuItem value="SNIPPET">Snippet</MenuItem><MenuItem value="TODO">Todo</MenuItem>
            </TextField>
            <TextField autoFocus required label="Title" value={input.title} onChange={(event) => setInput((current) => ({ ...current, title: event.target.value }))} />
            <TextField label={input.type === 'SNIPPET' ? 'Code' : 'Content'} minRows={5} multiline value={input.content} onChange={(event) => setInput((current) => ({ ...current, content: event.target.value }))} />
            {input.type === 'SNIPPET' ? <TextField label="Language" value={input.language} onChange={(event) => setInput((current) => ({ ...current, language: event.target.value }))} /> : null}
            <TextField helperText="Separate tags with commas" label="Tags" value={tagText} onChange={(event) => setTagText(event.target.value)} />
            {input.type === 'NOTE' || input.type === 'IDEA' ? <TextField label="Source URL" value={input.sourceUrl} onChange={(event) => setInput((current) => ({ ...current, sourceUrl: event.target.value }))} /> : null}
            {detectedUrl && !input.sourceUrl && (input.type === 'NOTE' || input.type === 'IDEA') ? <Button sx={{ alignSelf: 'flex-start' }} onClick={() => setInput((current) => ({ ...current, sourceUrl: detectedUrl }))}>Use detected URL</Button> : null}
            {!entry ? <FormControlLabel control={<Checkbox checked={keepOpen} onChange={(event) => setKeepOpen(event.target.checked)} />} label="Keep open after saving" /> : null}
          </Stack>
        </DialogContent>
        <DialogActions><Button disabled={saving} onClick={onClose}>Cancel</Button><Button disabled={saving || !input.title.trim()} type="submit" variant="contained">{saving ? 'Saving…' : entry ? 'Save changes' : 'Capture'}</Button></DialogActions>
      </form>
    </Dialog>
  )
}
