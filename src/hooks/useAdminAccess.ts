import { useAuthSession } from "@/hooks/useAuthSession"
import { auth, sessionDataToUser } from "@/lib/auth"

interface AdminAccess {
  /** False until a user is known, so a page renders nothing rather than redirecting an admin mid-load. */
  isResolved: boolean
  isAdmin: boolean
}

/**
 * The one place admin pages decide whether to render. It is presentation only: every admin endpoint is
 * gated server-side, so this check exists to keep non-admins off screens whose calls would all be refused.
 */
export function useAdminAccess(): AdminAccess {
  const sessionQuery = useAuthSession()
  const user = auth.getUser() ?? (sessionQuery.data ? sessionDataToUser(sessionQuery.data) : null)

  return {
    isResolved: user !== null,
    isAdmin: user?.role === "Admin",
  }
}
