import { useQuery } from "@tanstack/react-query"
import { useApiClient } from "@/shared/api"
import { listAccounts } from "../api/account-pool-api"
import type { AccountSummary } from "@/entities/account"

export function useAccounts(providerKey?: string) {
  const client = useApiClient()

  const query = useQuery<AccountSummary[]>({
    queryKey: ["accounts", providerKey ?? "all"],
    queryFn: () => listAccounts(client, providerKey),
  })

  return {
    accounts: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  }
}
