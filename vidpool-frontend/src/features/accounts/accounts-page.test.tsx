import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { afterEach, describe, expect, it, vi } from "vitest"

afterEach(() => {
  cleanup()
})


import { ApiClientProvider } from "@/app/api-client-context"
import type { ApiClient } from "@/lib/api-client"
import { AccountRow } from "./account-row"
import { AccountsPage } from "./accounts-page"
import { AddAccountDialog } from "./add-account-dialog"
import type { AccountSummary } from "./types"

function createWrapper(mockClient: ApiClient) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ApiClientProvider client={mockClient}>{children}</ApiClientProvider>
      </QueryClientProvider>
    )
  }
}

describe("AccountRow component", () => {
  const baseAccount: AccountSummary = {
    id: "123e4567-e89b-12d3-a456-426614174000",
    providerKey: "seedance",
    displayName: "Seedance Pro",
    externalIdentity: "creator-99",
    status: "active",
    lastUsedAt: null,
    lastValidatedAt: "2026-09-17T12:00:00Z",
    cooldownUntil: null,
  }

  it("renders active account and its actions", () => {
    const onValidate = vi.fn()
    const onDisable = vi.fn()

    render(
      <AccountRow
        account={baseAccount}
        onValidate={onValidate}
        onEnable={vi.fn()}
        onDisable={onDisable}
        onRelogin={vi.fn()}
        onDelete={vi.fn()}
      />
    )

    expect(screen.getByText("Seedance Pro")).toBeInTheDocument()
    expect(screen.getByText("active")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /validate/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /disable/i })).toBeInTheDocument()
  })

  it("renders auth_required row with 'Login again' button", () => {
    const onRelogin = vi.fn()

    render(
      <AccountRow
        account={{ ...baseAccount, status: "auth_required" }}
        onValidate={vi.fn()}
        onEnable={vi.fn()}
        onDisable={vi.fn()}
        onRelogin={onRelogin}
        onDelete={vi.fn()}
      />
    )

    expect(screen.getByText("auth required")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /login again/i })).toBeInTheDocument()
  })

  it("renders cooldown row with Disable button", () => {
    render(
      <AccountRow
        account={{ ...baseAccount, status: "cooldown", cooldownUntil: "2026-09-17T12:30:00Z" }}
        onValidate={vi.fn()}
        onEnable={vi.fn()}
        onDisable={vi.fn()}
        onRelogin={vi.fn()}
        onDelete={vi.fn()}
      />
    )

    expect(screen.getByText("cooldown")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /disable/i })).toBeInTheDocument()
  })

  it("renders disabled row with Enable button", () => {
    render(
      <AccountRow
        account={{ ...baseAccount, status: "disabled" }}
        onValidate={vi.fn()}
        onEnable={vi.fn()}
        onDisable={vi.fn()}
        onRelogin={vi.fn()}
        onDelete={vi.fn()}
      />
    )

    expect(screen.getByText("disabled")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /enable/i })).toBeInTheDocument()
  })

  it("shows delete confirmation warning before triggering onDelete", () => {
    const onDelete = vi.fn()

    render(
      <AccountRow
        account={baseAccount}
        onValidate={vi.fn()}
        onEnable={vi.fn()}
        onDisable={vi.fn()}
        onRelogin={vi.fn()}
        onDelete={onDelete}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }))

    expect(
      screen.getByText(/deleting this account also deletes its stored browser session/i)
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /confirm delete/i }))
    expect(onDelete).toHaveBeenCalledWith(baseAccount.id)
  })
})

describe("AccountsPage component", () => {
  it("renders empty state when no accounts exist", async () => {
    const mockClient: ApiClient = {
      get: vi.fn().mockImplementation((path: string) => {
        if (path === "/api/accounts") return Promise.resolve([])
        if (path === "/api/providers") return Promise.resolve([])
        return Promise.resolve([])
      }),
      post: vi.fn(),
      delete: vi.fn(),
    }

    render(<AccountsPage />, { wrapper: createWrapper(mockClient) })

    expect(await screen.findByText(/no accounts yet/i)).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: /\+ add account/i })).toHaveLength(2)
  })
})

describe("AddAccountDialog component", () => {
  it("progresses through provider selection, waiting state, and completes login", async () => {
    const mockClient: ApiClient = {
      get: vi.fn().mockImplementation((path: string) => {
        if (path === "/api/providers") {
          return Promise.resolve([
            { key: "seedance", displayName: "Seedance", authKind: "browser_session" },
          ])
        }
        return Promise.resolve([])
      }),
      post: vi.fn().mockImplementation((path: string) => {
        if (path.includes("/login/start")) {
          return Promise.resolve({
            accountId: "123e4567-e89b-12d3-a456-426614174000",
            status: "waiting_for_user",
          })
        }
        if (path.includes("/login/complete")) {
          return Promise.resolve({
            id: "123e4567-e89b-12d3-a456-426614174000",
            providerKey: "seedance",
            displayName: "Test User",
            externalIdentity: "u-1",
            status: "active",
            lastUsedAt: null,
            lastValidatedAt: null,
            cooldownUntil: null,
          })
        }
        return Promise.resolve({})
      }),
      delete: vi.fn(),
    }

    const onSuccess = vi.fn()
    const onClose = vi.fn()

    render(
      <AddAccountDialog open={true} onClose={onClose} onSuccess={onSuccess} />,
      { wrapper: createWrapper(mockClient) }
    )

    // 1. Providers list loaded
    expect(await screen.findByText("Seedance")).toBeInTheDocument()

    // 2. Select provider and click continue
    fireEvent.click(screen.getByLabelText(/seedance/i))
    fireEvent.click(screen.getByRole("button", { name: /tiếp tục đăng nhập/i }))

    // 3. Waiting for user in browser window
    expect(
      await screen.findByText(/hoàn tất đăng nhập trong cửa sổ trình duyệt/i)
    ).toBeInTheDocument()

    // 4. Click "Đã đăng nhập"
    fireEvent.click(screen.getByRole("button", { name: /đã đăng nhập/i }))

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled()
      expect(onClose).toHaveBeenCalled()
    })
  })

  it("handles cancel button during waiting state", async () => {
    const mockClient: ApiClient = {
      get: vi.fn().mockResolvedValue([
        { key: "seedance", displayName: "Seedance", authKind: "browser_session" },
      ]),
      post: vi.fn().mockResolvedValue({
        accountId: "123e4567-e89b-12d3-a456-426614174000",
        status: "waiting_for_user",
      }),
      delete: vi.fn(),
    }

    const onClose = vi.fn()

    render(
      <AddAccountDialog open={true} onClose={onClose} onSuccess={vi.fn()} />,
      { wrapper: createWrapper(mockClient) }
    )

    await screen.findByText("Seedance")
    fireEvent.click(screen.getByLabelText(/seedance/i))
    fireEvent.click(screen.getByRole("button", { name: /tiếp tục đăng nhập/i }))

    expect(
      await screen.findByText(/hoàn tất đăng nhập trong cửa sổ trình duyệt/i)
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /hủy bỏ/i }))

    await waitFor(() => {
      expect(mockClient.post).toHaveBeenCalledWith(
        "/api/accounts/123e4567-e89b-12d3-a456-426614174000/login/cancel",
        undefined,
        expect.anything()
      )
      expect(onClose).toHaveBeenCalled()
    })
  })
})
