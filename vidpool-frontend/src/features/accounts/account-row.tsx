import { useState } from "react"
import { Button } from "@/components/ui/button"
import type { AccountSummary, AccountStatus } from "./types"

interface AccountRowProps {
  account: AccountSummary
  onValidate: (id: string) => void
  onEnable: (id: string) => void
  onDisable: (id: string) => void
  onRelogin: (id: string) => void
  onDelete: (id: string) => void
  isBusy?: boolean
}

function getStatusBadgeClass(status: AccountStatus): string {
  switch (status) {
    case "active":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
    case "auth_required":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
    case "cooldown":
      return "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20"
    case "disabled":
      return "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20"
  }
}

export function AccountRow({
  account,
  onValidate,
  onEnable,
  onDisable,
  onRelogin,
  onDelete,
  isBusy = false,
}: AccountRowProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  return (
    <div
      data-slot="account-row"
      data-testid={`account-row-${account.id}`}
      className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 transition-colors sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">
            {account.displayName || "Unnamed Account"}
          </span>
          <span
            className={`rounded-full border px-2 py-0.5 text-[0.65rem] font-medium tracking-wide uppercase ${getStatusBadgeClass(
              account.status
            )}`}
          >
            {account.status.replace("_", " ")}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
          <span>Provider: <strong className="font-medium text-foreground">{account.providerKey}</strong></span>
          {account.externalIdentity && (
            <span>ID: {account.externalIdentity}</span>
          )}
          {account.lastValidatedAt && (
            <span>Validated: {new Date(account.lastValidatedAt).toLocaleString()}</span>
          )}
          {account.cooldownUntil && (
            <span className="text-orange-500 font-medium">
              Cooldown until: {new Date(account.cooldownUntil).toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {confirmingDelete ? (
          <div className="flex items-center gap-2 bg-destructive/10 p-2 rounded-md border border-destructive/20 text-xs">
            <span className="text-destructive font-medium">
              Deleting this account also deletes its stored browser session.
            </span>
            <Button
              variant="destructive"
              size="xs"
              disabled={isBusy}
              onClick={() => {
                setConfirmingDelete(false)
                onDelete(account.id)
              }}
            >
              Confirm delete
            </Button>
            <Button
              variant="outline"
              size="xs"
              disabled={isBusy}
              onClick={() => setConfirmingDelete(false)}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <>
            {account.status === "auth_required" && (
              <Button
                variant="default"
                size="sm"
                disabled={isBusy}
                onClick={() => onRelogin(account.id)}
              >
                Login again
              </Button>
            )}

            {account.status === "active" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isBusy}
                  onClick={() => onValidate(account.id)}
                >
                  Validate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isBusy}
                  onClick={() => onDisable(account.id)}
                >
                  Disable
                </Button>
              </>
            )}

            {account.status === "cooldown" && (
              <Button
                variant="outline"
                size="sm"
                disabled={isBusy}
                onClick={() => onDisable(account.id)}
              >
                Disable
              </Button>
            )}

            {account.status === "disabled" && (
              <Button
                variant="outline"
                size="sm"
                disabled={isBusy}
                onClick={() => onEnable(account.id)}
              >
                Enable
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              disabled={isBusy}
              className="text-destructive hover:text-destructive"
              onClick={() => setConfirmingDelete(true)}
            >
              Delete
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
