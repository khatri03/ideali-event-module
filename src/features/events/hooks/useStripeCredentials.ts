import { useQuery } from "@tanstack/react-query"
import { fetchStripePublicCredentials } from "@/api/stripe"

export function useStripeCredentials(paymentAccountUniqueId?: string | null) {
  return useQuery({
    queryKey: ["stripe-credentials", paymentAccountUniqueId],
    queryFn: () => fetchStripePublicCredentials(paymentAccountUniqueId!),
    enabled: Boolean(paymentAccountUniqueId),
    staleTime: Infinity,
  })
}
