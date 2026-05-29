import { useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { fetchCurrentSession } from "@/api/auth"
import { auth } from "@/lib/auth"

export function useAuthSession() {
  const query = useQuery({
    queryKey: ["auth", "session"],
    queryFn: fetchCurrentSession,
    enabled: !auth.isAuthenticated(),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5,
  })

  useEffect(() => {
    if (query.data) {
      auth.setSession(query.data)
    }
  }, [query.data])

  useEffect(() => {
    if (query.isError) {
      auth.clear()
    }
  }, [query.isError])

  return query
}
