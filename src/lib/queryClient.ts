import { QueryClient } from "@tanstack/react-query"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 1,
      // Without this, a stale query only refetches on its next mount or manual invalidation — leaving a tab
      // backgrounded past staleTime and returning to it shows old data until an explicit page refresh.
      refetchOnWindowFocus: true,
    },
  },
})
