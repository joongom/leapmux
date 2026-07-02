// @refresh reload
import { mount, StartClient } from '@solidjs/start/client'

// Vinxi's generated client handler probes this module for a default export even
// though the Solid client entry only needs the side-effectful mount call below.
// Exporting a no-op default keeps the bundler quiet and is safe to ignore.
export default function EntryClient(): null {
  return null
}

// "ResizeObserver loop completed with undelivered notifications." is a benign
// browser notice (delivery is deferred to the next frame), unavoidable in rare
// bursts with the ResizeObserver-driven virtualized chat despite the rAF
// deferrals in ~/lib/resizeObserver. The dev error overlay surfaces every
// window error event as a popup, so swallow just this message before it gets
// there (capture phase, ahead of the overlay's own listener). Dev-only: no
// overlay exists in production, where the warning is already silent.
if (import.meta.env.DEV) {
  const RESIZE_OBSERVER_LOOP_RE = /^ResizeObserver loop (?:completed with undelivered notifications|limit exceeded)/
  window.addEventListener('error', (event) => {
    if (RESIZE_OBSERVER_LOOP_RE.test(event.message))
      event.stopImmediatePropagation()
  }, { capture: true })
}

mount(() => <StartClient />, document.getElementById('app')!)
