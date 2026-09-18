import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { StatusBadge } from "./status-badge"

describe("StatusBadge", () => {
  it("renders with status text and applies tone styling", () => {
    const { rerender } = render(<StatusBadge tone="success">Thành công</StatusBadge>)
    const badge = screen.getByText("Thành công").parentElement
    expect(badge).toHaveClass("text-emerald-400")

    rerender(<StatusBadge tone="danger">Lỗi kết nối</StatusBadge>)
    expect(screen.getByText("Lỗi kết nối").parentElement).toHaveClass("text-rose-300")
  })

  it("maps legacy status strings to appropriate tones", () => {
    const { rerender } = render(<StatusBadge status="Đang hoạt động" />)
    expect(screen.getByText("Đang hoạt động").parentElement).toHaveClass("text-emerald-400")

    rerender(<StatusBadge status="Thất bại" />)
    expect(screen.getByText("Thất bại").parentElement).toHaveClass("text-rose-300")

    rerender(<StatusBadge status="Cần đăng nhập" />)
    expect(screen.getByText("Cần đăng nhập").parentElement).toHaveClass("text-amber-300")
  })
})
