import { useEffect, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { ApiError, useApiClient, type ApiClient } from "@/shared/api"
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

async function safeCancelLogin(
  client: ApiClient,
  accountId: string,
  isRelogin: boolean,
): Promise<boolean> {
  try {
    if (isRelogin) {
      await cancelRelogin(client, accountId)
    } else {
      await cancelNewLogin(client, accountId)
    }
    return true
  } catch (err: unknown) {
    if (err instanceof ApiError && err.status === 404) {
      return true
    }
    if (
      err instanceof Error &&
      (err.message.includes("404") || err.message.toLowerCase().includes("not found"))
    ) {
      return true
    }
    return false
  }
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
  const [isTerminal, setIsTerminal] = useState<boolean>(false)

  const isRelogin = target?.kind === "relogin"

  const mountedRef = useRef(true)
  const generationRef = useRef(0)
  const activeAccountIdRef = useRef<string | null>(null)
  const completedRef = useRef(false)
  const isReloginRef = useRef(isRelogin)

  useEffect(() => {
    isReloginRef.current = isRelogin
  }, [isRelogin])

  // Unmount & navigation cleanup guard
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      generationRef.current++
      const pendingId = activeAccountIdRef.current
      const wasRelogin = isReloginRef.current
      if (pendingId && !completedRef.current) {
        activeAccountIdRef.current = null
        safeCancelLogin(client, pendingId, wasRelogin)
      }
    }
  }, [client])

  useEffect(() => {
    if (!open) {
      // If dialog was closed externally while login was pending
      const pendingId = activeAccountIdRef.current
      if (pendingId && !completedRef.current) {
        activeAccountIdRef.current = null
        safeCancelLogin(client, pendingId, isReloginRef.current)
      }
      return
    }

    completedRef.current = false
    setIsTerminal(false)

    if (target?.kind === "relogin") {
      const reloginId = target.accountId
      activeAccountIdRef.current = reloginId
      setAccountId(reloginId)
      setState("starting")
      setErrorMessage("")
      const generation = ++generationRef.current

      startRelogin(client, reloginId)
        .then(() => {
          if (mountedRef.current && generation === generationRef.current) {
            setState("waiting_for_user")
          }
        })
        .catch((err: unknown) => {
          if (mountedRef.current && generation === generationRef.current) {
            setErrorMessage(err instanceof Error ? err.message : "Failed to start relogin")
            setState("error")
          }
        })
    } else {
      setState("choose_provider")
      setSelectedProvider("")
      setAccountId(null)
      activeAccountIdRef.current = null
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
    const generation = ++generationRef.current
    setState("starting")
    setErrorMessage("")
    setIsTerminal(false)
    try {
      const res = await startLogin(client, selectedProvider)
      if (!mountedRef.current || generation !== generationRef.current) {
        safeCancelLogin(client, res.accountId, false)
        return
      }
      activeAccountIdRef.current = res.accountId
      setAccountId(res.accountId)
      setState("waiting_for_user")
    } catch (err: unknown) {
      if (!mountedRef.current || generation !== generationRef.current) return
      setErrorMessage(err instanceof Error ? err.message : "Failed to start login")
      setState("error")
    }
  }

  const resetDialogState = () => {
    setState("choose_provider")
    setSelectedProvider("")
    setAccountId(null)
    activeAccountIdRef.current = null
    setErrorMessage("")
    setIsTerminal(false)
    completedRef.current = false
  }

  const cleanupLoginSession = async (): Promise<boolean> => {
    const idToClean = accountId || activeAccountIdRef.current
    if (!idToClean || isTerminal) {
      return true
    }

    try {
      if (isRelogin) {
        await cancelRelogin(client, idToClean)
      } else {
        await cancelNewLogin(client, idToClean)
      }
      activeAccountIdRef.current = null
      setAccountId(null)
      return true
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 404) {
        activeAccountIdRef.current = null
        setAccountId(null)
        return true
      }
      if (
        err instanceof Error &&
        (err.message.includes("404") || err.message.toLowerCase().includes("not found"))
      ) {
        activeAccountIdRef.current = null
        setAccountId(null)
        return true
      }
      setErrorMessage(
        err instanceof Error ? err.message : "Không thể dọn phiên đăng nhập",
      )
      setState("error")
      return false
    }
  }

  const handleClose = async () => {
    if (isTerminal || !accountId) {
      activeAccountIdRef.current = null
      resetDialogState()
      onClose()
      return
    }

    const cleaned = await cleanupLoginSession()
    if (!cleaned) {
      return
    }

    resetDialogState()
    onClose()
  }

  const handleComplete = async () => {
    if (!accountId) return
    const currentId = accountId
    const generation = ++generationRef.current
    setState("validating")
    setErrorMessage("")
    try {
      await completeLogin(client, currentId)
      if (!mountedRef.current || generation !== generationRef.current) return
      completedRef.current = true
      activeAccountIdRef.current = null
      onSuccess()
      resetDialogState()
      onClose()
    } catch (err: unknown) {
      if (!mountedRef.current || generation !== generationRef.current) return

      const isDuplicate =
        (err instanceof ApiError && (err.code === "ACCOUNT_ALREADY_EXISTS" || err.status === 409)) ||
        (err instanceof Error &&
          (err.message.toLowerCase().includes("already exists") ||
            err.message.toLowerCase().includes("already registered")))

      if (isDuplicate) {
        // Duplicate identity: backend already cleaned up provisional account
        activeAccountIdRef.current = null
        setAccountId(null)
        setIsTerminal(true)
        setErrorMessage(
          err instanceof ApiError && err.detail
            ? err.detail
            : "Tài khoản đã tồn tại trong hệ thống. Vui lòng đăng nhập tài khoản khác.",
        )
      } else {
        setIsTerminal(false)
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Session validation failed. Make sure you logged in completely in the browser.",
        )
      }
      setState("error")
    }
  }

  const handleRestartLogin = async () => {
    if (!accountId || isTerminal) return
    const generation = ++generationRef.current
    setState("starting")
    setErrorMessage("")
    try {
      await startRelogin(client, accountId)
      if (!mountedRef.current || generation !== generationRef.current) return
      setState("waiting_for_user")
    } catch (err: unknown) {
      if (!mountedRef.current || generation !== generationRef.current) return
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
              {accountId && !isTerminal ? (
                <Button size="sm" onClick={handleRestartLogin}>
                  Mở lại trình duyệt
                </Button>
              ) : (
                <Button size="sm" onClick={resetDialogState}>
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
