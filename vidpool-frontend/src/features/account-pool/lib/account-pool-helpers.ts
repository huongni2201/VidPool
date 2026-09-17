import type { AccountSummary } from "@/entities/account"

export function filterAccounts(
  accounts: AccountSummary[],
  search: string,
  providerKey: string,
  status: string,
): AccountSummary[] {
  return accounts.filter((acc) => {
    if (providerKey !== "all" && acc.providerKey !== providerKey) return false
    if (status !== "all" && acc.status !== status) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      const matchesName = acc.displayName?.toLowerCase().includes(q) ?? false
      const matchesId = acc.externalIdentity?.toLowerCase().includes(q) ?? false
      const matchesProvider = acc.providerKey.toLowerCase().includes(q)
      return matchesName || matchesId || matchesProvider
    }
    return true
  })
}
