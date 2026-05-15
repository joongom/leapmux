import { fireEvent, render, screen } from '@solidjs/testing-library'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UnsupportedFileView } from '~/components/fileviewer/UnsupportedFileView'

const mockDownload = vi.fn(() => Promise.resolve())
const mockOpen = vi.fn(() => Promise.resolve())

vi.mock('~/lib/fileDownload', () => ({
  downloadFileFromWorker: (...args: unknown[]) => mockDownload(...args),
  openFileInNewTab: (...args: unknown[]) => mockOpen(...args),
}))

describe('unsupportedFileView', () => {
  beforeEach(() => {
    mockDownload.mockClear()
    mockOpen.mockClear()
  })

  it('renders filename, formatted size, and both buttons', () => {
    render(() => (
      <UnsupportedFileView
        workerId="w1"
        filePath="/repo/data.bin"
        flavor="posix"
        totalSize={2048}
        reason="binary"
      />
    ))
    expect(screen.getByText('data.bin')).toBeInTheDocument()
    expect(screen.getByText(/2(\.0)?\s*KB/i)).toBeInTheDocument()
    expect(screen.getByTestId('unsupported-download-button')).toBeInTheDocument()
    expect(screen.getByTestId('unsupported-open-button')).toBeInTheDocument()
  })

  it('download button calls downloadFileFromWorker with (workerId, filePath, flavor)', () => {
    render(() => (
      <UnsupportedFileView
        workerId="w-42"
        filePath="/repo/archive.zip"
        flavor="posix"
        totalSize={1024}
        reason="binary"
      />
    ))
    fireEvent.click(screen.getByTestId('unsupported-download-button'))
    expect(mockDownload).toHaveBeenCalledTimes(1)
    expect(mockDownload).toHaveBeenCalledWith('w-42', '/repo/archive.zip', 'posix')
    expect(mockOpen).not.toHaveBeenCalled()
  })

  it('open in new tab button calls openFileInNewTab once', () => {
    const winPath = 'C:\\repo\\big.log'
    render(() => (
      <UnsupportedFileView
        workerId="w-42"
        filePath={winPath}
        flavor="win32"
        totalSize={500000}
        reason="oversize-text"
      />
    ))
    fireEvent.click(screen.getByTestId('unsupported-open-button'))
    expect(mockOpen).toHaveBeenCalledTimes(1)
    expect(mockOpen).toHaveBeenCalledWith('w-42', winPath, 'win32')
    expect(mockDownload).not.toHaveBeenCalled()
  })

  it('shows binary header/subtext for reason="binary"', () => {
    render(() => (
      <UnsupportedFileView
        workerId="w"
        filePath="/repo/foo.bin"
        flavor="posix"
        totalSize={10}
        reason="binary"
      />
    ))
    expect(screen.getByText('This file cannot be displayed.')).toBeInTheDocument()
    expect(screen.getByText(/binary file/i)).toBeInTheDocument()
  })

  it('shows oversize-text header for reason="oversize-text"', () => {
    render(() => (
      <UnsupportedFileView
        workerId="w"
        filePath="/repo/big.log"
        flavor="posix"
        totalSize={500000}
        reason="oversize-text"
      />
    ))
    expect(screen.getByText('This file is too large to preview.')).toBeInTheDocument()
    expect(screen.getByText(/text file is too large/i)).toBeInTheDocument()
  })

  it('shows oversize-image header for reason="oversize-image"', () => {
    render(() => (
      <UnsupportedFileView
        workerId="w"
        filePath="/repo/huge.png"
        flavor="posix"
        totalSize={5_000_000}
        reason="oversize-image"
      />
    ))
    expect(screen.getByText('This image is too large to preview.')).toBeInTheDocument()
    expect(screen.getByText('This image is too large to preview inline (over 256 KB).')).toBeInTheDocument()
  })

  it('exposes a 48px file icon via data-testid', () => {
    render(() => (
      <UnsupportedFileView
        workerId="w"
        filePath="/repo/foo.bin"
        flavor="posix"
        totalSize={10}
        reason="binary"
      />
    ))
    const icon = screen.getByTestId('unsupported-file-icon')
    expect(icon).toBeInTheDocument()
    // lucide-solid icons render as <svg width="48" height="48" ...>
    expect(icon.getAttribute('width')).toBe('48')
    expect(icon.getAttribute('height')).toBe('48')
  })

  it('attaches ARIA labels with the filename', () => {
    render(() => (
      <UnsupportedFileView
        workerId="w"
        filePath="/repo/photo.png"
        flavor="posix"
        totalSize={5_000_000}
        reason="oversize-image"
      />
    ))
    expect(screen.getByLabelText('Download photo.png')).toBeInTheDocument()
    expect(screen.getByLabelText('Open photo.png in new tab')).toBeInTheDocument()
  })
})
