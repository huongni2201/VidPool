import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ApiClientProvider } from "@/shared/api"
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
      { key: "seedance", displayName: "Seedance", description: "Seedance AI" },
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
      { key: "seedance", displayName: "Seedance", description: "Seedance AI" },
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
})
