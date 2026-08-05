/** Thin seam over the browsing context so pages can be driven and asserted without touching `window`. */

export function reloadTab(): void {
  window.location.reload()
}

export function openPath(path: string): void {
  window.location.assign(path)
}

/**
 * Browsers only honour this for a tab their own script opened, and they close asynchronously, so the
 * caller has to check `isTabClosed` a moment later rather than trust the call itself.
 */
export function requestTabClose(): void {
  window.close()
}

export function isTabClosed(): boolean {
  return window.closed
}
