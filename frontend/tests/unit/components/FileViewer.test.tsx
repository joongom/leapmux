import { render, screen, waitFor } from '@solidjs/testing-library'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock workerRpc — controlled per-test via the two refs below.
const statFileImpl = vi.fn()
const readFileImpl = vi.fn()
const readGitFileImpl = vi.fn(async () => ({ exists: false, content: new Uint8Array() }))

vi.mock('~/api/workerRpc', () => ({
  statFile: (...args: unknown[]) => statFileImpl(...args),
  readFile: (...args: unknown[]) => readFileImpl(...args),
  readGitFile: (...args: unknown[]) => readGitFileImpl(...args),
}))

// Mock heavy child views so we only assert on the dispatcher's choice.
vi.mock('~/components/fileviewer/TextFileView', () => ({
  TextFileView: (props: { filePath: string }) => (
    <div data-testid="text-view">{props.filePath}</div>
  ),
}))
vi.mock('~/components/fileviewer/MarkdownFileView', () => ({
  MarkdownFileView: (props: { filePath: string }) => (
    <div data-testid="markdown-view">{props.filePath}</div>
  ),
}))
vi.mock('~/components/fileviewer/ImageFileView', () => ({
  ImageFileView: (props: { filePath: string }) => (
    <div data-testid="image-view">{props.filePath}</div>
  ),
}))

// Mock fileDownload at the boundary so we don't trigger real anchor clicks.
vi.mock('~/lib/fileDownload', () => ({
  downloadFileFromWorker: vi.fn(() => Promise.resolve()),
  openFileInNewTab: vi.fn(() => Promise.resolve()),
}))

// Imported AFTER the mocks above so they are wired before evaluation.
const { FileViewer } = await import('~/components/fileviewer/FileViewer')

function statResp(size: number) {
  return {
    info: { size: BigInt(size) },
  }
}

function readResp(content: Uint8Array, totalSize?: number) {
  return {
    content,
    totalSize: BigInt(totalSize ?? content.length),
  }
}

describe('fileViewer dispatch', () => {
  beforeEach(() => {
    statFileImpl.mockReset()
    readFileImpl.mockReset()
  })

  it('renders TextFileView for a small text file', async () => {
    const bytes = new TextEncoder().encode('hello world')
    statFileImpl.mockResolvedValue(statResp(bytes.length))
    readFileImpl.mockResolvedValue(readResp(bytes))

    render(() => <FileViewer workerId="w1" filePath="/repo/notes.txt" />)
    await waitFor(() => expect(screen.getByTestId('text-view')).toBeInTheDocument())
    expect(screen.queryByText(/cannot be displayed/i)).not.toBeInTheDocument()
  })

  it('renders the UnsupportedFileView card for a binary file', async () => {
    // bytes that trip isBinaryContent (null byte)
    const bytes = new Uint8Array([0, 1, 2, 3, 0, 0, 0])
    statFileImpl.mockResolvedValue(statResp(bytes.length))
    readFileImpl.mockResolvedValue(readResp(bytes))

    render(() => <FileViewer workerId="w1" filePath="/repo/data.bin" />)
    await waitFor(() =>
      expect(screen.getByText('This file cannot be displayed.')).toBeInTheDocument(),
    )
    expect(screen.queryByTestId('text-view')).not.toBeInTheDocument()
    expect(screen.getByText('data.bin')).toBeInTheDocument()
  })

  it('renders the card with "too large to preview" for truncated text', async () => {
    // Simulate a 5 MB log: stat returns large size, readFile returns the
    // first 256 KiB and totalSize equal to the original 5 MB.
    const partial = new TextEncoder().encode('a'.repeat(1024))
    const fullSize = 5 * 1024 * 1024
    statFileImpl.mockResolvedValue(statResp(fullSize))
    readFileImpl.mockResolvedValue(readResp(partial, fullSize))

    render(() => <FileViewer workerId="w1" filePath="/repo/big.log" />)
    await waitFor(() =>
      expect(screen.getByText('This file is too large to preview.')).toBeInTheDocument(),
    )
    expect(screen.queryByTestId('text-view')).not.toBeInTheDocument()
  })

  it('renders the card with "image is too large" for over-cap images', async () => {
    const fullSize = 5 * 1024 * 1024
    statFileImpl.mockResolvedValue(statResp(fullSize))
    // readFile should not even be called — image-too-large short-circuits.
    readFileImpl.mockResolvedValue(readResp(new Uint8Array(), fullSize))

    render(() => <FileViewer workerId="w1" filePath="/repo/huge.png" />)
    await waitFor(() =>
      expect(screen.getByText('This image is too large to preview.')).toBeInTheDocument(),
    )
    expect(screen.queryByTestId('image-view')).not.toBeInTheDocument()
  })
})
