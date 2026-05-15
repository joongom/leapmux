import type { PathFlavor } from '~/lib/paths'
import * as workerRpc from '~/api/workerRpc'
import { basename } from '~/lib/paths'

// Chunk size for streaming file reads when downloading. 1 MiB stays well
// under any reasonable backend max-message cap while keeping round-trip
// count manageable for multi-megabyte files.
const DOWNLOAD_CHUNK_SIZE = 1 << 20

/**
 * Read `path` from the worker as a single in-memory Blob. Chunked via
 * `readFile(offset, limit)` so size is bounded only by the worker's
 * max-message cap. Optional `mimeType` is forwarded into the Blob's
 * `type` so `window.open(blobUrl)` can inline-render (browsers ignore
 * the URL extension and use Content-Type).
 *
 * Kept module-private — callers should use `downloadFileFromWorker` or
 * `openFileInNewTab` which handle UI side-effects (anchor click /
 * `window.open`) on top of this primitive.
 */
async function fetchFileBlob(workerId: string, path: string, mimeType?: string): Promise<Blob> {
  const stat = await workerRpc.statFile(workerId, { workerId, path })
  const totalSize = Number(stat.info?.size ?? 0n)

  const chunks: BlobPart[] = []
  let received = 0
  if (totalSize > 0) {
    while (received < totalSize) {
      const resp = await workerRpc.readFile(workerId, {
        workerId,
        path,
        offset: BigInt(received),
        limit: BigInt(DOWNLOAD_CHUNK_SIZE),
      })
      const part = resp.content
      if (part.length === 0)
        break
      // Copy into a fresh ArrayBuffer-backed view to satisfy Blob's
      // BlobPart bound (which excludes SharedArrayBuffer-backed views).
      const copy = new Uint8Array(part.length)
      copy.set(part)
      chunks.push(copy)
      received += part.length
    }
  }

  return mimeType !== undefined ? new Blob(chunks, { type: mimeType }) : new Blob(chunks)
}

/**
 * Read `path` from the worker and trigger a browser download. Files are
 * fetched in chunks via `readFile(offset, limit)` so size is bounded only
 * by the worker's max-message cap, not by a single response.
 */
export async function downloadFileFromWorker(workerId: string, path: string, flavor: PathFlavor): Promise<void> {
  try {
    const blob = await fetchFileBlob(workerId, path)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = basename(path, flavor)
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
    // Revoke after the browser has a chance to start the download.
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  catch (err) {
    // Surface failures via the browser alert — the tree has no dedicated
    // toast layer yet, and a silent no-op is worse than a noisy one.
    const msg = err instanceof Error ? err.message : String(err)
    // eslint-disable-next-line no-alert -- intentional user-facing notice
    alert(`Failed to download ${basename(path, flavor)}: ${msg}`)
  }
}

/**
 * Extensions that browsers can inline-render via `window.open(blobUrl)`
 * provided the Blob carries a matching `type`. Frozen per spec §3.
 */
const INLINE_EXT_MIME: Readonly<Record<string, string>> = {
  '.md': 'text/markdown',
  '.txt': 'text/plain',
  '.log': 'text/plain',
  '.csv': 'text/csv',
  '.json': 'application/json',
  '.yaml': 'text/plain',
  '.yml': 'text/plain',
  '.toml': 'text/plain',
  '.xml': 'application/xml',
  '.html': 'text/html',
  '.htm': 'text/html',
  '.svg': 'image/svg+xml',
  // Common image / PDF — `image/*` and `application/pdf` per spec.
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
}

function getExt(name: string): string {
  const i = name.lastIndexOf('.')
  if (i < 0)
    return ''
  return name.substring(i).toLowerCase()
}

/**
 * Open `path` in a new tab if its extension is in the inline set;
 * otherwise fall through to the chunked download path. If the browser
 * blocks the popup, also fall through to download.
 */
export async function openFileInNewTab(workerId: string, path: string, flavor: PathFlavor): Promise<void> {
  const name = basename(path, flavor)
  const ext = getExt(name)
  const mime = INLINE_EXT_MIME[ext]
  if (mime === undefined) {
    // Not inline-eligible — short-circuit to download without re-fetching.
    await downloadFileFromWorker(workerId, path, flavor)
    return
  }

  try {
    const blob = await fetchFileBlob(workerId, path, mime)
    const url = URL.createObjectURL(blob)
    const w = window.open(url, '_blank', 'noopener')
    if (w === null) {
      // Popup blocked — surface the failure rather than silently triggering
      // a download the user didn't ask for. No toast layer yet, so `alert`
      // is the least-bad option.
      URL.revokeObjectURL(url)
      // eslint-disable-next-line no-alert -- intentional user-facing notice
      alert('Popup blocked — allow popups for this site to open files in a new tab, or use the Download button.')
      return
    }
    // Revoke when the page is hidden/closed; the opened tab will have
    // cached the blob's bytes by then.
    window.addEventListener('pagehide', () => URL.revokeObjectURL(url), { once: true })
  }
  catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    // eslint-disable-next-line no-alert -- intentional user-facing notice
    alert(`Failed to open ${name}: ${msg}`)
  }
}
