import { Alert, Box, Button, Stack, Typography } from '@mui/material'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { api } from '../api'
import type { WorkspaceTerminal } from '../types'

interface TerminalPaneProps {
  terminal: WorkspaceTerminal
  /** Shown before the connection status, e.g. the project the terminal belongs to. */
  title?: string
  /** Extra header buttons. */
  actions?: ReactNode
  /** Fill the parent's height instead of the fixed default, and drop the footer hint. */
  fill?: boolean
}

export function TerminalPane({ terminal, title, actions, fill = false }: TerminalPaneProps) {
  const container = useRef<HTMLDivElement | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [status, setStatus] = useState('Connecting')
  const [error, setError] = useState('')
  useEffect(() => {
    if (!container.current) return
    let alive = true
    let socket: WebSocket | null = null
    let queuedOutput = 0
    let renewal: ReturnType<typeof setInterval> | null = null
    const term = new Terminal({ cursorBlink: true, convertEol: false, scrollback: 3000, fontSize: 13,
      theme: { background: '#10141c', foreground: '#e6edf3' } })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(container.current)
    fit.fit()
    function resize() {
      fit.fit()
      if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }))
    }
    const observer = new ResizeObserver(resize)
    observer.observe(container.current)
    const input = term.onData(data => {
      if (socket?.readyState !== WebSocket.OPEN) return
      // Bound input frames, including a large paste; do not queue after disconnection.
      let offset = 0
      while (offset < data.length) {
        let end = Math.min(offset + 2048, data.length)
        const last = data.charCodeAt(end - 1)
        if (end < data.length && last >= 0xd800 && last <= 0xdbff) end--
        socket.send(JSON.stringify({ type: 'input', data: data.slice(offset, end) }))
        offset = end
      }
    })
    api.workspaces.ticket(terminal.workspaceId, terminal.id).then(ticket => {
      if (!alive) return
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      socket = new WebSocket(protocol + '//' + window.location.host + '/api/workspaces/' + terminal.workspaceId + '/terminals/' + terminal.id + '/connect', ['devhub-terminal', 'ticket.' + ticket.ticket])
      socket.binaryType = 'arraybuffer'
      socket.onopen = () => {
        if (!alive) return
        setStatus('Connected'); setError(''); resize(); term.focus()
        renewal = setInterval(() => {
          api.workspaces.ticket(terminal.workspaceId, terminal.id).then(next => {
            if (alive && socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'reauthorize', ticket: next.ticket }))
          }).catch((reason: unknown) => {
            if (alive) setError(reason instanceof Error ? reason.message : 'Terminal authorization expired')
            socket?.close()
          })
        }, 60000)
      }
      socket.onmessage = event => {
        if (!alive || !(event.data instanceof ArrayBuffer)) return
        const bytes = new Uint8Array(event.data)
        queuedOutput += bytes.byteLength
        if (queuedOutput > 512 * 1024) {
          setError('Terminal output exceeded the browser buffer. Reconnect to continue.')
          socket?.close()
          return
        }
        term.write(bytes, () => { queuedOutput -= bytes.byteLength })
      }
      socket.onerror = () => { if (alive) setError('The terminal connection failed. Reconnect when the workspace is available.') }
      socket.onclose = event => {
        if (alive && event.code === 1008) setError('Terminal authorization expired or input exceeded its limit. Reconnect to continue.')
        if (renewal) clearInterval(renewal)
        if (alive) setStatus('Disconnected')
      }
    }).catch((reason: unknown) => {
      if (alive) { setStatus('Disconnected'); setError(reason instanceof Error ? reason.message : 'Could not connect') }
    })
    return () => {
      alive = false
      if (renewal) clearInterval(renewal)
      socket?.close()
      observer.disconnect(); input.dispose(); term.dispose()
    }
  }, [terminal.id, terminal.workspaceId, attempt])
  return (
    <Stack spacing={1} sx={fill ? { height: '100%', minHeight: 0 } : undefined}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', minWidth: 0 }}>
        <Typography noWrap variant="body2">{title ? title + ' · ' : ''}{terminal.provider} · {status}</Typography>
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexShrink: 0 }}>
          <Button size="small" onClick={() => { setStatus('Connecting'); setError(''); setAttempt(a => a + 1) }}>Reconnect</Button>
          {actions}
        </Stack>
      </Stack>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Box ref={container} aria-label="Remote terminal" sx={{ bgcolor: '#10141c', borderRadius: 1, p: 1, overflow: 'hidden', ...(fill ? { flex: 1, minHeight: 120 } : { height: 440 }) }} />
      {fill ? null : <Typography color="text.secondary" variant="caption">Closing this panel disconnects the browser. Stop ends processes and keeps your files.</Typography>}
    </Stack>
  )
}
