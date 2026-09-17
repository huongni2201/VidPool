import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { renderWithProviders } from "@/test/utils"
import { DashboardPage } from "./dashboard-page"

describe("DashboardPage", () => {
  it("renders welcome banner, KPI cards, and project overview", () => {
    renderWithProviders(<DashboardPage />)

    expect(screen.getByText("Chào mừng bạn đến với VidPool")).toBeInTheDocument()
    expect(screen.getByText("Dự Án Gần Đây")).toBeInTheDocument()
    expect(screen.getByText("Generation Queue")).toBeInTheDocument()
  })
})
