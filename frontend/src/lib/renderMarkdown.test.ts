import { describe, expect, it } from 'vitest'
import { renderMarkdown } from './renderMarkdown'

describe('renderMarkdown — strikethrough disabled (T5 regression)', () => {
  it('single-tilde "~text~" emits no <del> and no strikethrough decoration', () => {
    const html = renderMarkdown('~text~', true)
    expect(html).not.toContain('<del')
    expect(html).not.toContain('</del>')
    expect(html).not.toContain('text-decoration:')
    expect(html).toContain('text')
  })

  it('double-tilde "~~text~~" emits no <del>', () => {
    const html = renderMarkdown('~~text~~', true)
    expect(html).not.toContain('<del')
    expect(html).not.toContain('</del>')
    expect(html).not.toContain('text-decoration:')
    expect(html).toContain('text')
  })

  it('"7~11월" range expression renders as plain text without strikethrough', () => {
    const html = renderMarkdown('7~11월', true)
    expect(html).not.toContain('<del')
    expect(html).not.toContain('</del>')
    expect(html).toContain('7')
    expect(html).toContain('11월')
  })

  it('"6~12월 범위는 1~5입니다" renders both ranges as plain text', () => {
    const html = renderMarkdown('6~12월 범위는 1~5입니다', true)
    expect(html).not.toContain('<del')
    expect(html).not.toContain('</del>')
    expect(html).toContain('6')
    expect(html).toContain('12월')
    expect(html).toContain('범위는')
    expect(html).toContain('1')
    expect(html).toContain('5입니다')
  })

  it('gFM table still renders (positive control: only <del> was stripped, not all of GFM)', () => {
    const html = renderMarkdown('| a | b |\n|---|---|\n| 1 | 2 |', true)
    expect(html).toContain('<table>')
  })
})
