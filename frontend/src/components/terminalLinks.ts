import type { IBufferLine, ILink, ILinkProvider, Terminal } from '@xterm/xterm'

const URL_PATTERN = /https?:\/\/[^\s"'!*(){}|\\^<>`]*[^\s"':,.!?{}|\\^~[\]`()<>]/gi
const MAX_CONTINUATION_LINES = 40

interface Cell { x: number, y: number }

/** A run of buffer lines that read as one logical line, with the buffer cell of every character. */
interface LogicalLine { text: string, cells: Cell[] }

function lineAt(term: Terminal, y: number): IBufferLine | undefined {
  return term.buffer.active.getLine(y - 1)
}

/**
 * Whether `next` continues `previous`. Besides the terminal's own soft wrap, a line that runs up to the last column and
 * is followed by text starting in the first column counts, because tmux and CLIs redraw wrapped lines without the flag.
 */
function continues(term: Terminal, previous: IBufferLine, next: IBufferLine): boolean {
  if (next.isWrapped) return true
  const last = previous.getCell(term.cols - 1)?.getChars() ?? ''
  const first = next.getCell(0)?.getChars() ?? ''
  return last.trim() !== '' && first.trim() !== ''
}

function readLine(term: Terminal, line: IBufferLine, y: number, into: LogicalLine) {
  for (let x = 0; x < term.cols; x++) {
    const cell = line.getCell(x)
    if (!cell || cell.getWidth() === 0) continue
    const chars = cell.getChars() || ' '
    for (let i = 0; i < chars.length; i++) into.cells.push({ x: x + 1, y })
    into.text += chars
  }
}

function logicalLineAround(term: Terminal, y: number): LogicalLine | undefined {
  const current = lineAt(term, y)
  if (!current) return undefined
  let first = y
  for (let n = 0; n < MAX_CONTINUATION_LINES && first > 1; n++) {
    const previous = lineAt(term, first - 1)
    const line = lineAt(term, first)
    if (!previous || !line || !continues(term, previous, line)) break
    first--
  }
  const result: LogicalLine = { text: '', cells: [] }
  for (let row = first, count = 0; count <= MAX_CONTINUATION_LINES * 2; row++, count++) {
    const line = lineAt(term, row)
    if (!line) break
    if (row > first) {
      const previous = lineAt(term, row - 1)
      if (!previous || !continues(term, previous, line)) break
    }
    readLine(term, line, row, result)
  }
  return result
}

/** Links for http(s) URLs, including ones that wrap across several terminal lines. */
export function createUrlLinkProvider(term: Terminal, open: (url: string) => void): ILinkProvider {
  return {
    provideLinks(y, callback) {
      const logical = logicalLineAround(term, y)
      if (!logical) { callback(undefined); return }
      const links: ILink[] = []
      for (const match of logical.text.matchAll(URL_PATTERN)) {
        const start = logical.cells[match.index]
        const end = logical.cells[match.index + match[0].length - 1]
        if (!start || !end || y < start.y || y > end.y) continue
        links.push({
          range: { start: { x: start.x, y: start.y }, end: { x: end.x, y: end.y } },
          text: match[0],
          activate: (event, text) => { event.preventDefault(); open(text) },
        })
      }
      callback(links.length ? links : undefined)
    },
  }
}
