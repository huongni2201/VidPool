import { render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { describe, expect, it, vi } from "vitest"

import { ApiClientProvider } from "./app/api-client-context"
import App from "./App"
import type { ApiClient } from "./lib/api-client"

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
      get: vi.fn().mockResolvedValue({ status: "ok" }),
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
