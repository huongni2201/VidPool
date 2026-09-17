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
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
    case "auth_required":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30"
    case "cooldown":
      return "bg-rose-500/15 text-rose-400 border-rose-500/30"
    case "disabled":
      return "bg-zinc-500/15 text-zinc-400 border-zinc-500/30"
  }
}

function getProviderIcon(provider: string) {
  const p = provider.toLowerCase()
  if (p.includes("seaart")) {
    return (
      <div className="flex size-7 items-center justify-center rounded-lg bg-sky-600/20 text-sky-400 border border-sky-500/30 font-bold text-xs">
        SA
      </div>
    )
  }
  if (p.includes("kling")) {
    return (
      <div className="flex size-7 items-center justify-center rounded-lg bg-purple-600/20 text-purple-400 border border-purple-500/30 font-bold text-xs">
        KL
      </div>
    )
  }
  return (
    <div className="flex size-7 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 font-bold text-xs">
      SD
    </div>
  )
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
      className="flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-[#121824] p-3.5 transition-all hover:border-white/[0.14] hover:bg-[#151c2a] sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Checkbox representation */}
        <input
          type="checkbox"
          className="size-4 rounded border-white/[0.2] bg-white/[0.05] accent-blue-600 cursor-pointer"
        />

        {/* Provider Icon */}
        {getProviderIcon(account.providerKey)}

        {/* Identity info */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs text-[#f3f6fc] truncate">
              {account.displayName || account.externalIdentity || "Unnamed Account"}
            </span>
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${getStatusBadgeClass(
                account.status
              )}`}
            >
              {account.status.replace("_", " ")}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-[#64748b] mt-0.5">
            <span>Provider: <strong className="font-medium text-[#9ca8bc] capitalize">{account.providerKey}</strong></span>
            {account.externalIdentity && (
              <span className="truncate">ID: {account.externalIdentity}</span>
            )}
            {account.lastValidatedAt && (
              <span>Validated: {new Date(account.lastValidatedAt).toLocaleTimeString()}</span>
            )}
            {account.cooldownUntil && (
              <span className="text-orange-400 font-medium">
                Cooldown until: {new Date(account.cooldownUntil).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stamina / Quota representation matching Screen 7 */}
      <div className="hidden md:flex flex-col gap-1 w-36 px-2">
        <div className="flex justify-between text-[10.5px] text-[#9ca8bc]">
          <span>Stamina</span>
          <span className="font-medium text-[#f3f6fc]">{account.status === "active" ? "500/500" : "0/500"}</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-white/[0.08] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              account.status === "active" ? "bg-blue-500 w-full" : "bg-zinc-600 w-0"
            }`}
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
        {confirmingDelete ? (
          <div className="flex items-center gap-2 bg-destructive/10 p-2 rounded-lg border border-destructive/20 text-xs">
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
