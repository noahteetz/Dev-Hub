export type MarkdownFormat = 'heading' | 'bold' | 'italic' | 'list' | 'ordered' | 'checkbox' | 'quote' | 'link' | 'table' | 'code' | 'inlineCode'

/** Replace a selection and return the range to keep focused after React updates the field. */
export function formatMarkdown(value: string, start: number, end: number, format: MarkdownFormat) {
  const selected = value.slice(start, end)
  const replace = (text: string, from = start, to = end, selectionStart = from, selectionEnd = from + text.length) => ({
    value: value.slice(0, from) + text + value.slice(to),
    start: selectionStart,
    end: selectionEnd,
  })

  if (format === 'bold' || format === 'italic' || format === 'inlineCode') {
    const marker = format === 'bold' ? '**' : format === 'italic' ? '_' : '`'
    if (selected.startsWith(marker) && selected.endsWith(marker) && selected.length > marker.length * 2) {
      return replace(selected.slice(marker.length, -marker.length))
    }
    if (value.slice(start - marker.length, start) === marker && value.slice(end, end + marker.length) === marker) {
      return replace(selected, start - marker.length, end + marker.length)
    }
    const text = selected || (format === 'inlineCode' ? 'code' : 'text')
    return replace(marker + text + marker, start, end, start + marker.length, start + marker.length + text.length)
  }

  if (format === 'link') {
    const label = selected || 'label'
    const text = `[${label}](https://)`
    // Select the destination so typing a URL is the next action.
    return replace(text, start, end, start + label.length + 3, start + text.length - 1)
  }

  // Block formats operate on complete lines, including when the caret is inside a word.
  const from = start === 0 ? 0 : value.lastIndexOf('\n', start - 1) + 1
  const last = end > start && value[end - 1] === '\n' ? end - 1 : end
  const nextNewline = value.indexOf('\n', last)
  const to = nextNewline < 0 ? value.length : nextNewline
  const block = value.slice(from, to)

  if (format === 'code' || format === 'table') {
    const text = format === 'code'
      ? `\`\`\`\n${block || 'code'}\n\`\`\``
      : `| Column | Column |\n| --- | --- |\n| ${block.replace(/\n/g, ' ').replace(/\|/g, '\\|') || 'Value'} | Value |`
    return replace(text, from, to, from + (format === 'code' ? 4 : text.length), from + (format === 'code' ? 4 + (block || 'code').length : text.length))
  }

  const patterns = {
    heading: /^#{1,6} /,
    list: /^- (?!\[[ xX]\] )/,
    ordered: /^\d+\. /,
    checkbox: /^- \[[ xX]\] /,
    quote: /^> /,
  }
  const lines = block.split('\n')
  const pattern = patterns[format]
  const remove = lines.every((line) => pattern.test(line))
  const text = lines.map((line, index) => {
    if (remove) return line.replace(pattern, '')
    const prefix = format === 'heading' ? '## ' : format === 'ordered' ? `${index + 1}. ` : format === 'checkbox' ? '- [ ] ' : format === 'quote' ? '> ' : '- '
    return prefix + line.replace(pattern, '')
  }).join('\n')
  return replace(text, from, to, start === end ? from + text.length : from, from + text.length)
}
