import { cleanup, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it } from "vitest"
import { Sidebar } from "./sidebar"

describe("Sidebar widget", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders navigation items without hardcoded fake badges or fake user email", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Sidebar backendStatus="ok" />
      </MemoryRouter>
    )

    expect(screen.getByText("Dự án của tôi")).toBeInTheDocument()
    expect(screen.getByText("Tài khoản AI")).toBeInTheDocument()
    expect(screen.getByText("Cài đặt")).toBeInTheDocument()

    // Truthful runtime: No fake user profile card
    expect(screen.queryByText("user@vidpool.ai")).not.toBeInTheDocument()
    expect(screen.queryByText("Thanh Xuân Trở Lại")).not.toBeInTheDocument()

    // Truthful runtime: No fake badge numbers
    expect(screen.queryByText("3")).not.toBeInTheDocument()
    expect(screen.queryByText("8")).not.toBeInTheDocument()

    // Version display fallback
    expect(screen.getByText("v0.1.0")).toBeInTheDocument()
    expect(screen.getByText("Backend connected")).toBeInTheDocument()
  })
})
