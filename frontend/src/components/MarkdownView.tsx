import { Box } from '@mui/material'
import type { SxProps, Theme } from '@mui/material'
import type { ComponentPropsWithoutRef } from 'react'
import { useMemo } from 'react'
import Markdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'
import { useNavigate } from 'react-router-dom'
import { surface } from '../theme'
import type { ContentEntry } from '../types'

/** Matches a live snippet reference such as {{snippet:12}}. */
const SNIPPET_REFERENCE = /\{\{snippet:(\d+)\}\}/g

const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code ?? []), ['className', /^language-./]],
    span: [...(defaultSchema.attributes?.span ?? []), ['className', /^hljs-./]],
    input: [...(defaultSchema.attributes?.input ?? []), 'checked'],
  },
}

interface MarkdownViewProps {
  content: string
  /** Snippets used to fill live references; a missing one renders a hint instead of failing. */
  snippets?: ContentEntry[]
  sx?: SxProps<Theme>
}

function expandSnippetReferences(content: string, snippets: ContentEntry[] = []) {
  return content.replace(SNIPPET_REFERENCE, (_match, rawId: string) => {
    const snippet = snippets.find((candidate) => candidate.id === Number(rawId))
    if (!snippet) {
      return `> Referenced snippet ${rawId} is no longer available.`
    }
    return `\`\`\`${snippet.language || 'text'}\n${snippet.content}\n\`\`\``
  })
}

function isInternal(href: string) {
  if (href.startsWith('/')) {
    return true
  }
  if (typeof window === 'undefined') {
    return false
  }
  try {
    return new URL(href, window.location.origin).origin === window.location.origin
  } catch {
    return false
  }
}

/**
 * Renders Markdown for notes, ideas and repository READMEs. Embedded HTML is never parsed and
 * the sanitizer drops unsafe URLs, so untrusted content cannot execute anything.
 */
export function MarkdownView({ content, snippets, sx }: MarkdownViewProps) {
  const navigate = useNavigate()
  const source = useMemo(() => expandSnippetReferences(content, snippets), [content, snippets])

  return (
    <Box
      sx={{
        '& :first-of-type': { mt: 0 },
        '& h1, & h2, & h3, & h4': { fontWeight: 800, lineHeight: 1.3, mb: 1, mt: 2.5 },
        '& h1': { fontSize: '1.6rem' },
        '& h2': { fontSize: '1.35rem' },
        '& h3': { fontSize: '1.15rem' },
        '& p': { my: 1.25 },
        '& ul, & ol': { my: 1.25, pl: 3 },
        '& li': { my: 0.25 },
        '& li input': { mr: 1 },
        '& blockquote': {
          borderLeft: 3,
          borderColor: 'primary.light',
          color: 'text.secondary',
          my: 1.5,
          pl: 2,
          ml: 0,
        },
        '& code': {
          bgcolor: 'action.hover',
          borderRadius: 0.75,
          fontFamily: '"ui-monospace", "SFMono-Regular", Consolas, monospace',
          fontSize: '0.86em',
          px: 0.6,
          py: 0.2,
        },
        '& pre': {
          bgcolor: (theme) => surface(theme, 'code'),
          borderRadius: 1,
          overflowX: 'auto',
          p: 1.75,
        },
        '& pre code': { bgcolor: 'transparent', fontSize: '0.82rem', p: 0 },
        '& table': { borderCollapse: 'collapse', display: 'block', my: 1.5, overflowX: 'auto', width: '100%' },
        '& th, & td': { border: 1, borderColor: 'divider', px: 1.25, py: 0.75, textAlign: 'left' },
        '& th': { bgcolor: 'action.hover', fontWeight: 700 },
        '& img': { maxWidth: '100%' },
        '& a': { color: 'primary.main' },
        wordBreak: 'break-word',
        ...sx,
      }}
    >
      <Markdown
        rehypePlugins={[[rehypeSanitize, schema], rehypeHighlight]}
        remarkPlugins={[remarkGfm]}
        components={{
          a({ href, children, ...props }: ComponentPropsWithoutRef<'a'>) {
            const target = href ?? ''
            if (target && isInternal(target)) {
              return (
                <a
                  {...props}
                  href={target}
                  onClick={(event) => {
                    event.preventDefault()
                    navigate(target.startsWith('/') ? target : new URL(target, window.location.origin).pathname)
                  }}
                >
                  {children}
                </a>
              )
            }
            return (
              <a {...props} href={target || undefined} rel="noreferrer" target="_blank">
                {children}
              </a>
            )
          },
        }}
      >
        {source}
      </Markdown>
    </Box>
  )
}
