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
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/80 p-3 shadow-sm backdrop-blur-sm">
        <div className="flex flex-1 items-center gap-2 min-w-[240px]">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Tìm kiếm tài khoản theo tên hoặc ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-xl border border-border/60 bg-secondary/40 pl-9 pr-8 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/40 transition-all"
            />
            <svg
              className="absolute left-3 top-2.5 size-4 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground text-xs"
                title="Xoá tìm kiếm"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="h-9 rounded-xl border border-border/60 bg-secondary/40 px-3 text-xs text-foreground focus:outline-none focus:border-primary/60 cursor-pointer"
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
            className="h-9 rounded-xl border border-border/60 bg-secondary/40 px-3 text-xs text-foreground focus:outline-none focus:border-primary/60 cursor-pointer"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Sẵn sàng (Active)</option>
            <option value="auth_required">Cần đăng nhập</option>
            <option value="cooldown">Đang Cooldown</option>
            <option value="disabled">Đã vô hiệu hoá</option>
          </select>

          {onRefresh && (
            <button
              onClick={onRefresh}
              className="flex h-9 items-center gap-1.5 px-3 rounded-xl border border-border/60 bg-secondary/40 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors cursor-pointer"
              title="Làm mới danh sách tài khoản"
            >
              <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Làm mới</span>
            </button>
          )}
        </div>
      </div>

      {/* Error State */}
      {isError && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-8 text-center text-sm text-rose-300">
          {errorMessage}
        </div>
      )}

      {/* Loading State */}
      {isLoading && !isError && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card/40 p-12 text-center text-sm text-muted-foreground">
          <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span>Đang tải danh sách tài khoản…</span>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && filteredAccounts.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/70 bg-card/30 p-12 text-center backdrop-blur-sm">
          {accounts.length === 0 ? (
            <>
              <div className="flex size-14 items-center justify-center rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-400 shadow-xl shadow-blue-500/10 mb-3">
                <svg className="size-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h4 className="text-base font-bold text-foreground">
                Chưa có tài khoản nào trong pool
              </h4>
              <p className="text-xs text-muted-foreground max-w-md mt-1 leading-relaxed">
                Kết nối phiên làm việc của các AI Provider để bắt đầu tạo kịch bản, sinh cảnh video và lồng tiếng tự động.
              </p>
              {onAddAccount && (
                <button
                  onClick={onAddAccount}
                  className="mt-4 flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-500 active:scale-95 transition-all cursor-pointer"
                >
                  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>+ Thêm tài khoản đầu tiên</span>
                </button>
              )}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-[11px] text-muted-foreground pt-4 border-t border-border/40 w-full max-w-sm">
                <span>Hỗ trợ:</span>
                <span className="rounded-md bg-secondary/80 px-2 py-0.5 font-medium text-foreground">Dreamina</span>
                <span className="rounded-md bg-secondary/80 px-2 py-0.5 font-medium text-foreground">Seedance</span>
                <span className="rounded-md bg-secondary/80 px-2 py-0.5 font-medium text-foreground">Kling AI</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex size-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground mb-3">
                <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h4 className="text-sm font-bold text-foreground">
                Không tìm thấy tài khoản phù hợp với bộ lọc
              </h4>
              <p className="text-xs text-muted-foreground max-w-sm mt-1">
                Không có tài khoản nào khớp với từ khoá "{search}" hoặc các bộ lọc đã chọn.
              </p>
              <button
                onClick={() => {
                  setSearch("")
                  setProviderFilter("all")
                  setStatusFilter("all")
                }}
                className="mt-3 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-foreground hover:bg-studio-hover transition-colors cursor-pointer"
              >
                Đặt lại bộ lọc
              </button>
            </>
          )}
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
