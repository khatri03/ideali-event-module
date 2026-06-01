import type { AuthUser } from "@/types"
import type { AuthOrganizerDetail, AuthSessionData, AuthUserDetail } from "@/api/types"

interface AuthSession {
  user: AuthUser | null
  organizer: AuthOrganizerDetail | null
}

let session: AuthSession = {
  user: null,
  organizer: null,
}

function mapUser(userDetail: AuthUserDetail): AuthUser {
  const role = userDetail.roles?.[0] ?? "Organizer"

  return {
    id: String(userDetail.userId),
    name: userDetail.name,
    email: userDetail.email,
    role,
    avatar: userDetail.logoUrl ?? undefined,
  }
}

export function sessionDataToUser(data: AuthSessionData): AuthUser {
  return mapUser(data.userDetail)
}

export const auth = {
  setSession: (data: AuthSessionData) => {
    session = {
      user: mapUser(data.userDetail),
      organizer: data.organizerDetail,
    }
  },
  setUser: (user: AuthUser | null) => {
    session = { ...session, user }
  },
  getUser: () => session.user,
  getOrganizer: () => session.organizer,
  clear: () => {
    session = {
      user: null,
      organizer: null,
    }
  },
  isAuthenticated: () => session.user !== null,
}
