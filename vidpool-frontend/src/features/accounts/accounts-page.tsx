import { useState } from "react"
import { Button } from "@/components/ui/button"
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Accounts</h2>
          <p className="text-xs text-muted-foreground">
            Quản lý tài khoản AI provider cho quá trình tạo video
          </p>
        </div>
        <Button onClick={() => setLoginTarget({ kind: "add" })}>+ Add account</Button>
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
        <div className="rounded-lg border border-border p-8 text-center text-sm text-muted-foreground">
          Đang tải danh sách tài khoản…
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          Không thể tải danh sách tài khoản.
        </div>
      )}

      {!isLoading && !isError && accounts.length === 0 && (
        <div
          data-slot="empty-state"
          className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border p-12 text-center"
        >
          <div className="rounded-full bg-muted p-3 text-muted-foreground">
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
