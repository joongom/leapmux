/**
 * Behavioural test for the Truncate ↔ Wrap toggle wired into
 * FilesSectionHeaderActions, mirroring how `buildSectionDef.tsx` plumbs
 * the section handle to the header buttons.
 */
import type { FilesSectionHandle } from './FilesSection'
import { fireEvent, render, screen } from '@solidjs/testing-library'
import { createSignal } from 'solid-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PREFIX_FILES_NAME_WRAP } from '~/lib/browserStorage'
import { createGitFileStatusStore } from '~/stores/gitFileStatus.store'
import { FilesSection, FilesSectionHeaderActions } from './FilesSection'

// Stub the worker RPC — no real directory listings needed.
vi.mock('~/api/workerRpc', () => ({
  listDirectory: vi.fn(async () => ({ entries: [], truncated: false })),
  channelManager: { subscribe: () => () => {} },
}))

const WORKER = 'w1'
const WORKING_DIR = '/home/test/proj'

function renderSectionWithHeader() {
  const [handle, setHandle] = createSignal<FilesSectionHandle | undefined>()
  const result = render(() => (
    <>
      <FilesSectionHeaderActions
        onCollapseAll={() => handle()?.collapseAll()}
        onLocateFile={() => {}}
        onRefresh={() => handle()?.refresh()}
        hasActiveFileTab={false}
        nameWrap={() => handle()?.nameWrap() ?? false}
        onToggleNameWrap={() => handle()?.toggleNameWrap()}
      />
      <FilesSection
        workerId={WORKER}
        workingDir={WORKING_DIR}
        homeDir="/home/test"
        flavor="posix"
        fileTreePath={WORKING_DIR}
        onFileSelect={() => {}}
        gitStatusStore={createGitFileStatusStore()}
        hasActiveFileTab={false}
        ref={setHandle}
      />
    </>
  ))
  return result
}

describe('filesSection name-wrap toggle', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('defaults to wrap=true on fresh storage and persists "false" after first click', async () => {
    renderSectionWithHeader()

    const btn = await screen.findByTestId('files-name-wrap-toggle')
    // Pass3: wrap defaults to ON for new users (no stored value).
    expect(btn.getAttribute('aria-pressed')).toBe('true')

    fireEvent.click(btn)

    expect(btn.getAttribute('aria-pressed')).toBe('false')

    const key = `${PREFIX_FILES_NAME_WRAP}${WORKER}:${WORKING_DIR}`
    // The dynamic-key wrapper stores { v: false, e: <ts> } — drill in.
    const raw = localStorage.getItem(key)
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw!)
    expect(parsed.v).toBe(false)
  })

  it('toggles back to wrap on a second click', async () => {
    renderSectionWithHeader()
    const btn = await screen.findByTestId('files-name-wrap-toggle')
    expect(btn.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(btn)
    expect(btn.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(btn)
    expect(btn.getAttribute('aria-pressed')).toBe('true')
  })
})
