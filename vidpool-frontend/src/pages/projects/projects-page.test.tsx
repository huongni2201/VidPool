import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { renderWithProviders } from "@/test/utils"
import { ProjectsPage } from "./ui/projects-page"

describe("ProjectsPage", () => {
  it("renders projects list and create action", () => {
    renderWithProviders(<ProjectsPage />)

    expect(screen.getByText("Quản Lý Dự Án")).toBeInTheDocument()
    expect(screen.getByText("+ Tạo dự án mới")).toBeInTheDocument()
    expect(screen.getByText("Thanh Xuân Trở Lại")).toBeInTheDocument()
  })
})
