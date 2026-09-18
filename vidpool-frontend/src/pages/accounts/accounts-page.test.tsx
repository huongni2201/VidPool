import { cleanup, render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ApiClientProvider } from "@/shared/api"
import type { ApiClient } from "@/shared/api"
import { AccountsPage } from "./ui/accounts-page"
import type { AccountSummary } from "@/entities/account"

function renderPage(mockClient: ApiClient) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <ApiClientProvider client={mockClient}>
        <AccountsPage />
      </ApiClientProvider>
    </QueryClientProvider>,
  )
}

describe("AccountsPage truthful operational data", () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("renders empty account state without fake numbers or fake credits", async () => {
    const mockClient: ApiClient = {
      get: vi.fn().mockImplementation((path: string) => {
        if (path.startsWith("/api/accounts")) {
          return Promise.resolve([])
        }
        if (path === "/api/providers") {
          return Promise.resolve([])
        }
        return Promise.resolve([])
      }),
      post: vi.fn(),
      delete: vi.fn(),
    }

    renderPage(mockClient)

    expect(await screen.findByText("Account Pool")).toBeInTheDocument()

    // Real derived zeros must be displayed
    const zeroElements = screen.getAllByText("0")
    expect(zeroElements.length).toBeGreaterThan(0)

    // Fake metrics MUST NOT exist
    expect(screen.queryByText("12.480")).not.toBeInTheDocument()
    expect(screen.queryByText(/8\/12/)).not.toBeInTheDocument()
    expect(screen.queryByText("500/500")).not.toBeInTheDocument()
    expect(screen.queryByText(/hết quota/i)).not.toBeInTheDocument()

    // Truthful empty banner/message
    expect(
      screen.getByText("Chưa có account nào trong pool."),
    ).toBeInTheDocument()
  })

  it("derives operational metrics truthfully from real account statuses", async () => {
    const sampleAccounts: AccountSummary[] = [
      {
        id: "11111111-1111-4111-8111-111111111111",
        providerKey: "seedance",
        displayName: "Account 1",
        externalIdentity: "user-1",
        status: "active",
        lastUsedAt: null,
        lastValidatedAt: null,
        cooldownUntil: null,
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        providerKey: "seedance",
        displayName: "Account 2",
        externalIdentity: "user-2",
        status: "active",
        lastUsedAt: null,
        lastValidatedAt: null,
        cooldownUntil: null,
      },
      {
        id: "33333333-3333-4333-8333-333333333333",
        providerKey: "seedance",
        displayName: "Account 3",
        externalIdentity: "user-3",
        status: "auth_required",
        lastUsedAt: null,
        lastValidatedAt: null,
        cooldownUntil: null,
      },
      {
        id: "44444444-4444-4444-8444-444444444444",
        providerKey: "seedance",
        displayName: "Account 4",
        externalIdentity: "user-4",
        status: "cooldown",
        lastUsedAt: null,
        lastValidatedAt: null,
        cooldownUntil: "2026-09-18T12:00:00Z",
      },
    ]

    const mockClient: ApiClient = {
      get: vi.fn().mockImplementation((path: string) => {
        if (path.startsWith("/api/accounts")) {
          return Promise.resolve(sampleAccounts)
        }
        if (path === "/api/providers") {
          return Promise.resolve([
            { key: "seedance", displayName: "Seedance", authKind: "browser_session" },
          ])
        }
        return Promise.resolve([])
      }),
      post: vi.fn(),
      delete: vi.fn(),
    }

    renderPage(mockClient)

    expect(await screen.findByText("Account Pool")).toBeInTheDocument()

    // Truthful banner: 2/4 account đang sẵn sàng sử dụng
    expect(
      await screen.findByText("2/4 account đang sẵn sàng sử dụng."),
    ).toBeInTheDocument()

    // Metrics: total=4, active=2, auth_required=1, cooldown=1
    expect(screen.getByTestId("metric-total")).toHaveTextContent("4")
    expect(screen.getByTestId("metric-active")).toHaveTextContent("2")
    expect(screen.getByTestId("metric-auth-required")).toHaveTextContent("1")
    expect(screen.getByTestId("metric-cooldown")).toHaveTextContent("1")

    // Fake metrics MUST NOT exist
    expect(screen.queryByText("12.480")).not.toBeInTheDocument()
    expect(screen.queryByText(/8\/12/)).not.toBeInTheDocument()
  })
})
