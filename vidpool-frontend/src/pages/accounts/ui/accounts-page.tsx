import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useApiClient } from "@/shared/api"
import { useAccountActions, useAccounts } from "@/features/account-pool"
import { AddAccountDialog, listProviders, type LoginTarget } from "@/features/account-login"
import { AccountTable } from "@/widgets/account-table"
import { AccountPoolSummary } from "@/widgets/account-pool-summary"

export function AccountsPage() {
  const client = useApiClient()
  const [selectedProvider, setSelectedProvider] = useState<string>("all")
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

  // Truthful derived metrics
  const totalCount = accounts.length
  const availableCount = accounts.filter((a) => a.isAvailable).length
  const inUseCount = accounts.filter((a) => a.isLeased).length
  const activeCount = accounts.filter((a) => a.status === "active").length
  const readyCount = availableCount > 0 || totalCount === 0 ? availableCount : activeCount

  const poolMessage =
    totalCount === 0
      ? "Chưa có account nào trong pool."
      : inUseCount > 0
        ? `${readyCount}/${totalCount} account sẵn sàng sử dụng (${inUseCount} đang được sử dụng).`
        : `${readyCount}/${totalCount} account đang sẵn sàng sử dụng.`

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

        {/* The ONLY primary action button on the page */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setLoginTarget({ kind: "add" })}
            className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-blue-500/25 hover:from-blue-500 hover:to-indigo-500 hover:shadow-blue-500/35 active:scale-95 transition-all cursor-pointer"
          >
            <svg className="size-4 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 4v16m8-8H4" />
            </svg>
            <span>+ Thêm tài khoản mới</span>
          </button>
        </div>
      </div>

      {/* Pool Health Banner */}
      <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-card/70 px-4 py-3 text-xs shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <span className={`size-2 rounded-full ${readyCount > 0 ? "bg-emerald-400 ring-4 ring-emerald-500/20 animate-pulse" : "bg-amber-400"}`} />
          <span className="text-foreground font-medium">{poolMessage}</span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-muted-foreground font-mono text-[11px]">
          <svg className="size-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span>Isolated Local Browser Profiles</span>
        </div>
      </div>

      {/* Action Error Banner */}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
          <span>{error.message}</span>
          <button
            onClick={clearError}
            className="text-rose-400 hover:text-white font-bold px-2 py-0.5 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 5 Real Derived Metrics Cards Widget */}
      <AccountPoolSummary accounts={accounts} variant="detailed" />

      {/* Reusable Account Table Widget */}
      <AccountTable
        accounts={accounts}
        isLoading={isLoading}
        isError={isError}
        isBusy={isPending}
        onValidate={validateAccount}
        onEnable={enableAccount}
        onDisable={disableAccount}
        onRelogin={(id) => setLoginTarget({ kind: "relogin", accountId: id })}
        onDelete={deleteAccount}
        onRefresh={() => invalidate()}
        providerFilter={selectedProvider}
        onProviderFilterChange={setSelectedProvider}
        providers={providersQuery.data}
        onAddAccount={() => setLoginTarget({ kind: "add" })}
      />

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
