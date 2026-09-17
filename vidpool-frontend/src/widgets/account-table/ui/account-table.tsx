import { useState, useMemo } from "react"
import { AccountRow } from "@/features/account-pool"
import { filterAccounts } from "@/features/account-pool"
import type { AccountSummary } from "@/entities/account"

export interface AccountTableProps {
  accounts: AccountSummary[]
  isLoading?: boolean
  isBusy?: boolean
  onValidate: (id: string) => void
  onEnable: (id: string) => void
  onDisable: (id: string) => void
  onRelogin: (id: string) => void
  onDelete: (id: string) => void
  onRefresh?: () => void
}

export function AccountTable({
  accounts,
  isLoading = false,
  isBusy = false,
  onValidate,
  onEnable,
  onDisable,
  onRelogin,
  onDelete,
  onRefresh,
}: AccountTableProps) {
  const [search, setSearch] = useState("")
  const [providerFilter, setProviderFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  const filteredAccounts = useMemo(() => {
    return filterAccounts(accounts, search, providerFilter, statusFilter)
  }, [accounts, search, providerFilter, statusFilter])

  const providers = useMemo(() => {
    return Array.from(new Set(accounts.map((a) => a.providerKey)))
  }, [accounts])

  return (
    <div className="flex flex-col gap-4">
      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-zinc-900/40 p-3">
        <div className="flex flex-1 items-center gap-2 min-w-[240px]">
          <input
            type="text"
            placeholder="Tìm kiếm tài khoản theo tên hoặc ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="h-8 rounded-lg border border-white/10 bg-zinc-950/60 px-2.5 text-xs text-zinc-300 focus:outline-none"
          >
            <option value="all">Tất cả Provider</option>
            {providers.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 rounded-lg border border-white/10 bg-zinc-950/60 px-2.5 text-xs text-zinc-300 focus:outline-none"
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
              className="h-8 px-2.5 rounded-lg border border-white/10 bg-zinc-800 text-xs text-zinc-300 hover:bg-zinc-700 transition-colors"
            >
              Làm mới
            </button>
          )}
        </div>
      </div>

      {/* Account List */}
      {isLoading ? (
        <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-12 text-center text-sm text-zinc-400">
          Đang tải danh sách tài khoản…
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-12 text-center text-sm text-zinc-400">
          {accounts.length === 0
            ? "Chưa có tài khoản nào được kết nối."
            : "Không tìm thấy tài khoản phù hợp với bộ lọc."}
        </div>
      ) : (
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
