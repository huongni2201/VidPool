import { useQuery } from "@tanstack/react-query"
import { useApiClient } from "@/shared/api"
import { listAccounts } from "../accounts-api"
import type { AccountSummary } from "../types"

export function useAccounts() {
  const client = useApiClient()

  const query = useQuery<AccountSummary[]>({
    queryKey: ["accounts"],
    queryFn: () => listAccounts(client),
  })

  return {
    accounts: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  }
}
