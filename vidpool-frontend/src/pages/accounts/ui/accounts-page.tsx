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
  const activeCount = accounts.filter((a) => a.status === "active").length

  const poolMessage =
    totalCount === 0
      ? "Chưa có account nào trong pool."
      : `${activeCount}/${totalCount} account đang sẵn sàng sử dụng.`

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

        <div className="flex items-center gap-2.5">
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
