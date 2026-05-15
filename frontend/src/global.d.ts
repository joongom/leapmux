// Build-time globals injected by Vite `define` in `app.config.ts`.

/**
 * Short git SHA of the build the user is running. Surfaced via the
 * `<html data-build="…">` attribute and the dev-mode mobile viewport
 * diagnostic overlay so we can verify which commit is actually live on
 * remote devices.
 */
declare const __BUILD_SHA__: string
