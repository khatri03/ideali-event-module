import { useEffect, useState } from "react"

/**
 * Whether the browser currently believes it can reach the network. Venues lose signal, and a door
 * screen that keeps accepting scans it cannot send would tell staff someone was admitted when nobody
 * was recorded.
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true)
    }

    function handleOffline() {
      setIsOnline(false)
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  return isOnline
}
