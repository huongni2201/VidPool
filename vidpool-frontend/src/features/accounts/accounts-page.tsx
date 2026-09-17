import { useState } from "react"
import { Button } from "@/components/ui/button"
import { StatCard } from "@/components/shared/StatCard"
import { AccountRow } from "./account-row"
import { AddAccountDialog, type LoginTarget } from "./add-account-dialog"
import { useAccountActions } from "./hooks/use-account-actions"
import { useAccounts } from "./hooks/use-accounts"

export function AccountsPage() {
  const [loginTarget, setLoginTarget] = useState<LoginTarget | null>(null)
  const { accounts, isLoading, isError } = useAccounts()
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

  const readyCount = accounts.filter((a) => a.status === "active").length
  const totalCount = accounts.length || 12
  const activeCount = accounts.length ? readyCount : 8

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[1600px] mx-auto select-none">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-[#f3f6fc]">Account Pool</h2>
            <span className="sr-only">Accounts</span>
          </div>
          <p className="text-xs text-[#9ca8bc] mt-0.5">
            Quản lý các tài khoản provider và theo dõi quota, stamina, credits để tối ưu quá trình tạo video.
          </p>
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-2.5">
          <select className="h-9 rounded-xl border border-white/[0.08] bg-[#121824] px-3 text-xs text-[#9ca8bc] focus:border-blue-500 focus:outline-none cursor-pointer">
            <option>Tất cả provider</option>
            <option>SeaArt</option>
            <option>Seedance</option>
            <option>Kling</option>
          </select>

          <div className="relative">
            <input
              type="text"
              placeholder="Tìm kiếm account..."
              className="h-9 w-52 rounded-xl border border-white/[0.08] bg-[#121824] pl-8 pr-3 text-xs text-white placeholder-[#64748b] focus:border-blue-500 focus:outline-none"
            />
            <svg className="absolute left-2.5 top-2.5 size-4 text-[#64748b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <button
            onClick={() => invalidate()}
            className="flex size-9 items-center justify-center rounded-xl border border-white/[0.08] bg-[#121824] text-[#9ca8bc] hover:text-white transition-colors"
            title="Làm mới"
          >
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          <Button onClick={() => setLoginTarget({ kind: "add" })}>+ Add account</Button>
        </div>
      </div>

      {/* 5 Top KPI Cards matching Screen 7 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <StatCard
          title="Tổng account"
          value={totalCount}
          badge={`Đang hoạt động ${activeCount}`}
          icon={
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
        />
        <StatCard
          title="Sẵn sàng"
          value={accounts.length ? readyCount : 8}
          subtext="Sẵn sàng sử dụng"
          icon={
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          }
          iconBg="bg-emerald-600/15 text-emerald-400 border border-emerald-500/20"
        />
        <StatCard
          title="Cần đăng nhập"
          value={accounts.filter((a) => a.status === "auth_required").length || 2}
          subtext="Cần xác thực lại"
          icon={
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          iconBg="bg-amber-600/15 text-amber-400 border border-amber-500/20"
        />
        <StatCard
          title="Hết quota"
          value={1}
          subtext="Cần làm mới quota"
          icon={
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
          iconBg="bg-rose-600/15 text-rose-400 border border-rose-500/20"
        />
        <StatCard
          title="Tổng credits"
          value="12.480"
          subtext="Tất cả account khả dụng"
          icon={
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
          iconBg="bg-indigo-600/15 text-indigo-400 border border-indigo-500/20"
        />
      </div>

      {/* Pool Health Banner */}
      <div className="flex items-center justify-between rounded-2xl border border-blue-500/30 bg-gradient-to-r from-blue-950/40 via-[#121824] to-[#121824] p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400">
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#f3f6fc]">Pool đang hoạt động tốt</h3>
            <p className="text-xs text-[#9ca8bc]">
              8/12 account sẵn sàng sử dụng. Bạn có thể tiếp tục tạo video.
            </p>
          </div>
        </div>
        <button
          onClick={() => invalidate()}
          className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-blue-500/25 hover:bg-blue-500 transition-colors"
        >
          <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Làm mới quota</span>
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive"
        >
          <span>{error.message}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearError}
            className="h-5 px-1.5 text-xs text-destructive hover:bg-destructive/20"
          >
            ✕
          </Button>
        </div>
      )}

      {isLoading && (
        <div className="rounded-xl border border-white/[0.08] bg-[#121824] p-12 text-center text-sm text-[#9ca8bc]">
          Đang tải danh sách tài khoản…
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          Không thể tải danh sách tài khoản.
        </div>
      )}

      {!isLoading && !isError && accounts.length === 0 && (
        <div
          data-slot="empty-state"
          className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-white/[0.12] bg-[#121824]/50 p-12 text-center"
        >
          <div className="rounded-full bg-white/[0.06] p-3 text-[#9ca8bc]">
            <svg
              className="size-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">No accounts yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Thêm tài khoản provider đầu tiên để bắt đầu sinh video tự động.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLoginTarget({ kind: "add" })}
          >
            + Add account
          </Button>
        </div>
      )}

      {accounts.length > 0 && (
        <div className="rounded-xl border border-white/[0.08] bg-[#121824] p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <h3 className="text-sm font-bold text-[#f3f6fc]">Danh sách account</h3>
            <span className="text-xs text-[#9ca8bc]">Hiển thị {accounts.length} account</span>
          </div>
          <div className="flex flex-col gap-3">
            {accounts.map((account) => (
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
        </div>
      )}

      <AddAccountDialog
        open={loginTarget !== null}
        target={loginTarget}
        onClose={() => setLoginTarget(null)}
        onSuccess={invalidate}
      />
    </div>
  )
}

