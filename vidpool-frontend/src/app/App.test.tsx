import { render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { describe, expect, it, vi } from "vitest"

import { ApiClientProvider, type ApiClient } from "@/shared/api"
import { App } from "./App"

describe("App", () => {
  it("renders the VidPool shell and connects to backend", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })

    const mockClient: ApiClient = {
      get: vi.fn().mockImplementation((path: string) => {
        if (path === "/api/health") return Promise.resolve({ status: "ok" })
        if (path === "/api/accounts") return Promise.resolve([])
        return Promise.resolve({ status: "ok" })
      }),
      post: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue(undefined),
    }

    render(
      <QueryClientProvider client={queryClient}>
        <ApiClientProvider client={mockClient}>
          <App />
        </ApiClientProvider>
      </QueryClientProvider>,
    )

    expect(
      screen.getByRole("heading", { name: "VidPool" }),
    ).toBeInTheDocument()

    expect(
      await screen.findByText(/backend connected/i),
    ).toBeInTheDocument()
  })
})
