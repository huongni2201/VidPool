import { useState } from "react"
import { Button } from "@/shared/ui/button"
import { AccountStatusBadge } from "@/entities/account"
import type { AccountSummary } from "@/entities/account"

export interface AccountRowProps {
  account: AccountSummary
  onValidate: (id: string) => void
  onEnable: (id: string) => void
  onDisable: (id: string) => void
  onRelogin: (id: string) => void
  onDelete: (id: string) => void
  isBusy?: boolean
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
      className="flex flex-col gap-3 rounded-lg border border-white/10 bg-zinc-900/60 p-4 transition-colors sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-zinc-100">
            {account.displayName || "Unnamed Account"}
          </span>
          <AccountStatusBadge status={account.status} />
        </div>

        <div className="flex flex-wrap items-center gap-x-3 text-xs text-zinc-400">
          <span>Provider: <strong className="font-medium text-zinc-200">{account.providerKey}</strong></span>
          {account.externalIdentity && (
            <span>ID: {account.externalIdentity}</span>
          )}
          {account.lastValidatedAt && (
            <span>Validated: {new Date(account.lastValidatedAt).toLocaleString()}</span>
          )}
          {account.cooldownUntil && (
            <span className="text-amber-400 font-medium">
              Cooldown until: {new Date(account.cooldownUntil).toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {confirmingDelete ? (
          <div className="flex items-center gap-2 bg-rose-500/10 p-2 rounded-md border border-rose-500/20 text-xs">
            <span className="text-rose-400 font-medium">
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
              className="text-rose-400 hover:text-rose-300"
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
