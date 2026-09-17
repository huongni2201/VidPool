import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useApiClient } from "@/shared/api"
import { Button } from "@/shared/ui/button"
import {
  cancelNewLogin,
  cancelRelogin,
  completeLogin,
  listProviders,
  startLogin,
  startRelogin,
} from "../api/account-login-api"
import type { ProviderDefinition } from "@/entities/account"

type DialogState =
  | "choose_provider"
  | "starting"
  | "waiting_for_user"
  | "validating"
  | "error"

export type LoginTarget =
  | { kind: "add" }
  | { kind: "relogin"; accountId: string }

export interface AddAccountDialogProps {
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
    if (!open) return

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

  const resetDialogState = () => {
    setState("choose_provider")
    setSelectedProvider("")
    setAccountId(null)
    setErrorMessage("")
  }

  const cleanupLoginSession = async (): Promise<boolean> => {
    if (!accountId) {
      return true
    }

    try {
      if (target?.kind === "relogin") {
        await cancelRelogin(client, accountId)
      } else {
        await cancelNewLogin(client, accountId)
      }
      return true
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Không thể dọn phiên đăng nhập",
      )
      setState("error")
      return false
    }
  }

  const handleClose = async () => {
    const cleaned = await cleanupLoginSession()
    if (!cleaned) {
      return
    }

    resetDialogState()
    onClose()
  }

  const handleComplete = async () => {
    if (!accountId) return
    setState("validating")
    setErrorMessage("")
    try {
      await completeLogin(client, accountId)
      onSuccess()
      resetDialogState()
      onClose()
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
    const cleaned = await cleanupLoginSession()
    if (!cleaned) {
      return
    }
    onSuccess()
    resetDialogState()
    onClose()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-account-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-zinc-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <h2 id="add-account-dialog-title" className="text-lg font-semibold text-zinc-100">
          {isRelogin ? "Đăng nhập lại tài khoản" : "Thêm tài khoản Provider"}
        </h2>

        {state === "choose_provider" && (
          <div className="mt-4 flex flex-col gap-4">
            <p className="text-sm text-zinc-400">
              Chọn nền tảng AI provider bạn muốn liên kết tài khoản:
            </p>

            {providersQuery.isLoading && (
              <p className="text-xs text-zinc-400">Đang tải danh sách provider…</p>
            )}

            {providersQuery.isError && (
              <p className="text-xs text-rose-400">Không thể tải danh sách provider.</p>
            )}

            {providersQuery.data && (
              <div className="flex flex-col gap-2">
                {providersQuery.data.length === 0 ? (
                  <p className="text-xs text-zinc-400">
                    Chưa có provider nào được cấu hình trong hệ thống.
                  </p>
                ) : (
                  providersQuery.data.map((p) => (
                    <label
                      key={p.key}
                      className={`flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-colors ${
                        selectedProvider === p.key
                          ? "border-indigo-500 bg-indigo-500/10"
                          : "border-white/5 hover:bg-zinc-800/40"
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-zinc-100">
                          {p.displayName}
                        </span>
                        <span className="text-xs text-zinc-400">{p.key}</span>
                      </div>
                      <input
                        type="radio"
                        name="provider"
                        value={p.key}
                        checked={selectedProvider === p.key}
                        onChange={() => setSelectedProvider(p.key)}
                        className="text-indigo-500 focus:ring-indigo-500"
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
            <div className="size-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            <p className="text-sm font-medium text-zinc-100">
              Đang mở cửa sổ trình duyệt…
            </p>
          </div>
        )}

        {state === "waiting_for_user" && (
          <div className="mt-4 flex flex-col gap-4">
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-300">
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
            <div className="size-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            <p className="text-sm font-medium text-zinc-100">
              Đang xác minh phiên đăng nhập…
            </p>
          </div>
        )}

        {state === "error" && (
          <div className="mt-4 flex flex-col gap-4">
            <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-400">
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
