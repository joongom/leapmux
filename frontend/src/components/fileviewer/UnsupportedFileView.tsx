import type { Component } from 'solid-js'
import type { PathFlavor } from '~/lib/paths'
import FileIcon from 'lucide-solid/icons/file'
import FileArchive from 'lucide-solid/icons/file-archive'
import FileImage from 'lucide-solid/icons/file-image'
import FileText from 'lucide-solid/icons/file-text'
import { createMemo, createUniqueId } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { downloadFileFromWorker, openFileInNewTab } from '~/lib/fileDownload'
import { formatBytes } from '~/lib/formatBytes'
import { basename } from '~/lib/paths'
import * as styles from './FileViewer.css'

export type UnsupportedReason = 'binary' | 'oversize-text' | 'oversize-image'

export interface UnsupportedFileViewProps {
  workerId: string
  filePath: string
  flavor: PathFlavor
  totalSize: number
  reason: UnsupportedReason
}

const ARCHIVE_EXTS = new Set([
  '.zip',
  '.tar',
  '.gz',
  '.tgz',
  '.7z',
  '.rar',
  '.bz2',
])

function getExt(name: string): string {
  const i = name.lastIndexOf('.')
  if (i < 0)
    return ''
  return name.substring(i).toLowerCase()
}

function pickIcon(reason: UnsupportedReason, ext: string) {
  if (reason === 'oversize-image')
    return FileImage
  if (reason === 'oversize-text')
    return FileText
  if (ARCHIVE_EXTS.has(ext))
    return FileArchive
  return FileIcon
}

function headerFor(reason: UnsupportedReason): string {
  // Spec: "This file cannot be displayed." — shared header for v1.
  if (reason === 'oversize-image')
    return 'This image is too large to preview.'
  if (reason === 'oversize-text')
    return 'This file is too large to preview.'
  return 'This file cannot be displayed.'
}

function subtextFor(reason: UnsupportedReason): string {
  if (reason === 'oversize-image')
    return 'This image is too large to preview inline (over 256 KB).'
  if (reason === 'oversize-text')
    return 'This text file is too large to preview inline (over 256 KB).'
  return 'It\'s a binary file.'
}

/**
 * GitHub-style fallback card for files we can't render inline. Shows
 * filename, formatted size, and two big buttons (Download / Open in new
 * tab). Used for binary files and over-cap text/image files.
 */
export const UnsupportedFileView: Component<UnsupportedFileViewProps> = (props) => {
  const titleId = createUniqueId()

  const name = createMemo(() => basename(props.filePath, props.flavor))
  const ext = createMemo(() => getExt(name()))
  const IconComp = createMemo(() => pickIcon(props.reason, ext()))

  const onDownload = () => {
    void downloadFileFromWorker(props.workerId, props.filePath, props.flavor)
  }
  const onOpen = () => {
    void openFileInNewTab(props.workerId, props.filePath, props.flavor)
  }

  return (
    <div class={styles.unsupportedWrapper}>
      <div
        class={styles.unsupportedCard}
        role="region"
        aria-labelledby={titleId}
      >
        <Dynamic
          component={IconComp()}
          size={48}
          class={styles.unsupportedIcon}
          aria-hidden="true"
          data-testid="unsupported-file-icon"
        />
        <h2 class={styles.unsupportedHeader}>{headerFor(props.reason)}</h2>
        <p class={styles.unsupportedSubtext}>{subtextFor(props.reason)}</p>
        <div id={titleId} class={styles.unsupportedFilename}>{name()}</div>
        <div class={styles.unsupportedSize}>{formatBytes(props.totalSize)}</div>
        <div class={styles.unsupportedButtonRow}>
          <button
            type="button"
            class={styles.unsupportedPrimaryButton}
            data-variant="primary"
            data-testid="unsupported-download-button"
            aria-label={`Download ${name()}`}
            onClick={onDownload}
          >
            Download
          </button>
          <button
            type="button"
            class={styles.unsupportedSecondaryButton}
            data-variant="secondary"
            data-testid="unsupported-open-button"
            aria-label={`Open ${name()} in new tab`}
            onClick={onOpen}
          >
            Open in new tab
          </button>
        </div>
      </div>
    </div>
  )
}
