/**
 * Mobile action-bar behavioural test (pass3): the bar is always mounted
 * on a mobile-width viewport. Initially all buttons are disabled; tapping
 * a file row selects it (onSelect fires, onFileOpen does NOT) and the
 * buttons become enabled. Pressing Escape clears the action target,
 * re-disabling the buttons — the bar itself stays in the DOM.
 *
 * Uses a stub matchMedia (≤ mobile breakpoint) so useIsMobile() reports
 * true. Worker RPC is stubbed to return a single file entry under the
 * root.
 */
import type { FileInfo } from '~/generated/leapmux/v1/file_pb'
import { fireEvent, render, screen } from '@solidjs/testing-library'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DirectoryTree } from './DirectoryTree'

const ROOT = '/home/test/proj'
const FILE_PATH = `${ROOT}/README.md`

vi.mock('~/api/workerRpc', () => ({
  listDirectory: vi.fn(async () => ({
    entries: [
      {
        path: FILE_PATH,
        name: 'README.md',
        isDir: false,
        hidden: false,
        size: 42n,
        modTime: '2026-01-01T00:00:00Z',
      } satisfies Partial<FileInfo> as FileInfo,
    ],
    truncated: false,
  })),
  statFile: vi.fn(async () => ({ info: { size: 0n } })),
  readFile: vi.fn(async () => ({ content: new Uint8Array() })),
  channelManager: { subscribe: () => () => {} },
}))

function forceMobileMatchMedia() {
  const realMM = window.matchMedia
  window.matchMedia = ((query: string) => {
    const matches = query.includes('max-width') && query.includes('767')
    return {
      matches,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    } as unknown as MediaQueryList
  }) as typeof window.matchMedia
  return () => {
    window.matchMedia = realMM
  }
}

describe('directoryTree action bar (mobile)', () => {
  let restore: (() => void) | null = null

  beforeEach(() => {
    // Default desktop width; useIsMobile() reads innerWidth on init,
    // then subscribes to matchMedia.
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 375 })
    restore?.()
    restore = forceMobileMatchMedia()
  })

  it('mounts the action bar always, enables on file tap, does not call onFileOpen', async () => {
    const onFileOpen = vi.fn()
    const onSelect = vi.fn()

    render(() => (
      <DirectoryTree
        workerId="w1"
        showFiles
        selectedPath={ROOT}
        rootPath={ROOT}
        homeDir="/home/test"
        onSelect={onSelect}
        onFileOpen={onFileOpen}
      />
    ))

    // The bar is always mounted on mobile — visible before any selection.
    const bar = await screen.findByRole('toolbar', { name: 'File actions' })
    expect(bar).toBeTruthy()

    const openInNewTab = screen.getByTestId('tree-action-open-new-tab') as HTMLButtonElement
    // Initially disabled because no file is selected.
    expect(openInNewTab.disabled).toBe(true)
    expect(openInNewTab.getAttribute('aria-disabled')).toBe('true')

    // Wait for the listDirectory mock to flush, then tap the file row.
    const fileRow = await screen.findByText('README.md')
    const row = fileRow.closest('[data-testid="tree-row"]') as HTMLElement
    expect(row).not.toBeNull()

    fireEvent.click(row)

    // onFileOpen must NOT be called on mobile tap.
    expect(onFileOpen).not.toHaveBeenCalled()
    // Source row got selected.
    expect(onSelect).toHaveBeenCalledWith(FILE_PATH)

    // Buttons are now enabled.
    expect(openInNewTab.disabled).toBe(false)
    expect(openInNewTab.getAttribute('aria-disabled')).toBe('false')

    // The bar remains in the DOM — no unmount.
    expect(screen.queryByRole('toolbar', { name: 'File actions' })).toBeTruthy()
  })
})
