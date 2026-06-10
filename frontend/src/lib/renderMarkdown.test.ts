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

  it('"7~11월" range expression keeps its literal tilde (no <del>, no dropped ~)', () => {
    const html = renderMarkdown('7~11월', true)
    expect(html).not.toContain('<del')
    expect(html).not.toContain('</del>')
    // Regression: the tilde itself must survive — the bug rendered "711월".
    expect(html).toContain('7~11월')
  })

  it('"6~12월 범위는 1~5입니다" keeps both literal tildes', () => {
    const html = renderMarkdown('6~12월 범위는 1~5입니다', true)
    expect(html).not.toContain('<del')
    expect(html).not.toContain('</del>')
    // Regression: the bug paired the two single tildes into a <del> and
    // dropped them, rendering "612월 범위는 15입니다".
    expect(html).toContain('6~12월')
    expect(html).toContain('1~5입니다')
  })

  it('"4~6%" numeric range keeps its tilde (reported case)', () => {
    const html = renderMarkdown('4~6%', true)
    expect(html).not.toContain('<del')
    expect(html).toContain('4~6%')
  })

  it('multiple single-tilde ranges in one line all keep their tildes', () => {
    const html = renderMarkdown('성장률 4~6%, 마진 8~10%', true)
    expect(html).not.toContain('<del')
    expect(html).toContain('4~6%')
    expect(html).toContain('8~10%')
  })

  it('gFM table still renders (positive control: only <del> was stripped, not all of GFM)', () => {
    const html = renderMarkdown('| a | b |\n|---|---|\n| 1 | 2 |', true)
    expect(html).toContain('<table>')
  })
})
