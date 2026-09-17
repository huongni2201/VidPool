import type { AccountStatus } from "@/entities/account"

export interface AccountFilterState {
  search: string
  providerKey: string
  status: AccountStatus | "all"
}
