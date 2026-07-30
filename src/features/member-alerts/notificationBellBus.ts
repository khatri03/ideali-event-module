type Listener = () => void

const listeners = new Set<Listener>()

/**
 * Opens the notification bell dropdown from outside React — used by the instant-alert toast, which is
 * rendered imperatively and cannot reach the bell's state through props. A tiny pub/sub keeps this a
 * one-way signal without pulling in a global state library.
 */
export function openNotificationBell() {
  listeners.forEach((listener) => listener())
}

export function subscribeToNotificationBell(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
