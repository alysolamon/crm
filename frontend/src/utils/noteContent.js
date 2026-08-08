import DOMPurify from 'dompurify'
import { marked } from 'marked'

const HTML_TAG_PATTERN = /<\/?[a-z][^>]*>/i
const MARKDOWN_HEADING_PATTERN = /(^|\s)#{1,6}\s+\S/

/**
 * Some agent-created notes arrived as one rich-text paragraph, so line breaks
 * around Markdown headings and bullets were lost before the note was saved.
 * Recover only the unambiguous report markers; ordinary prose is untouched.
 */
export function normalizeNoteMarkdown(content = '') {
  if (typeof content !== 'string') return ''

  let normalized = content.replace(/\r\n?/g, '\n').trim()
  if (!normalized || HTML_TAG_PATTERN.test(normalized)) return normalized
  if (!MARKDOWN_HEADING_PATTERN.test(normalized)) return normalized

  normalized = normalized.replace(
    /(^|\s+)(#{1,6})\s+(?=\S)/g,
    (_match, leading, hashes) => {
      const separator = leading.includes('\n') ? leading : '\n\n'
      return `${separator}${hashes} `
    },
  )

  // Agent research reports commonly use spaced hyphens as bullets after a
  // heading. Convert those markers only in reports that contain headings.
  normalized = normalized.replace(/([^\n])\s+-\s+(?=\S)/g, '$1\n- ')

  return normalized.trim()
}

export function renderNoteContent(content = '') {
  if (typeof content !== 'string' || !content.trim()) return ''

  if (HTML_TAG_PATTERN.test(content)) {
    return DOMPurify.sanitize(content)
  }

  const markdown = normalizeNoteMarkdown(content)
  const html = marked.parse(markdown, {
    gfm: true,
    breaks: true,
    async: false,
  })

  return DOMPurify.sanitize(html)
}
