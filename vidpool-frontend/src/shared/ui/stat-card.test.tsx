import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { StatCard } from "./stat-card"

describe("StatCard", () => {
  it("renders title, value, subtext, and badge", () => {
    render(
      <StatCard
        title="Tổng video"
        value={42}
        subtext="Đã cập nhật hôm nay"
        badge="Active"
      />
    )

    expect(screen.getByText("Tổng video")).toBeInTheDocument()
    expect(screen.getByText("42")).toBeInTheDocument()
    expect(screen.getByText("Đã cập nhật hôm nay")).toBeInTheDocument()
    expect(screen.getByText("Active")).toBeInTheDocument()
  })

  it("renders trend with semantic tone and direction", () => {
    const { rerender } = render(
      <StatCard
        title="Latency"
        value="120ms"
        trend={{ direction: "down", tone: "success", text: "15% nhanh hơn" }}
      />
    )

    const successTrend = screen.getByText(/15% nhanh hơn/)
    expect(successTrend).toHaveClass("text-emerald-400")
    expect(successTrend.textContent).toContain("↓")

    rerender(
      <StatCard
        title="Errors"
        value="5"
        trend={{ direction: "up", tone: "danger", text: "+2 lỗi mới" }}
      />
    )

    const dangerTrend = screen.getByText(/\+2 lỗi mới/)
    expect(dangerTrend).toHaveClass("text-rose-400")
    expect(dangerTrend.textContent).toContain("↑")
  })

  it("renders progress bar when progress prop is provided", () => {
    render(
      <StatCard
        title="Dung lượng"
        value="12.6 GB"
        progress={{ current: 12.6, max: 50, percent: 25.2 }}
      />
    )

    expect(screen.getByText("12.6 GB / 50 GB")).toBeInTheDocument()
    expect(screen.getByText("25.2%")).toBeInTheDocument()
  })
})
