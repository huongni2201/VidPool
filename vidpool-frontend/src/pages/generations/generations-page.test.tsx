import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { renderWithProviders } from "@/test/utils"
import { GenerationsPage } from "./generations-page"

describe("GenerationsPage", () => {
  it("renders queue, status cards, and create generation action", () => {
    renderWithProviders(<GenerationsPage />)

    expect(screen.getByText("Generations & Queue")).toBeInTheDocument()
    expect(screen.getByText("+ Tạo generation mới")).toBeInTheDocument()
    expect(screen.getByText("Đang xử lý")).toBeInTheDocument()
  })
})
