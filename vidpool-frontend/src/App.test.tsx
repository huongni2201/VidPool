import { render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { describe, expect, it, vi } from "vitest"

vi.mock("./lib/api", () => ({
  getHealth: vi.fn().mockResolvedValue({ status: "ok" }),
}))

import App from "./App"

describe("App", () => {
  it("renders the VidPool shell", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <App />
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
