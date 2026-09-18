import { useState, useMemo } from "react"
import { AccountRow, filterAccounts } from "@/features/account-pool"
import type { AccountSummary } from "@/entities/account"

export interface AccountTableProps {
  accounts: AccountSummary[]
  isLoading?: boolean
  isError?: boolean
  errorMessage?: string
  isBusy?: boolean
  onValidate: (id: string) => void
  onEnable: (id: string) => void
  onDisable: (id: string) => void
  onRelogin: (id: string) => void
  onDelete: (id: string) => void
  onRefresh?: () => void
  search?: string
  onSearchChange?: (search: string) => void
  providerFilter?: string
  onProviderFilterChange?: (provider: string) => void
  statusFilter?: string
  onStatusFilterChange?: (status: string) => void
  providers?: Array<{ key: string; displayName?: string }>
  onAddAccount?: () => void
}

export function AccountTable({
  accounts,
  isLoading = false,
  isError = false,
  errorMessage = "Không thể tải danh sách tài khoản từ máy chủ backend.",
  isBusy = false,
  onValidate,
  onEnable,
  onDisable,
  onRelogin,
  onDelete,
  onRefresh,
  search: externalSearch,
  onSearchChange,
  providerFilter: externalProviderFilter,
  onProviderFilterChange,
  statusFilter: externalStatusFilter,
  onStatusFilterChange,
  providers: externalProviders,
  onAddAccount,
}: AccountTableProps) {
  const [internalSearch, setInternalSearch] = useState("")
  const [internalProviderFilter, setInternalProviderFilter] = useState("all")
  const [internalStatusFilter, setInternalStatusFilter] = useState("all")

  const search = externalSearch !== undefined ? externalSearch : internalSearch
  const setSearch = onSearchChange || setInternalSearch

  const providerFilter = externalProviderFilter !== undefined ? externalProviderFilter : internalProviderFilter
  const setProviderFilter = onProviderFilterChange || setInternalProviderFilter

  const statusFilter = externalStatusFilter !== undefined ? externalStatusFilter : internalStatusFilter
  const setStatusFilter = onStatusFilterChange || setInternalStatusFilter

  const filteredAccounts = useMemo(() => {
    return filterAccounts(accounts, search, providerFilter, statusFilter)
  }, [accounts, search, providerFilter, statusFilter])

  const availableProviders = useMemo(() => {
    if (externalProviders && externalProviders.length > 0) {
      return externalProviders
    }
    const uniqueKeys = Array.from(new Set(accounts.map((a) => a.providerKey)))
    return uniqueKeys.map((key) => ({ key, displayName: key }))
  }, [accounts, externalProviders])

  return (
    <div className="flex flex-col gap-4">
      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
        <div className="flex flex-1 items-center gap-2 min-w-[240px]">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Tìm kiếm tài khoản theo tên hoặc ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-full rounded-lg border border-border bg-secondary/50 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            />
            <svg
              className="absolute left-2.5 top-2 size-4 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="h-8 rounded-lg border border-border bg-secondary/50 px-2.5 text-xs text-foreground focus:outline-none cursor-pointer"
          >
            <option value="all">Tất cả Provider</option>
            {availableProviders.map((p) => (
              <option key={p.key} value={p.key}>
                {p.displayName || p.key}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 rounded-lg border border-border bg-secondary/50 px-2.5 text-xs text-foreground focus:outline-none cursor-pointer"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Active</option>
            <option value="auth_required">Cần đăng nhập</option>
            <option value="cooldown">Cooldown</option>
            <option value="disabled">Disabled</option>
          </select>

          {onRefresh && (
            <button
              onClick={onRefresh}
              className="h-8 px-2.5 rounded-lg border border-border bg-secondary text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Làm mới danh sách"
            >
              Làm mới
            </button>
          )}

          {onAddAccount && (
            <button
              onClick={onAddAccount}
              className="h-8 px-3 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-xs font-semibold text-white shadow-sm hover:from-blue-500 hover:to-indigo-500 active:scale-95 transition-all cursor-pointer"
            >
              + Add account
            </button>
          )}
        </div>
      </div>

      {/* Error State */}
      {isError && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-8 text-center text-sm text-rose-300">
          {errorMessage}
        </div>
      )}

      {/* Loading State */}
      {isLoading && !isError && (
        <div className="rounded-xl border border-border bg-card/60 p-12 text-center text-sm text-muted-foreground">
          Đang tải danh sách tài khoản…
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && filteredAccounts.length === 0 && (
        <div className="rounded-xl border border-border bg-card/60 p-12 text-center text-sm text-muted-foreground">
          {accounts.length === 0
            ? "Chưa có tài khoản nào trong pool. Hãy nhấn \"+ Add account\" để liên kết tài khoản đầu tiên."
            : "Không tìm thấy tài khoản phù hợp với bộ lọc."}
        </div>
      )}

      {/* Account Rows List */}
      {!isLoading && !isError && filteredAccounts.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {filteredAccounts.map((account) => (
            <AccountRow
              key={account.id}
              account={account}
              onValidate={onValidate}
              onEnable={onEnable}
              onDisable={onDisable}
              onRelogin={onRelogin}
              onDelete={onDelete}
              isBusy={isBusy}
            />
          ))}
        </div>
      )}
    </div>
  )
}
