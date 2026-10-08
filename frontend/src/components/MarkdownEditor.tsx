import CheckBoxOutlinedIcon from '@mui/icons-material/CheckBoxOutlined'
import CodeRoundedIcon from '@mui/icons-material/CodeRounded'
import DataObjectRoundedIcon from '@mui/icons-material/DataObjectRounded'
import FormatBoldRoundedIcon from '@mui/icons-material/FormatBoldRounded'
import FormatItalicRoundedIcon from '@mui/icons-material/FormatItalicRounded'
import FormatListBulletedRoundedIcon from '@mui/icons-material/FormatListBulletedRounded'
import FormatListNumberedRoundedIcon from '@mui/icons-material/FormatListNumberedRounded'
import FormatQuoteRoundedIcon from '@mui/icons-material/FormatQuoteRounded'
import InsertLinkRoundedIcon from '@mui/icons-material/InsertLinkRounded'
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined'
import TitleRoundedIcon from '@mui/icons-material/TitleRounded'
import { Box, Button, IconButton, Stack, TextField, Tooltip, Typography } from '@mui/material'
import { useId, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode, RefObject } from 'react'
import type { ContentEntry } from '../types'
import { formatMarkdown } from '../utils/markdownEditing'
import type { MarkdownFormat } from '../utils/markdownEditing'
import { MarkdownView } from './MarkdownView'

const tools = [
  { format: 'heading', label: 'Heading', icon: TitleRoundedIcon },
  { format: 'bold', label: 'Bold', shortcut: 'Ctrl/⌘ B', icon: FormatBoldRoundedIcon },
  { format: 'italic', label: 'Italic', shortcut: 'Ctrl/⌘ I', icon: FormatItalicRoundedIcon },
  { format: 'list', label: 'List', icon: FormatListBulletedRoundedIcon },
  { format: 'ordered', label: 'Numbered list', icon: FormatListNumberedRoundedIcon },
  { format: 'checkbox', label: 'Checkbox', icon: CheckBoxOutlinedIcon },
  { format: 'quote', label: 'Quote', icon: FormatQuoteRoundedIcon },
  { format: 'link', label: 'Link', shortcut: 'Ctrl/⌘ K', icon: InsertLinkRoundedIcon },
  { format: 'inlineCode', label: 'Inline code', icon: DataObjectRoundedIcon },
  { format: 'code', label: 'Code block', icon: CodeRoundedIcon },
  { format: 'table', label: 'Table', icon: TableChartOutlinedIcon },
] as const

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  label?: string
  minRows?: number
  placeholder?: string
  required?: boolean
  disabled?: boolean
  onBlur?: () => void
  inputRef?: RefObject<HTMLTextAreaElement | null>
  toolbarActions?: ReactNode
  /** EntryEditor provides its own preview pane. */
  withPreview?: boolean
  snippets?: ContentEntry[]
}

/** The same Markdown controls are available when creating and editing content. */
export function MarkdownEditor({ value, onChange, label = 'Markdown', minRows = 7, placeholder, required, disabled, onBlur, inputRef, toolbarActions, withPreview = true, snippets }: MarkdownEditorProps) {
  const ownRef = useRef<HTMLTextAreaElement | null>(null)
  const fieldRef = inputRef ?? ownRef
  const pendingSelection = useRef<{ start: number; end: number } | null>(null)
  const [previewOpen, setPreviewOpen] = useState(true)
  const previewId = useId()

  useLayoutEffect(() => {
    const selection = pendingSelection.current
    if (selection && fieldRef.current) {
      fieldRef.current.focus()
      fieldRef.current.setSelectionRange(selection.start, selection.end)
      pendingSelection.current = null
    }
  }, [value, fieldRef])

  function applyFormat(format: MarkdownFormat) {
    if (disabled) return
    const field = fieldRef.current
    const result = formatMarkdown(value, field?.selectionStart ?? value.length, field?.selectionEnd ?? value.length, format)
    pendingSelection.current = result
    onChange(result.value)
  }

  function keyDown(event: KeyboardEvent) {
    if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey || event.nativeEvent.isComposing) return
    const format = ({ b: 'bold', i: 'italic', k: 'link' } as const)[event.key.toLowerCase() as 'b' | 'i' | 'k']
    if (format && !disabled) {
      event.preventDefault()
      applyFormat(format)
    }
  }

  return (
    <Box sx={{ minWidth: 0, width: '100%' }}>
      <Stack direction="row" role="toolbar" aria-label="Markdown formatting" spacing={0.25} sx={{ alignItems: 'center', flexWrap: 'wrap', mb: 1 }}>
        {tools.map(({ format, label: toolLabel, icon: Icon, ...tool }) => (
          <Tooltip key={format} title={`${toolLabel}${'shortcut' in tool ? ` (${tool.shortcut})` : ''}`}>
            <span>
              <IconButton
                aria-label={toolLabel}
                disabled={disabled}
                size="small"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => applyFormat(format)}
              >
                <Icon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        ))}
        {toolbarActions}
        {withPreview ? (
          <Button aria-controls={previewId} aria-expanded={previewOpen} size="small" sx={{ ml: 'auto' }} onClick={() => setPreviewOpen((open) => !open)}>
            {previewOpen ? 'Hide preview' : 'Show preview'}
          </Button>
        ) : null}
      </Stack>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: withPreview && previewOpen ? { xs: '1fr', md: 'minmax(0, 1fr) minmax(0, 1fr)' } : '1fr' }}>
        <TextField
          disabled={disabled}
          fullWidth
          inputRef={fieldRef}
          label={label}
          minRows={minRows}
          multiline
          placeholder={placeholder}
          required={required}
          slotProps={{ input: { sx: { fontFamily: '"ui-monospace", "SFMono-Regular", Consolas, monospace', fontSize: 14, alignItems: 'flex-start' } } }}
          value={value}
          onBlur={onBlur}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={keyDown}
        />
        {withPreview && previewOpen ? (
          <Box id={previewId} role="region" aria-label={`${label} preview`} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, minWidth: 0, maxHeight: 480, overflow: 'auto', p: 2 }}>
            <Typography color="text.secondary" variant="overline">Preview</Typography>
            {value.trim() ? <MarkdownView content={value} snippets={snippets} /> : <Typography color="text.secondary" sx={{ mt: 1 }}>Your Markdown preview appears here as you type.</Typography>}
          </Box>
        ) : null}
      </Box>
      <Typography color="text.secondary" variant="caption" sx={{ display: 'block', mt: 0.75 }}>
        Markdown · Ctrl/⌘ B bold · Ctrl/⌘ I italic · Ctrl/⌘ K link
      </Typography>
    </Box>
  )
}
