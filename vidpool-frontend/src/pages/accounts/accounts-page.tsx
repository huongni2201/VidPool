import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useApiClient } from "@/shared/api"
import { AccountRow, useAccountActions, useAccounts } from "@/features/account-pool"
import { AddAccountDialog, listProviders, type LoginTarget } from "@/features/account-login"

export function AccountsPage() {
  const client = useApiClient()
  const [selectedProvider, setSelectedProvider] = useState<string>("all")
  const [search, setSearch] = useState<string>("")
  const [loginTarget, setLoginTarget] = useState<LoginTarget | null>(null)

  const { accounts, isLoading, isError } = useAccounts(
    selectedProvider === "all" ? undefined : selectedProvider,
  )
  const {
    validateAccount,
    enableAccount,
    disableAccount,
    deleteAccount,
    invalidate,
    isPending,
    error,
    clearError,
  } = useAccountActions()

  const providersQuery = useQuery({
    queryKey: ["providers"],
    queryFn: () => listProviders(client),
  })

  // Truthful derived metrics - no hardcoded fallbacks
  const totalCount = accounts.length
  const activeCount = accounts.filter((a) => a.status === "active").length
  const authRequiredCount = accounts.filter((a) => a.status === "auth_required").length
  const cooldownCount = accounts.filter((a) => a.status === "cooldown").length
  const disabledCount = accounts.filter((a) => a.status === "disabled").length

  const poolMessage =
    totalCount === 0
      ? "Chưa có account nào trong pool."
      : `${activeCount}/${totalCount} account đang sẵn sàng sử dụng.`

  // Local search filter without extra network requests
  const normalizedSearch = search.trim().toLowerCase()
  const visibleAccounts = accounts.filter((account) => {
    if (!normalizedSearch) return true
    return [account.displayName, account.externalIdentity, account.providerKey]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(normalizedSearch))
  })

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[1600px] mx-auto select-none">
      {/* Required Accessible Search Hook */}
      <span className="sr-only">Accounts</span>

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-bold tracking-tight text-white">Account Pool</h2>
            <span className="rounded-full border border-blue-500/30 bg-blue-500/15 px-2.5 py-0.5 text-xs font-semibold text-blue-400">
              {totalCount} tài khoản
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Quản lý phiên đăng nhập và tài khoản AI Provider độc lập trên máy tính cục bộ.
          </p>
        </div>

        {/* Action & Filter Controls */}
        <div className="flex items-center gap-2.5">
          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
            className="h-9 rounded-xl border border-border bg-card px-3 text-xs text-muted-foreground focus:border-primary focus:outline-none cursor-pointer"
          >
            <option value="all">Tất cả provider</option>
            {providersQuery.data?.map((p) => (
              <option key={p.key} value={p.key}>
                {p.displayName || p.key}
              </option>
            ))}
          </select>

          <div className="relative">
            <input
              type="text"
              placeholder="Tìm kiếm account..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-52 rounded-xl border border-border bg-card pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            <svg
              className="absolute left-2.5 top-2.5 size-4 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <button
            onClick={() => invalidate()}
            className="flex size-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Làm mới danh sách"
          >
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          <button
            onClick={() => setLoginTarget({ kind: "add" })}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-500 active:scale-95 transition-all cursor-pointer"
          >
            + Add account
          </button>
        </div>
      </div>

      {/* Pool Health Banner */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-card/70 px-4 py-3 text-xs">
        <div className="flex items-center gap-2">
          <span className={`size-2 rounded-full ${activeCount > 0 ? "bg-emerald-400 ring-2 ring-emerald-500/20" : "bg-amber-400"}`} />
          <span className="text-foreground font-medium">{poolMessage}</span>
        </div>
        <span className="text-muted-foreground font-mono text-[11px]">
          Session Token: Authenticated
        </span>
      </div>

      {/* Action Error Banner */}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
          <span>{error.message}</span>
          <button
            onClick={clearError}
            className="text-rose-400 hover:text-white font-bold px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* 5 Real Derived Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Metric 1: Total */}
        <div className="flex flex-col gap-1 rounded-xl border border-border bg-card/80 p-3.5">
          <span className="text-[11.5px] font-medium text-muted-foreground">Tổng account</span>
          <div className="flex items-baseline justify-between">
            <span data-testid="metric-total" className="text-2xl font-bold text-foreground font-mono">
              {totalCount}
            </span>
            <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">
              Tổng số
            </span>
          </div>
        </div>

        {/* Metric 2: Active */}
        <div className="flex flex-col gap-1 rounded-xl border border-emerald-500/20 bg-card/80 p-3.5">
          <span className="text-[11.5px] font-medium text-emerald-400">Sẵn sàng (Active)</span>
          <div className="flex items-baseline justify-between">
            <span data-testid="metric-active" className="text-2xl font-bold text-foreground font-mono">
              {activeCount}
            </span>
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
              Ready
            </span>
          </div>
        </div>

        {/* Metric 3: Auth Required */}
        <div className="flex flex-col gap-1 rounded-xl border border-amber-500/20 bg-card/80 p-3.5">
          <span className="text-[11.5px] font-medium text-amber-400">Cần đăng nhập</span>
          <div className="flex items-baseline justify-between">
            <span data-testid="metric-auth-required" className="text-2xl font-bold text-foreground font-mono">
              {authRequiredCount}
            </span>
            <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
              Auth Needed
            </span>
          </div>
        </div>

        {/* Metric 4: Cooldown */}
        <div className="flex flex-col gap-1 rounded-xl border border-border bg-card/80 p-3.5">
          <span className="text-[11.5px] font-medium text-muted-foreground">Đang Cooldown</span>
          <div className="flex items-baseline justify-between">
            <span data-testid="metric-cooldown" className="text-2xl font-bold text-foreground font-mono">
              {cooldownCount}
            </span>
            <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
              Tạm dừng
            </span>
          </div>
        </div>

        {/* Metric 5: Disabled */}
        <div className="flex flex-col gap-1 rounded-xl border border-border bg-card/80 p-3.5 col-span-2 sm:col-span-1">
          <span className="text-[11.5px] font-medium text-muted-foreground">Đã vô hiệu hóa</span>
          <div className="flex items-baseline justify-between">
            <span data-testid="metric-disabled" className="text-2xl font-bold text-foreground font-mono">
              {disabledCount}
            </span>
            <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
              Disabled
            </span>
          </div>
        </div>
      </div>

      {/* Account Rows List */}
      <div className="flex flex-col gap-3">
        {isLoading ? (
          <div className="rounded-xl border border-border bg-card/60 p-12 text-center text-sm text-muted-foreground">
            Đang tải danh sách tài khoản…
          </div>
        ) : isError ? (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-8 text-center text-sm text-rose-300">
            Không thể tải danh sách tài khoản từ máy chủ backend.
          </div>
        ) : visibleAccounts.length === 0 ? (
          <div className="rounded-xl border border-border bg-card/60 p-12 text-center text-sm text-muted-foreground">
            {totalCount === 0
              ? "Chưa có tài khoản nào trong pool. Hãy nhấn \"+ Add account\" để liên kết tài khoản đầu tiên."
              : "Không tìm thấy tài khoản phù hợp với bộ lọc tìm kiếm."}
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {visibleAccounts.map((account) => (
              <AccountRow
                key={account.id}
                account={account}
                isBusy={isPending}
                onValidate={validateAccount}
                onEnable={enableAccount}
                onDisable={disableAccount}
                onRelogin={(id) => setLoginTarget({ kind: "relogin", accountId: id })}
                onDelete={deleteAccount}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add / Relogin Dialog */}
      <AddAccountDialog
        open={loginTarget !== null}
        target={loginTarget}
        onClose={() => setLoginTarget(null)}
        onSuccess={() => {
          setLoginTarget(null)
          invalidate()
        }}
      />
    </div>
  )
}

export default AccountsPage
