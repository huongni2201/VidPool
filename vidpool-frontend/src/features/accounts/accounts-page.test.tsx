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
    const onSuccess = vi.fn()

    render(
      <AddAccountDialog open={true} onClose={onClose} onSuccess={onSuccess} />,
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
        "/api/accounts/123e4567-e89b-12d3-a456-426614174000/login/cancel"
      )
      expect(onSuccess).toHaveBeenCalled()
      expect(onClose).toHaveBeenCalled()
    })
  })

  it("handles cancel button during relogin waiting state and calls cancelRelogin", async () => {
    const accountId = "123e4567-e89b-12d3-a456-426614174000"
    const mockClient: ApiClient = {
      get: vi.fn().mockResolvedValue([]),
      post: vi.fn().mockImplementation((path: string) => {
        if (path === `/api/accounts/${accountId}/relogin/start`) {
          return Promise.resolve({
            accountId,
            status: "waiting_for_user",
          })
        }
        if (path === `/api/accounts/${accountId}/relogin/cancel`) {
          return Promise.resolve({})
        }
        return Promise.resolve({})
      }),
      delete: vi.fn(),
    }

    const onClose = vi.fn()
    const onSuccess = vi.fn()

    render(
      <AddAccountDialog
        open={true}
        target={{ kind: "relogin", accountId }}
        onClose={onClose}
        onSuccess={onSuccess}
      />,
      { wrapper: createWrapper(mockClient) }
    )

    expect(
      await screen.findByText(/hoàn tất đăng nhập trong cửa sổ trình duyệt/i)
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /hủy bỏ/i }))

    await waitFor(() => {
      expect(mockClient.post).toHaveBeenCalledWith(
        `/api/accounts/${accountId}/relogin/cancel`,
        undefined,
        expect.anything()
      )
      expect(onSuccess).toHaveBeenCalled()
      expect(onClose).toHaveBeenCalled()
    })
  })

  it("handles relogin flow directly without provider selection and completes login", async () => {
    const accountId = "123e4567-e89b-12d3-a456-426614174000"
    const mockClient: ApiClient = {
      get: vi.fn().mockResolvedValue([]),
      post: vi.fn().mockImplementation((path: string) => {
        if (path === `/api/accounts/${accountId}/relogin/start`) {
          return Promise.resolve({
            accountId,
            status: "waiting_for_user",
          })
        }
        if (path === `/api/accounts/${accountId}/login/complete`) {
          return Promise.resolve({
            id: accountId,
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

    const onClose = vi.fn()
    const onSuccess = vi.fn()

    render(
      <AddAccountDialog
        open={true}
        target={{ kind: "relogin", accountId }}
        onClose={onClose}
        onSuccess={onSuccess}
      />,
      { wrapper: createWrapper(mockClient) }
    )

    // Should not fetch providers
    expect(mockClient.get).not.toHaveBeenCalledWith("/api/providers", expect.anything())

    // Relogin started directly
    await waitFor(() => {
      expect(mockClient.post).toHaveBeenCalledWith(
        `/api/accounts/${accountId}/relogin/start`,
        undefined,
        expect.anything()
      )
    })

    // Never called startLogin
    expect(mockClient.post).not.toHaveBeenCalledWith(
      expect.stringContaining("/accounts/login/start"),
      undefined,
      expect.anything()
    )

    // Waiting state reached
    expect(
      await screen.findByText(/hoàn tất đăng nhập trong cửa sổ trình duyệt/i)
    ).toBeInTheDocument()

    // Complete login
    fireEvent.click(screen.getByRole("button", { name: /đã đăng nhập/i }))

    await waitFor(() => {
      expect(mockClient.post).toHaveBeenCalledWith(
        `/api/accounts/${accountId}/login/complete`,
        undefined,
        expect.anything()
      )
      expect(onSuccess).toHaveBeenCalled()
      expect(onClose).toHaveBeenCalled()
    })
  })

  it("reopens browser before retrying failed validation", async () => {
    const accountId = "123e4567-e89b-12d3-a456-426614174000"
    let completeCallCount = 0

    const mockClient: ApiClient = {
      get: vi.fn().mockResolvedValue([]),
      post: vi.fn().mockImplementation((path: string) => {
        if (path === `/api/accounts/${accountId}/relogin/start`) {
          return Promise.resolve({
            accountId,
            status: "waiting_for_user",
          })
        }
        if (path === `/api/accounts/${accountId}/login/complete`) {
          completeCallCount++
          return Promise.reject(new Error("Browser session validation failed"))
        }
        return Promise.resolve({})
      }),
      delete: vi.fn(),
    }

    render(
      <AddAccountDialog
        open={true}
        target={{ kind: "relogin", accountId }}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
      { wrapper: createWrapper(mockClient) }
    )

    expect(
      await screen.findByText(/hoàn tất đăng nhập trong cửa sổ trình duyệt/i)
    ).toBeInTheDocument()

    // First completion attempt fails
    fireEvent.click(screen.getByRole("button", { name: /đã đăng nhập/i }))

    expect(await screen.findByText(/đăng nhập chưa thành công/i)).toBeInTheDocument()
    expect(screen.getByText(/browser session validation failed/i)).toBeInTheDocument()

    // It should offer "Mở lại trình duyệt" instead of calling completeLogin again
    const reopenBtn = screen.getByRole("button", { name: /mở lại trình duyệt/i })
    expect(reopenBtn).toBeInTheDocument()

    // Reset post mock call tracking to assert the retry action
    ;(mockClient.post as unknown as ReturnType<typeof vi.fn>).mockClear()

    fireEvent.click(reopenBtn)

    // Should call relogin/start again
    await waitFor(() => {
      expect(mockClient.post).toHaveBeenCalledWith(
        `/api/accounts/${accountId}/relogin/start`,
        undefined,
        expect.anything()
      )
    })

    // Must NOT call completeLogin immediately
    expect(mockClient.post).not.toHaveBeenCalledWith(
      `/api/accounts/${accountId}/login/complete`,
      undefined,
      expect.anything()
    )

    // Returns to waiting state
    expect(
      await screen.findByText(/hoàn tất đăng nhập trong cửa sổ trình duyệt/i)
    ).toBeInTheDocument()
    expect(completeCallCount).toBe(1)
  })

  it("surfaces mutation errors and allows dismissing them", async () => {
    const mockClient: ApiClient = {
      get: vi.fn().mockResolvedValue([
        {
          id: "123e4567-e89b-12d3-a456-426614174000",
          providerKey: "seedance",
          displayName: "Seedance User",
          externalIdentity: "user@test.ai",
          status: "active",
          lastUsedAt: null,
          lastValidatedAt: null,
          cooldownUntil: null,
        },
      ]),
      post: vi.fn().mockRejectedValue(new Error("Cannot disable account while active lease exists")),
      delete: vi.fn(),
    }

    render(<AccountsPage />, { wrapper: createWrapper(mockClient) })

    expect(await screen.findByText("Seedance User")).toBeInTheDocument()

    const disableBtn = screen.getByRole("button", { name: /disable/i })
    fireEvent.click(disableBtn)

    expect(
      await screen.findByText(/cannot disable account while active lease exists/i)
    ).toBeInTheDocument()

    // Dismiss error
    const dismissBtn = screen.getByRole("button", { name: "✕" })
    fireEvent.click(dismissBtn)

    await waitFor(() => {
      expect(
        screen.queryByText(/cannot disable account while active lease exists/i)
      ).not.toBeInTheDocument()
    })
  })
})
