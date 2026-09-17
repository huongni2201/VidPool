import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useApiClient } from "@/app/api-client-context"
import { Button } from "@/components/ui/button"
import {
  cancelNewLogin,
  cancelRelogin,
  completeLogin,
  listProviders,
  startLogin,
  startRelogin,
} from "./accounts-api"
import type { ProviderDefinition } from "./types"

type DialogState =
  | "choose_provider"
  | "starting"
  | "waiting_for_user"
  | "validating"
  | "error"

export type LoginTarget =
  | { kind: "add" }
  | { kind: "relogin"; accountId: string }

interface AddAccountDialogProps {
  open: boolean
  target?: LoginTarget | null
  onClose: () => void
  onSuccess: () => void
}

export function AddAccountDialog({
  open,
  target,
  onClose,
  onSuccess,
}: AddAccountDialogProps) {
  const client = useApiClient()

  const [state, setState] = useState<DialogState>("choose_provider")
  const [selectedProvider, setSelectedProvider] = useState<string>("")
  const [accountId, setAccountId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>("")

  const isRelogin = target?.kind === "relogin"

  useEffect(() => {
    if (!open) {
      setState("choose_provider")
      setSelectedProvider("")
      setAccountId(null)
      setErrorMessage("")
      return
    }

    if (target?.kind === "relogin") {
      setAccountId(target.accountId)
      setState("starting")
      setErrorMessage("")
      let isCancelled = false
      startRelogin(client, target.accountId)
        .then(() => {
          if (!isCancelled) {
            setState("waiting_for_user")
          }
        })
        .catch((err: unknown) => {
          if (!isCancelled) {
            setErrorMessage(err instanceof Error ? err.message : "Failed to start relogin")
            setState("error")
          }
        })
      return () => {
        isCancelled = true
      }
    } else {
      setState("choose_provider")
      setSelectedProvider("")
      setAccountId(null)
      setErrorMessage("")
    }
  }, [open, target, client])

  const providersQuery = useQuery<ProviderDefinition[]>({
    queryKey: ["providers"],
    queryFn: () => listProviders(client),
    enabled: open && !isRelogin,
  })

  if (!open) return null

  const handleStart = async () => {
    if (!selectedProvider) return
    setState("starting")
    setErrorMessage("")
    try {
      const res = await startLogin(client, selectedProvider)
      setAccountId(res.accountId)
      setState("waiting_for_user")
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to start login")
      setState("error")
    }
  }

  const handleComplete = async () => {
    if (!accountId) return
    setState("validating")
    setErrorMessage("")
    try {
      await completeLogin(client, accountId)
      onSuccess()
      handleClose()
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Session validation failed. Make sure you logged in completely in the browser.",
      )
      setState("error")
    }
  }

  const handleRestartLogin = async () => {
    if (!accountId) return
    setState("starting")
    setErrorMessage("")
    try {
      await startRelogin(client, accountId)
      setState("waiting_for_user")
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to reopen browser session",
      )
      setState("error")
    }
  }

  const handleCancelWaiting = async () => {
    if (!accountId) {
      handleClose()
      return
    }

    try {
      if (target?.kind === "relogin") {
        await cancelRelogin(client, accountId)
      } else {
        await cancelNewLogin(client, accountId)
      }
      onSuccess()
    } catch {
      // Ignore cancel errors
    } finally {
      handleClose()
    }
  }

  const handleClose = () => {
    setState("choose_provider")
    setSelectedProvider("")
    setAccountId(null)
    setErrorMessage("")
    onClose()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-account-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
        <h2 id="add-account-dialog-title" className="text-lg font-semibold text-foreground">
          {isRelogin ? "Đăng nhập lại tài khoản" : "Thêm tài khoản Provider"}
        </h2>

        {state === "choose_provider" && (
          <div className="mt-4 flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Chọn nền tảng AI provider bạn muốn liên kết tài khoản:
            </p>

            {providersQuery.isLoading && (
              <p className="text-xs text-muted-foreground">Đang tải danh sách provider…</p>
            )}

            {providersQuery.isError && (
              <p className="text-xs text-destructive">Không thể tải danh sách provider.</p>
            )}

            {providersQuery.data && (
              <div className="flex flex-col gap-2">
                {providersQuery.data.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Chưa có provider nào được cấu hình trong hệ thống.
                  </p>
                ) : (
                  providersQuery.data.map((p) => (
                    <label
                      key={p.key}
                      className={`flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-colors ${
                        selectedProvider === p.key
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">
                          {p.displayName}
                        </span>
                        <span className="text-xs text-muted-foreground">{p.key}</span>
                      </div>
                      <input
                        type="radio"
                        name="provider"
                        value={p.key}
                        checked={selectedProvider === p.key}
                        onChange={() => setSelectedProvider(p.key)}
                        className="text-primary focus:ring-primary"
                      />
                    </label>
                  ))
                )}
              </div>
            )}

            <div className="mt-2 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={handleClose}>
                Hủy
              </Button>
              <Button
                size="sm"
                disabled={!selectedProvider || providersQuery.isLoading}
                onClick={handleStart}
              >
                Tiếp tục đăng nhập
              </Button>
            </div>
          </div>
        )}

        {state === "starting" && (
          <div className="mt-4 flex flex-col items-center gap-3 py-6 text-center">
            <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm font-medium text-foreground">
              Đang mở cửa sổ trình duyệt…
            </p>
          </div>
        )}

        {state === "waiting_for_user" && (
          <div className="mt-4 flex flex-col gap-4">
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
              <p className="font-semibold">Hoàn tất đăng nhập trong cửa sổ trình duyệt</p>
              <p className="mt-1">
                Một cửa sổ trình duyệt biệt lập đã được mở. Vui lòng đăng nhập vào tài khoản của bạn, sau đó quay lại đây và nhấn <strong>Đã đăng nhập</strong>.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={handleCancelWaiting}>
                Hủy bỏ
              </Button>
              <Button size="sm" onClick={handleComplete}>
                Đã đăng nhập
              </Button>
            </div>
          </div>
        )}

        {state === "validating" && (
          <div className="mt-4 flex flex-col items-center gap-3 py-6 text-center">
            <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm font-medium text-foreground">
              Đang xác minh phiên đăng nhập…
            </p>
          </div>
        )}

        {state === "error" && (
          <div className="mt-4 flex flex-col gap-4">
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
              <p className="font-semibold">Đăng nhập chưa thành công</p>
              <p className="mt-1">{errorMessage}</p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={handleClose}>
                Đóng
              </Button>
              {accountId ? (
                <Button size="sm" onClick={handleRestartLogin}>
                  Mở lại trình duyệt
                </Button>
              ) : (
                <Button size="sm" onClick={() => setState("choose_provider")}>
                  Thử lại
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
