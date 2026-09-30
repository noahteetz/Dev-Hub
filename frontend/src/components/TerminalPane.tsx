import { Alert, Box, Button, Stack, Typography } from '@mui/material'
import { useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { api } from '../api'
import type { WorkspaceTerminal } from '../types'

export function TerminalPane({ terminal }: { terminal: WorkspaceTerminal }) {
  const container = useRef<HTMLDivElement | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [status, setStatus] = useState('Connecting')
  const [error, setError] = useState('')
  useEffect(() => {
    if (!container.current) return
    let alive = true
    let socket: WebSocket | null = null
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
      for (let i = 0; i < data.length; i += 2048) socket.send(JSON.stringify({ type: 'input', data: data.slice(i, i + 2048) }))
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
        if (alive && event.data instanceof ArrayBuffer) term.write(new Uint8Array(event.data))
      }
      socket.onerror = () => { if (alive) setError('The terminal connection failed. Reconnect when the workspace is available.') }
      socket.onclose = () => {
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
    <Stack spacing={1}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="body2">{terminal.provider} · {status}</Typography>
        <Button size="small" onClick={() => { setStatus('Connecting'); setError(''); setAttempt(a => a + 1) }}>Reconnect</Button>
      </Stack>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Box ref={container} aria-label="Remote terminal" sx={{ bgcolor: '#10141c', borderRadius: 1, p: 1, height: 440, overflow: 'hidden' }} />
      <Typography color="text.secondary" variant="caption">Closing this panel disconnects the browser. Stop ends processes and keeps your files.</Typography>
    </Stack>
  )
}
