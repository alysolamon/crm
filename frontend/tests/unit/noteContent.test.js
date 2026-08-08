import { normalizeNoteMarkdown, renderNoteContent } from '@/utils/noteContent'

describe('note content rendering', () => {
  it('recovers collapsed headings and bullets from an agent report', () => {
    const normalized = normalizeNoteMarkdown(
      '## Role Kevin is the principal. ## Contactability - Direct email: not found. - LinkedIn: verified.',
    )

    expect(normalized).toContain('## Role')
    expect(normalized).toContain('\n\n## Contactability')
    expect(normalized).toContain('\n- Direct email')
    expect(normalized).toContain('\n- LinkedIn')
  })

  it('renders markdown as structured HTML', () => {
    const rendered = renderNoteContent(
      '## Research summary\n\n- First finding\n- Second finding',
    )

    expect(rendered).toContain('<h2>Research summary</h2>')
    expect(rendered).toContain('<ul>')
    expect(rendered).toContain('<li>First finding</li>')
  })

  it('sanitizes unsafe HTML from note content', () => {
    const rendered = renderNoteContent(
      '<h2>Research</h2><script>alert(1)</script><p>Safe finding</p>',
    )

    expect(rendered).toContain('<h2>Research</h2>')
    expect(rendered).toContain('<p>Safe finding</p>')
    expect(rendered).not.toContain('<script>')
  })

  it('leaves ordinary prose free of invented report breaks', () => {
    expect(normalizeNoteMarkdown('A normal note - with punctuation.')).toBe(
      'A normal note - with punctuation.',
    )
  })
})
