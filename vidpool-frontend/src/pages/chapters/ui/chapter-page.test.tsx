import { cleanup, render, screen, fireEvent } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it } from "vitest"
import { ChapterPage } from "./chapter-page"

describe("ChapterPage", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders chapter header, chapter list, and editor form", () => {
    render(
      <MemoryRouter initialEntries={["/chapters/chap-03"]}>
        <ChapterPage />
      </MemoryRouter>
    )

    // Check chapter title in header
    expect(
      screen.getByRole("heading", { level: 2, name: /Chapter 03: Bí mật cổ mộ/i })
    ).toBeInTheDocument()

    // Check left list items
    expect(screen.getByText("Khởi đầu hành trình")).toBeInTheDocument()
    expect(screen.getByText("Trận chiến đỉnh núi")).toBeInTheDocument()

    // Check editor form inputs
    expect(screen.getByDisplayValue("Bí mật cổ mộ")).toBeInTheDocument()
    expect(
      screen.getByDisplayValue(/Khám phá lăng mộ ngàn năm và tìm thấy bí kíp thất truyền/i)
    ).toBeInTheDocument()

    // Check action buttons
    expect(screen.getByRole("button", { name: /Đã lưu/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Phân tích chapter/i })).toBeInTheDocument()
  })

  it("switches chapters when clicking another chapter in list", () => {
    render(
      <MemoryRouter initialEntries={["/chapters/chap-03"]}>
        <ChapterPage />
      </MemoryRouter>
    )

    // Click Chapter 01
    const chapter1 = screen.getByText("Khởi đầu hành trình")
    fireEvent.click(chapter1)

    // Expect Chapter 01 to become active in header and form
    expect(
      screen.getByRole("heading", { level: 2, name: /Chapter 01: Khởi đầu hành trình/i })
    ).toBeInTheDocument()
    expect(screen.getByDisplayValue("Khởi đầu hành trình")).toBeInTheDocument()
  })

  it("updates word count dynamically when editing story text", () => {
    render(
      <MemoryRouter initialEntries={["/chapters/chap-03"]}>
        <ChapterPage />
      </MemoryRouter>
    )

    const textarea = screen.getByPlaceholderText(
      /Nhập hoặc dán toàn bộ nội dung cốt truyện của chapter vào đây.../i
    )

    fireEvent.change(textarea, {
      target: { value: "Một hai ba bốn năm sáu bảy tám chín mười." },
    })

    // 10 words
    expect(screen.getByText("10 / 5.000 từ")).toBeInTheDocument()
  })

  it("renders analyzed scenes list with scene cards", () => {
    render(
      <MemoryRouter initialEntries={["/chapters/chap-03"]}>
        <ChapterPage />
      </MemoryRouter>
    )

    expect(screen.getByRole("heading", { level: 3, name: /Cảnh đã phân tích/i })).toBeInTheDocument()
    expect(screen.getByText(/Cảnh 1: Lối vào cổ mộ/i)).toBeInTheDocument()
    expect(screen.getByText(/Cảnh 2: Khám phá điện thờ/i)).toBeInTheDocument()
    expect(screen.getByText(/Cảnh 3: Hộ mộ thú thức tỉnh/i)).toBeInTheDocument()
    expect(screen.getByText(/Cảnh 4: Màn chắn ngọc bích/i)).toBeInTheDocument()
  })

  it("adds a new chapter when clicking Thêm button", () => {
    render(
      <MemoryRouter initialEntries={["/chapters/chap-03"]}>
        <ChapterPage />
      </MemoryRouter>
    )

    const addButton = screen.getByRole("button", { name: /Thêm/i })
    fireEvent.click(addButton)

    expect(
      screen.getByRole("heading", { level: 2, name: /Chapter 05: Phân đoạn mới/i })
    ).toBeInTheDocument()
  })
})
