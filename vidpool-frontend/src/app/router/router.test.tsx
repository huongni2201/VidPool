import { fireEvent, render, screen } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { describe, expect, it, vi } from "vitest"

import { ApiClientProvider, type ApiClient } from "@/shared/api"
import { routes } from "./router"

describe("Router Navigation", () => {
  function renderWithRouter(initialEntry = "/accounts") {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })

    const mockClient: ApiClient = {
      get: vi.fn().mockImplementation((path: string) => {
        if (path === "/api/health") return Promise.resolve({ status: "ok" })
        if (path.startsWith("/api/accounts")) return Promise.resolve([])
        if (path.startsWith("/api/providers")) return Promise.resolve([])
        return Promise.resolve({ status: "ok" })
      }),
      post: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue(undefined),
    }

    const testRouter = createMemoryRouter(routes, {
      initialEntries: [initialEntry],
    })

    return render(
      <QueryClientProvider client={queryClient}>
        <ApiClientProvider client={mockClient}>
          <RouterProvider router={testRouter} />
        </ApiClientProvider>
      </QueryClientProvider>,
    )
  }

  it("renders Account Pool at /accounts and highlights active navigation link", async () => {
    renderWithRouter("/accounts")

    // Account Pool header in Topbar or Page
    expect(await screen.findByText("Account Pool")).toBeInTheDocument()

    // Find the accounts nav link in sidebar
    const accountsLink = screen.getByRole("link", { name: /Tài khoản AI/i })
    expect(accountsLink).toBeInTheDocument()
    expect(accountsLink.className).toContain("border-blue-500/35")

    // Click on "Dự án của tôi" (Dashboard/Projects route)
    const dashboardLink = screen.getByRole("link", { name: /Dự án của tôi/i })
    fireEvent.click(dashboardLink)

    // Should navigate to dashboard/projects
    expect(dashboardLink.className).toContain("border-blue-500/35")
  })

  it("renders workspace mode when in /editor with CapCut exit button and project tools", async () => {
    renderWithRouter("/editor")

    // 1. CapCut exit to project hub button is present in sidebar and topbar
    const exitButtons = await screen.findAllByRole("button", { name: /Màn hình dự án/i })
    expect(exitButtons.length).toBeGreaterThanOrEqual(1)

    // 2. Active project badge
    expect(screen.getAllByText("Đang chỉnh sửa").length).toBeGreaterThanOrEqual(1)

    // 3. Project workspace tools are visible in sidebar
    expect(screen.getByRole("link", { name: /^Chỉnh sửa$/i })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /^Visual Beat$/i })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /^Nhân vật$/i })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /^Voice$/i })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Hàng đợi & Render/i })).toBeInTheDocument()

    // 4. Standalone "Dự án" tab is NOT in the workspace sidebar!
    expect(screen.queryByRole("link", { name: /^Dự án$/i })).not.toBeInTheDocument()

    // 5. Exit button navigates back to Project Hub /
    fireEvent.click(exitButtons[0])

    // After exiting to hub, launcher nav items appear
    expect((await screen.findAllByText("Dự án của tôi")).length).toBeGreaterThanOrEqual(1)
  })
})
