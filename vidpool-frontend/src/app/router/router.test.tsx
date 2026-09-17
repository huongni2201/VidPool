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

  it("follows CapCut desktop workflow: lands at Project Hub on /, switches to workspace tools in editor with exit button", async () => {
    renderWithRouter("/")

    // Launcher mode: shows CapCut quick launcher hero and projects
    expect(await screen.findByText("Bắt đầu sáng tạo video mới")).toBeInTheDocument()
    expect(screen.getByText("+ Tạo dự án mới")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Dự án của tôi/i })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Tài khoản AI/i })).toBeInTheDocument()

    // In launcher mode, workspace editing tools are NOT in sidebar navigation
    expect(screen.queryByRole("link", { name: /^Chỉnh sửa$/i })).not.toBeInTheDocument()

    // Click on a project card (e.g. Thanh Xuân Trở Lại) to enter editor
    const projectCard = screen.getByText("Thanh Xuân Trở Lại")
    fireEvent.click(projectCard)

    // Now in workspace mode (/editor):
    // 1. CapCut exit to project hub button is present in sidebar and topbar
    const exitButtons = screen.getAllByRole("link", { name: /Màn hình dự án/i })
    expect(exitButtons.length).toBeGreaterThanOrEqual(1)

    // 2. Project workspace tools are visible in sidebar
    expect(screen.getByRole("link", { name: /^Chỉnh sửa$/i })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /^Visual Beat$/i })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /^Nhân vật$/i })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /^Voice$/i })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Hàng đợi & Render/i })).toBeInTheDocument()

    // 3. No standalone "Dự án" tab in the workspace sidebar!
    expect(screen.queryByRole("link", { name: /^Dự án$/i })).not.toBeInTheDocument()

    // 4. Click exit button to return to Project Hub
    fireEvent.click(exitButtons[0])
    expect(await screen.findByText("Bắt đầu sáng tạo video mới")).toBeInTheDocument()
  })
})
