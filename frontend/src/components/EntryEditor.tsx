import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import CheckBoxOutlinedIcon from '@mui/icons-material/CheckBoxOutlined'
import CodeRoundedIcon from '@mui/icons-material/CodeRounded'
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded'
import FormatBoldRoundedIcon from '@mui/icons-material/FormatBoldRounded'
import FormatListBulletedRoundedIcon from '@mui/icons-material/FormatListBulletedRounded'
import InsertLinkRoundedIcon from '@mui/icons-material/InsertLinkRounded'
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined'
import TitleRoundedIcon from '@mui/icons-material/TitleRounded'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, ConflictError } from '../api'
import { EntryReferences } from './EntryReferences'
import { MarkdownView } from './MarkdownView'
import { SnippetPickerDialog, type SnippetInsertMode } from './SnippetPickerDialog'
import type { ContentEntry, ContentType, Project } from '../types'

const AUTOSAVE_DELAY_MS = 1200

type SaveStatus = 'clean' | 'saving' | 'saved' | 'error'

type Format = 'heading' | 'bold' | 'list' | 'checkbox' | 'link' | 'table' | 'code'

interface EntryEditorProps {
  type: ContentType
  entryId: number
  projects: Project[]
  onChanged: () => void
}

interface Draft {
  title: string
  content: string
  savedAt: string
}

function draftKey(type: ContentType, entryId: number) {
  return `devhub.draft.${type}.${entryId}`
}

function readDraft(type: ContentType, entryId: number): Draft | null {
  try {
    const stored = localStorage.getItem(draftKey(type, entryId))
    return stored ? (JSON.parse(stored) as Draft) : null
  } catch {
    return null
  }
}

function formatSelection(format: Format, selected: string) {
  const lines = selected ? selected.split('\n') : ['']
  switch (format) {
    case 'heading':
      return `## ${selected || 'Heading'}`
    case 'bold':
      return `**${selected || 'bold text'}**`
    case 'list':
      return lines.map((line) => `- ${line}`).join('\n')
    case 'checkbox':
      return lines.map((line) => `- [ ] ${line}`).join('\n')
    case 'link':
      return `[${selected || 'label'}](https://)`
    case 'table':
      return `\n| Column | Column |\n| --- | --- |\n| ${selected || 'Value'} | Value |\n`
    case 'code':
      return `\n\`\`\`\n${selected || 'code'}\n\`\`\`\n`
  }
}

function timeLabel(value: Date) {
  return value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/**
 * The editor view behind the permanent address of an entry: Markdown with live preview,
 * autosave, a visible save state, a local draft and an explicit conflict decision.
 */
export function EntryEditor({ type, entryId, projects, onChanged }: EntryEditorProps) {
  const navigate = useNavigate()
  const theme = useTheme()
  // Below the md breakpoint the editor and the preview swap places instead of sharing the width.
  const narrow = useMediaQuery(theme.breakpoints.down('md'))
  const contentRef = useRef<HTMLTextAreaElement | null>(null)
  const savingRef = useRef(false)

  const [entry, setEntry] = useState<ContentEntry | null>(null)
  const [loadError, setLoadError] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saved, setSaved] = useState({ title: '', content: '' })
  const [baseUpdatedAt, setBaseUpdatedAt] = useState<string | null>(null)
  const [status, setStatus] = useState<SaveStatus>('clean')
  const [saveError, setSaveError] = useState('')
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [conflict, setConflict] = useState<ContentEntry | null>(null)
  const [draftOffer, setDraftOffer] = useState<Draft | null>(null)
  const [snippets, setSnippets] = useState<ContentEntry[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [previewOnly, setPreviewOnly] = useState(false)
  const [narrowPane, setNarrowPane] = useState<'editor' | 'preview'>('editor')
  const [pendingLeave, setPendingLeave] = useState<string | null>(null)
  const [notice, setNotice] = useState('')

  const dirty = title !== saved.title || content !== saved.content
  const showEditor = narrow ? narrowPane === 'editor' : !previewOnly
  const showPreview = narrow ? narrowPane === 'preview' : true
  const project = useMemo(
    () => projects.find((candidate) => candidate.id === entry?.projectId) ?? null,
    [entry?.projectId, projects],
  )
  const preview = useMemo(
    () => (type === 'SNIPPET' ? `\`\`\`${entry?.language || 'text'}\n${content}\n\`\`\`` : content),
    [content, entry?.language, type],
  )

  useEffect(() => {
    let active = true
    api.content
      .get(type, entryId)
      .then((loaded) => {
        if (!active) {
          return
        }
        setEntry(loaded)
        setTitle(loaded.title)
        setContent(loaded.content)
        setSaved({ title: loaded.title, content: loaded.content })
        setBaseUpdatedAt(loaded.updatedAt)
        const draft = readDraft(type, entryId)
        if (draft && (draft.title !== loaded.title || draft.content !== loaded.content)) {
          setDraftOffer(draft)
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          setLoadError(reason instanceof Error ? reason.message : 'The entry could not be loaded.')
        }
      })

    return () => {
      active = false
    }
  }, [entryId, type])

  useEffect(() => {
    let active = true
    api.content
      .list('SNIPPET', { scope: 'all', limit: 200 })
      .then((loaded) => {
        if (active) {
          setSnippets(loaded)
        }
      })
      .catch(() => undefined)

    return () => {
      active = false
    }
  }, [])

  const save = useCallback(
    async (options: { force?: boolean } = {}) => {
      if (!entry || savingRef.current) {
        return
      }
      if (!options.force && title === saved.title && content === saved.content) {
        return
      }
      if (!title.trim()) {
        setStatus('error')
        setSaveError('A title is required before the entry can be saved.')
        return
      }

      savingRef.current = true
      setStatus('saving')
      try {
        const updated = await api.content.update(entry, {
          type: entry.type,
          title,
          content,
          tags: entry.tags.map((tag) => tag.name),
          sourceUrl: entry.sourceUrl,
          language: entry.language,
          expectedUpdatedAt: options.force ? undefined : (baseUpdatedAt ?? undefined),
        })
        setEntry(updated)
        setSaved({ title: updated.title, content: updated.content })
        setBaseUpdatedAt(updated.updatedAt)
        setLastSavedAt(new Date())
        setStatus('saved')
        setSaveError('')
        setConflict(null)
        localStorage.removeItem(draftKey(type, entryId))
        onChanged()
      } catch (reason) {
        if (reason instanceof ConflictError) {
          setConflict(reason.current)
          setStatus('error')
          setSaveError(reason.message)
        } else {
          setStatus('error')
          setSaveError(reason instanceof Error ? reason.message : 'The entry could not be saved.')
        }
      } finally {
        savingRef.current = false
      }
    },
    [baseUpdatedAt, content, entry, entryId, onChanged, saved.content, saved.title, title, type],
  )

  // Autosave runs once per typing pause; every keystroke restarts the timer.
  useEffect(() => {
    if (!dirty || conflict) {
      return
    }
    const timer = setTimeout(() => void save(), AUTOSAVE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [conflict, content, dirty, save, title])

  // A local draft survives a crash or a lost connection until the save succeeds.
  useEffect(() => {
    if (!dirty) {
      return
    }
    try {
      localStorage.setItem(draftKey(type, entryId), JSON.stringify({ title, content, savedAt: new Date().toISOString() }))
    } catch {
      // A full or blocked storage must never break typing.
    }
  }, [content, dirty, entryId, title, type])

  useEffect(() => {
    if (!dirty) {
      return
    }
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const backTarget = entry?.projectId
    ? `/projects/${entry.projectId}?tab=notes`
    : type === 'IDEA'
      ? '/ideas'
      : '/notes'

  // Browser back also counts as leaving, so it asks before the entry loses unsaved text.
  useEffect(() => {
    if (!dirty) {
      return
    }
    window.history.pushState(null, '', window.location.href)
    const onPopState = () => {
      window.history.pushState(null, '', window.location.href)
      setPendingLeave(backTarget)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [backTarget, dirty])

  function leave(target: string) {
    if (dirty) {
      setPendingLeave(target)
    } else {
      navigate(target)
    }
  }

  function applyFormat(format: Format) {
    const field = contentRef.current
    const start = field?.selectionStart ?? content.length
    const end = field?.selectionEnd ?? start
    const inserted = formatSelection(format, content.slice(start, end))
    setContent(`${content.slice(0, start)}${inserted}${content.slice(end)}`)
    requestAnimationFrame(() => {
      field?.focus()
      field?.setSelectionRange(start + inserted.length, start + inserted.length)
    })
  }

  function insertSnippet(snippet: ContentEntry, mode: SnippetInsertMode) {
    const field = contentRef.current
    const start = field?.selectionStart ?? content.length
    const inserted =
      mode === 'reference'
        ? `\n{{snippet:${snippet.id}}}\n`
        : `\n\`\`\`${snippet.language || 'text'}\n${snippet.content}\n\`\`\`\n`
    setContent(`${content.slice(0, start)}${inserted}${content.slice(start)}`)
    setPickerOpen(false)
    if (entry) {
      void api.references.create(entry.type, entry.id, 'SNIPPET', snippet.id).catch(() => undefined)
    }
  }

  async function createSnippetFromSelection() {
    const field = contentRef.current
    const start = field?.selectionStart ?? 0
    const end = field?.selectionEnd ?? 0
    const selected = content.slice(start, end).replace(/^```[a-zA-Z0-9]*\n?/, '').replace(/```$/, '').trim()
    if (!selected) {
      setNotice('Select the code first, then create a snippet from it.')
      return
    }

    try {
      const created = await api.content.capture({
        type: 'SNIPPET',
        title: `${title || 'Snippet'} – ${selected.split('\n')[0].slice(0, 40)}`,
        content: selected,
        tags: [],
        sourceUrl: '',
        language: 'text',
      })
      setSnippets((current) => [created, ...current])
      if (entry) {
        await api.references.create(entry.type, entry.id, 'SNIPPET', created.id)
      }
      setNotice(`Snippet “${created.title}” created and linked.`)
      onChanged()
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : 'The snippet could not be created.')
    }
  }

  async function copyPermanentLink() {
    const url = `${window.location.origin}/${type.toLowerCase()}s/${entryId}`
    try {
      await navigator.clipboard.writeText(url)
      setNotice('Permanent link copied.')
    } catch {
      setNotice(url)
    }
  }

  if (loadError) {
    return (
      <Box component="main" sx={{ flex: 1, p: 4 }}>
        <Alert severity="error">{loadError}</Alert>
        <Button sx={{ mt: 2 }} onClick={() => navigate('/notes')}>Back to the notes</Button>
      </Box>
    )
  }

  if (!entry) {
    return (
      <Box component="main" sx={{ alignItems: 'center', display: 'flex', flex: 1, justifyContent: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  const statusLabel =
    status === 'saving'
      ? 'Saving…'
      : status === 'error'
        ? `Error: ${saveError}`
        : dirty
          ? 'Unsaved'
          : lastSavedAt
            ? `Saved at ${timeLabel(lastSavedAt)}`
            : 'Saved'

  return (
    <Box component="main" sx={{ bgcolor: 'background.default', flex: 1, minWidth: 0, minHeight: '100vh' }}>
      <Box sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider', px: { xs: 2, md: 4 }, py: 1.5 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <IconButton aria-label="Back" onClick={() => leave(backTarget)}>
            <ArrowBackRoundedIcon />
          </IconButton>
          <Chip label={project ? project.name : 'Inbox'} size="small" variant="outlined" />
          <Chip
            color={status === 'error' ? 'error' : dirty ? 'warning' : 'success'}
            label={statusLabel}
            size="small"
            variant={status === 'saving' ? 'outlined' : 'filled'}
          />
          <Box sx={{ flex: 1 }} />
          <Button size="small" startIcon={<ContentCopyRoundedIcon />} onClick={() => void copyPermanentLink()}>
            Copy permanent link
          </Button>
          {narrow ? (
            <ToggleButtonGroup exclusive size="small" value={narrowPane} onChange={(_event, value) => value && setNarrowPane(value)}>
              <ToggleButton value="editor">Editor</ToggleButton>
              <ToggleButton value="preview">Preview</ToggleButton>
            </ToggleButtonGroup>
          ) : (
            <Button size="small" startIcon={<VisibilityOutlinedIcon />} onClick={() => setPreviewOnly((current) => !current)}>
              {previewOnly ? 'Show editor' : 'Preview only'}
            </Button>
          )}
          <Button disabled={!dirty || status === 'saving'} size="small" variant="contained" onClick={() => void save()}>
            Save now
          </Button>
        </Stack>
      </Box>

      <Box sx={{ mx: 'auto', maxWidth: 1400, p: { xs: 2, sm: 3, md: 4 } }}>
        {draftOffer ? (
          <Alert
            action={
              <Stack direction="row" spacing={1}>
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => {
                    setTitle(draftOffer.title)
                    setContent(draftOffer.content)
                    setDraftOffer(null)
                  }}
                >
                  Restore draft
                </Button>
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => {
                    localStorage.removeItem(draftKey(type, entryId))
                    setDraftOffer(null)
                  }}
                >
                  Discard
                </Button>
              </Stack>
            }
            severity="info"
            sx={{ mb: 2 }}
          >
            An unsaved draft from this browser is newer than the saved entry.
          </Alert>
        ) : null}
        {notice ? (
          <Alert severity="info" sx={{ mb: 2 }} onClose={() => setNotice('')}>
            {notice}
          </Alert>
        ) : null}
        {status === 'error' && !conflict ? (
          <Alert
            action={<Button color="inherit" size="small" onClick={() => void save()}>Retry</Button>}
            severity="error"
            sx={{ mb: 2 }}
          >
            {saveError}
          </Alert>
        ) : null}

        <TextField
          fullWidth
          label="Title"
          sx={{ mb: 2 }}
          value={title}
          onBlur={() => void save()}
          onChange={(event) => setTitle(event.target.value)}
        />

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: 'flex-start' }}>
          {showEditor ? (
            <Card sx={{ flex: 1, minWidth: 0, width: '100%' }} variant="outlined">
              <CardContent>
                <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', mb: 1 }}>
                  <Tooltip title="Heading"><IconButton aria-label="Heading" size="small" onClick={() => applyFormat('heading')}><TitleRoundedIcon fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title="Bold"><IconButton aria-label="Bold" size="small" onClick={() => applyFormat('bold')}><FormatBoldRoundedIcon fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title="List"><IconButton aria-label="List" size="small" onClick={() => applyFormat('list')}><FormatListBulletedRoundedIcon fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title="Checkbox"><IconButton aria-label="Checkbox" size="small" onClick={() => applyFormat('checkbox')}><CheckBoxOutlinedIcon fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title="Link"><IconButton aria-label="Link" size="small" onClick={() => applyFormat('link')}><InsertLinkRoundedIcon fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title="Table"><IconButton aria-label="Table" size="small" onClick={() => applyFormat('table')}><TableChartOutlinedIcon fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title="Code block"><IconButton aria-label="Code block" size="small" onClick={() => applyFormat('code')}><CodeRoundedIcon fontSize="small" /></IconButton></Tooltip>
                  <Divider flexItem orientation="vertical" sx={{ mx: 0.5 }} />
                  <Button size="small" onClick={() => setPickerOpen(true)}>Insert snippet</Button>
                  <Button size="small" onClick={() => void createSnippetFromSelection()}>Snippet from selection</Button>
                </Stack>
                <TextField
                  fullWidth
                  inputRef={contentRef}
                  label={type === 'SNIPPET' ? 'Code' : 'Markdown'}
                  minRows={18}
                  multiline
                  slotProps={{ input: { sx: { fontFamily: '"ui-monospace", "SFMono-Regular", Consolas, monospace', fontSize: 14 } } }}
                  value={content}
                  onBlur={() => void save()}
                  onChange={(event) => setContent(event.target.value)}
                />
              </CardContent>
            </Card>
          ) : null}
          {showPreview ? (
          <Card sx={{ flex: 1, minWidth: 0, width: '100%' }} variant="outlined">
            <CardContent>
              <Typography color="text.secondary" sx={{ mb: 1 }} variant="overline">Preview</Typography>
              <MarkdownView content={preview} snippets={snippets} />
            </CardContent>
          </Card>
          ) : null}
        </Stack>

        <Card sx={{ mt: 3 }} variant="outlined">
          <CardContent>
            <EntryReferences id={entryId} type={entry.type} />
          </CardContent>
        </Card>
      </Box>

      <SnippetPickerDialog
        open={pickerOpen}
        snippets={snippets}
        onClose={() => setPickerOpen(false)}
        onInsert={insertSnippet}
      />

      <Dialog fullWidth maxWidth="md" open={Boolean(conflict)} onClose={() => setConflict(null)}>
        <DialogTitle>This entry changed on the server</DialogTitle>
        <DialogContent dividers>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Your text is kept until you decide. Compare both versions and pick one.
          </Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700, mb: 1 }}>Server version</Typography>
              <Box component="pre" sx={{ bgcolor: 'action.hover', borderRadius: 1, maxHeight: 320, overflow: 'auto', p: 1.5, whiteSpace: 'pre-wrap' }}>
                {conflict?.content}
              </Box>
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700, mb: 1 }}>Your version</Typography>
              <Box component="pre" sx={{ bgcolor: 'action.hover', borderRadius: 1, maxHeight: 320, overflow: 'auto', p: 1.5, whiteSpace: 'pre-wrap' }}>
                {content}
              </Box>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setConflict(null)}>Keep editing</Button>
          <Button
            onClick={() => {
              if (!conflict) {
                return
              }
              setTitle(conflict.title)
              setContent(conflict.content)
              setSaved({ title: conflict.title, content: conflict.content })
              setBaseUpdatedAt(conflict.updatedAt)
              setEntry(conflict)
              setConflict(null)
              setStatus('saved')
              localStorage.removeItem(draftKey(type, entryId))
            }}
          >
            Take the server version
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              setBaseUpdatedAt(conflict?.updatedAt ?? null)
              setConflict(null)
              void save({ force: true })
            }}
          >
            Keep my version
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(pendingLeave)} onClose={() => setPendingLeave(null)}>
        <DialogTitle>Leave with unsaved changes?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            This entry still has unsaved text. Save it first, or leave and keep the local draft.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setPendingLeave(null)}>Stay</Button>
          <Button
            onClick={() => {
              const target = pendingLeave
              setPendingLeave(null)
              if (target) {
                navigate(target)
              }
            }}
          >
            Leave anyway
          </Button>
          <Button
            variant="contained"
            onClick={async () => {
              const target = pendingLeave
              setPendingLeave(null)
              await save()
              if (target) {
                navigate(target)
              }
            }}
          >
            Save and leave
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
