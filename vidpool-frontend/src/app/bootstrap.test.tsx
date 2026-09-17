import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { Bootstrap } from "./bootstrap"
import { useApiClient } from "./api-client-context"

vi.mock("@/runtime/runtime-config", () => ({
  loadRuntimeConfig: vi.fn(),
}))

import { loadRuntimeConfig } from "@/runtime/runtime-config"

function ProbeChild() {
  const client = useApiClient()
  return <div>Loaded with client: {typeof client.get}</div>
}

describe("Bootstrap", () => {
  it("shows loading state initially while resolving config", () => {
    vi.mocked(loadRuntimeConfig).mockReturnValue(new Promise(() => {}))

    render(
      <Bootstrap>
        <div>Child Content</div>
      </Bootstrap>,
    )

    expect(screen.getByText("Starting VidPool…")).toBeInTheDocument()
    expect(screen.queryByText("Child Content")).not.toBeInTheDocument()
  })

  it("shows error state when loadRuntimeConfig rejects", async () => {
    vi.mocked(loadRuntimeConfig).mockRejectedValue(new Error("Network failure"))

    render(
      <Bootstrap>
        <div>Child Content</div>
      </Bootstrap>,
    )

    expect(await screen.findByText("Backend unavailable")).toBeInTheDocument()
    expect(screen.queryByText("Child Content")).not.toBeInTheDocument()
  })

  it("renders children with ApiClientProvider when config resolves successfully", async () => {
    vi.mocked(loadRuntimeConfig).mockResolvedValue({
      apiBaseUrl: "http://127.0.0.1:8123",
      sessionToken: "test-token-value-of-sufficient-length",
    })

    render(
      <Bootstrap>
        <ProbeChild />
      </Bootstrap>,
    )

    expect(
      await screen.findByText("Loaded with client: function"),
    ).toBeInTheDocument()
  })
})
