import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ApiClientProvider, ApiError } from "@/shared/api"
import type { ApiClient } from "@/shared/api"
import { AddAccountDialog, type AddAccountDialogProps } from "./add-account-dialog"
import * as accountLoginApi from "../api/account-login-api"

vi.mock("../api/account-login-api", () => ({
  listProviders: vi.fn(),
  startLogin: vi.fn(),
  completeLogin: vi.fn(),
  cancelNewLogin: vi.fn(),
  cancelRelogin: vi.fn(),
  startRelogin: vi.fn(),
}))

const dummyClient = {} as ApiClient

function renderDialog(props: Partial<AddAccountDialogProps> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  const onClose = vi.fn()
  const onSuccess = vi.fn()

  const utils = render(
    <QueryClientProvider client={queryClient}>
      <ApiClientProvider client={dummyClient}>
        <AddAccountDialog
          open={true}
          onClose={onClose}
          onSuccess={onSuccess}
          {...props}
        />
      </ApiClientProvider>
    </QueryClientProvider>,
  )

  return { ...utils, onClose, onSuccess }
}

describe("AddAccountDialog cleanup lifecycle", () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("cancels the provisional account before closing after new-login validation fails", async () => {
    const PROVISIONAL_ID = "11111111-1111-4111-8111-111111111111"
    vi.mocked(accountLoginApi.listProviders).mockResolvedValue([
      { key: "seedance", displayName: "Seedance", authKind: "browser_session" },
    ])
    vi.mocked(accountLoginApi.startLogin).mockResolvedValue({
      accountId: PROVISIONAL_ID,
      status: "waiting_for_user",
    })
    vi.mocked(accountLoginApi.completeLogin).mockRejectedValue(
      new Error("Browser session validation failed"),
    )
    vi.mocked(accountLoginApi.cancelNewLogin).mockResolvedValue(undefined)

    const { onClose } = renderDialog({ target: { kind: "add" } })

    await screen.findByText("Seedance")
    fireEvent.click(screen.getByText("Seedance"))
    fireEvent.click(screen.getByRole("button", { name: /Tiếp tục đăng nhập/i }))

    await screen.findByText(/Hoàn tất đăng nhập trong cửa sổ trình duyệt/i)
    fireEvent.click(screen.getByRole("button", { name: /Đã đăng nhập/i }))

    await screen.findByText("Đăng nhập chưa thành công")
    fireEvent.click(screen.getByRole("button", { name: "Đóng" }))

    await waitFor(() => {
      expect(accountLoginApi.cancelNewLogin).toHaveBeenCalledWith(
        expect.anything(),
        PROVISIONAL_ID,
      )
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  it("cancels relogin without deleting the existing account", async () => {
    const EXISTING_ACCOUNT_ID = "22222222-2222-4222-8222-222222222222"
    vi.mocked(accountLoginApi.startRelogin).mockResolvedValue({
      accountId: EXISTING_ACCOUNT_ID,
      status: "waiting_for_user",
    })
    vi.mocked(accountLoginApi.completeLogin).mockRejectedValue(
      new Error("Session validation failed"),
    )
    vi.mocked(accountLoginApi.cancelRelogin).mockResolvedValue({
      id: EXISTING_ACCOUNT_ID,
      providerKey: "seedance",
      displayName: "Existing Account",
      externalIdentity: "creator-1",
      status: "auth_required",
      lastUsedAt: null,
      lastValidatedAt: null,
      cooldownUntil: null,
      isLeased: false,
      leaseExpiresAt: null,
      isAvailable: false,
    })

    const { onClose } = renderDialog({
      target: { kind: "relogin", accountId: EXISTING_ACCOUNT_ID },
    })

    await screen.findByText(/Hoàn tất đăng nhập trong cửa sổ trình duyệt/i)
    fireEvent.click(screen.getByRole("button", { name: /Đã đăng nhập/i }))
    await screen.findByText("Đăng nhập chưa thành công")

    fireEvent.click(screen.getByRole("button", { name: "Đóng" }))

    await waitFor(() => {
      expect(accountLoginApi.cancelRelogin).toHaveBeenCalledWith(
        expect.anything(),
        EXISTING_ACCOUNT_ID,
      )
      expect(accountLoginApi.cancelNewLogin).not.toHaveBeenCalled()
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  it("keeps the dialog open when provisional cleanup fails", async () => {
    const PROVISIONAL_ID = "11111111-1111-4111-8111-111111111111"
    vi.mocked(accountLoginApi.listProviders).mockResolvedValue([
      { key: "seedance", displayName: "Seedance", authKind: "browser_session" },
    ])
    vi.mocked(accountLoginApi.startLogin).mockResolvedValue({
      accountId: PROVISIONAL_ID,
      status: "waiting_for_user",
    })
    vi.mocked(accountLoginApi.completeLogin).mockRejectedValue(
      new Error("Browser session validation failed"),
    )
    vi.mocked(accountLoginApi.cancelNewLogin).mockRejectedValue(
      new Error("Cleanup failed"),
    )

    const { onClose } = renderDialog({ target: { kind: "add" } })

    await screen.findByText("Seedance")
    fireEvent.click(screen.getByText("Seedance"))
    fireEvent.click(screen.getByRole("button", { name: /Tiếp tục đăng nhập/i }))

    await screen.findByText(/Hoàn tất đăng nhập trong cửa sổ trình duyệt/i)
    fireEvent.click(screen.getByRole("button", { name: /Đã đăng nhập/i }))

    await screen.findByText("Đăng nhập chưa thành công")
    fireEvent.click(screen.getByRole("button", { name: "Đóng" }))

    await waitFor(() => {
      expect(accountLoginApi.cancelNewLogin).toHaveBeenCalledWith(
        expect.anything(),
        PROVISIONAL_ID,
      )
    })

    expect(onClose).not.toHaveBeenCalled()
    expect(await screen.findByText(/Cleanup failed/)).toBeInTheDocument()
  })

  it("handles duplicate account conflict by allowing dialog to close without being blocked", async () => {
    const PROVISIONAL_ID = "33333333-3333-4333-8333-333333333333"
    vi.mocked(accountLoginApi.listProviders).mockResolvedValue([
      { key: "seedance", displayName: "Seedance", authKind: "browser_session" },
    ])
    vi.mocked(accountLoginApi.startLogin).mockResolvedValue({
      accountId: PROVISIONAL_ID,
      status: "waiting_for_user",
    })
    // Duplicate account returns 409 conflict
    vi.mocked(accountLoginApi.completeLogin).mockRejectedValue(
      new ApiError(409, "Account already exists.", "/api/accounts/...", "ACCOUNT_ALREADY_EXISTS"),
    )
    // If cancel is called on the deleted ID, backend would return 404
    vi.mocked(accountLoginApi.cancelNewLogin).mockRejectedValue(
      new ApiError(404, "Account not found", "/api/accounts/..."),
    )

    const { onClose } = renderDialog({ target: { kind: "add" } })

    await screen.findByText("Seedance")
    fireEvent.click(screen.getByText("Seedance"))
    fireEvent.click(screen.getByRole("button", { name: /Tiếp tục đăng nhập/i }))

    await screen.findByText(/Hoàn tất đăng nhập trong cửa sổ trình duyệt/i)
    fireEvent.click(screen.getByRole("button", { name: /Đã đăng nhập/i }))

    await screen.findByText("Đăng nhập chưa thành công")
    fireEvent.click(screen.getByRole("button", { name: "Đóng" }))

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  it("cleans up pending login session on unmount", async () => {
    const PROVISIONAL_ID = "44444444-4444-4444-8444-444444444444"
    vi.mocked(accountLoginApi.listProviders).mockResolvedValue([
      { key: "seedance", displayName: "Seedance", authKind: "browser_session" },
    ])
    vi.mocked(accountLoginApi.startLogin).mockResolvedValue({
      accountId: PROVISIONAL_ID,
      status: "waiting_for_user",
    })
    vi.mocked(accountLoginApi.cancelNewLogin).mockResolvedValue(undefined)

    const { unmount } = renderDialog({ target: { kind: "add" } })

    await screen.findByText("Seedance")
    fireEvent.click(screen.getByText("Seedance"))
    fireEvent.click(screen.getByRole("button", { name: /Tiếp tục đăng nhập/i }))

    await screen.findByText(/Hoàn tất đăng nhập trong cửa sổ trình duyệt/i)

    // User navigates away -> component unmounts
    unmount()

    await waitFor(() => {
      expect(accountLoginApi.cancelNewLogin).toHaveBeenCalledWith(
        expect.anything(),
        PROVISIONAL_ID,
      )
    })
  })

  it("cleans up late startLogin response if component was unmounted while starting", async () => {
    const PROVISIONAL_ID = "55555555-5555-4555-8555-555555555555"
    vi.mocked(accountLoginApi.listProviders).mockResolvedValue([
      { key: "seedance", displayName: "Seedance", authKind: "browser_session" },
    ])

    let resolveStart!: (val: { accountId: string; status: "waiting_for_user" }) => void
    const startPromise = new Promise<{ accountId: string; status: "waiting_for_user" }>((resolve) => {
      resolveStart = resolve
    })
    vi.mocked(accountLoginApi.startLogin).mockReturnValue(startPromise)
    vi.mocked(accountLoginApi.cancelNewLogin).mockResolvedValue(undefined)

    const { unmount } = renderDialog({ target: { kind: "add" } })

    await screen.findByText("Seedance")
    fireEvent.click(screen.getByText("Seedance"))
    fireEvent.click(screen.getByRole("button", { name: /Tiếp tục đăng nhập/i }))

    // While startLogin is in flight, user navigates away
    unmount()

    // Now startLogin resolves late
    resolveStart({ accountId: PROVISIONAL_ID, status: "waiting_for_user" })

    await waitFor(() => {
      expect(accountLoginApi.cancelNewLogin).toHaveBeenCalledWith(
        expect.anything(),
        PROVISIONAL_ID,
      )
    })
  })

  it("treats SESSION_INVALID (409) as non-terminal, preserves accountId, and allows retry", async () => {
    const PROVISIONAL_ID = "66666666-6666-4666-8666-666666666666"
    vi.mocked(accountLoginApi.listProviders).mockResolvedValue([
      { key: "seedance", displayName: "Seedance", authKind: "browser_session" },
    ])
    vi.mocked(accountLoginApi.startLogin).mockResolvedValue({
      accountId: PROVISIONAL_ID,
      status: "waiting_for_user",
    })
    // First completeLogin fails with SESSION_INVALID 409
    vi.mocked(accountLoginApi.completeLogin).mockRejectedValueOnce(
      new ApiError(409, "Browser session validation failed", "/api/accounts/...", "SESSION_INVALID"),
    )

    renderDialog({ target: { kind: "add" } })

    await screen.findByText("Seedance")
    fireEvent.click(screen.getByText("Seedance"))
    fireEvent.click(screen.getByRole("button", { name: /Tiếp tục đăng nhập/i }))

    await screen.findByText(/Hoàn tất đăng nhập trong cửa sổ trình duyệt/i)
    fireEvent.click(screen.getByRole("button", { name: /Đã đăng nhập/i }))

    // Expect session invalid message, NOT duplicate message
    await screen.findByText("Đăng nhập chưa thành công")
    expect(
      screen.getByText("Chưa phát hiện phiên đăng nhập. Hãy hoàn tất đăng nhập trong trình duyệt rồi thử lại."),
    ).toBeInTheDocument()

    // Both "Mở lại trình duyệt" and "Đã đăng nhập" retry buttons must be available
    expect(screen.getByRole("button", { name: /Mở lại trình duyệt/i })).toBeInTheDocument()
    const retryCompleteBtn = screen.getByRole("button", { name: /Đã đăng nhập/i })
    expect(retryCompleteBtn).toBeInTheDocument()

    // Clicking "Đã đăng nhập" again triggers completeLogin retry
    vi.mocked(accountLoginApi.completeLogin).mockResolvedValueOnce({
      id: PROVISIONAL_ID,
      providerKey: "seedance",
      displayName: "Creator",
      externalIdentity: "id-123",
      status: "active",
      lastUsedAt: null,
      lastValidatedAt: null,
      cooldownUntil: null,
      isLeased: false,
      leaseExpiresAt: null,
      isAvailable: true,
    })

    fireEvent.click(retryCompleteBtn)

    await waitFor(() => {
      expect(accountLoginApi.completeLogin).toHaveBeenCalledTimes(2)
      expect(accountLoginApi.completeLogin).toHaveBeenLastCalledWith(expect.anything(), PROVISIONAL_ID)
    })
  })

  it("does not treat generic 409 as duplicate terminal conflict", async () => {
    const PROVISIONAL_ID = "77777777-7777-4777-8777-777777777777"
    vi.mocked(accountLoginApi.listProviders).mockResolvedValue([
      { key: "seedance", displayName: "Seedance", authKind: "browser_session" },
    ])
    vi.mocked(accountLoginApi.startLogin).mockResolvedValue({
      accountId: PROVISIONAL_ID,
      status: "waiting_for_user",
    })
    // 409 conflict with generic code or message
    vi.mocked(accountLoginApi.completeLogin).mockRejectedValue(
      new ApiError(409, "Account is currently in use", "/api/accounts/...", "ACCOUNT_IN_USE"),
    )

    renderDialog({ target: { kind: "add" } })

    await screen.findByText("Seedance")
    fireEvent.click(screen.getByText("Seedance"))
    fireEvent.click(screen.getByRole("button", { name: /Tiếp tục đăng nhập/i }))

    await screen.findByText(/Hoàn tất đăng nhập trong cửa sổ trình duyệt/i)
    fireEvent.click(screen.getByRole("button", { name: /Đã đăng nhập/i }))

    await screen.findByText("Đăng nhập chưa thành công")
    // Should NOT show duplicate message
    expect(
      screen.queryByText(/Tài khoản đã tồn tại trong hệ thống/i),
    ).not.toBeInTheDocument()

    // Retry actions should still be active because it was not terminal duplicate
    expect(screen.getByRole("button", { name: /Mở lại trình duyệt/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Đã đăng nhập/i })).toBeInTheDocument()
  })
})
