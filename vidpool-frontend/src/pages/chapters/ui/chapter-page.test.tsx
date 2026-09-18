import { cleanup, render, screen, fireEvent } from "@testing-library/react"
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ChapterPage } from "./chapter-page"

function LocationDisplay() {
  const location = useLocation()
  return <div data-testid="location-display">{location.pathname}</div>
}

function renderChapterPage(initialEntry = "/chapters/chap-03") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <LocationDisplay />
      <Routes>
        <Route path="/chapters/:chapterId" element={<ChapterPage />} />
        <Route path="/chapters" element={<ChapterPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe("ChapterPage", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders chapter header, chapter list, and editor form", () => {
    renderChapterPage("/chapters/chap-03")

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

  it("switches chapters and updates URL when clicking another chapter in list", () => {
    renderChapterPage("/chapters/chap-03")

    // Click Chapter 01
    const chapter1 = screen.getByText("Khởi đầu hành trình")
    fireEvent.click(chapter1)

    // F4 Invariant: URL navigates to /chapters/chap-01
    expect(screen.getByTestId("location-display").textContent).toBe("/chapters/chap-01")

    // Expect Chapter 01 to become active in header and form
    expect(
      screen.getByRole("heading", { level: 2, name: /Chapter 01: Khởi đầu hành trình/i })
    ).toBeInTheDocument()
    expect(screen.getByDisplayValue("Khởi đầu hành trình")).toBeInTheDocument()
  })

  it("updates word count dynamically when editing story text", () => {
    renderChapterPage("/chapters/chap-03")

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
    renderChapterPage("/chapters/chap-03")

    expect(screen.getByRole("heading", { level: 3, name: /Cảnh đã phân tích/i })).toBeInTheDocument()
    expect(screen.getByText(/Cảnh 1: Lối vào cổ mộ/i)).toBeInTheDocument()
    expect(screen.getByText(/Cảnh 2: Khám phá điện thờ/i)).toBeInTheDocument()
    expect(screen.getByText(/Cảnh 3: Hộ mộ thú thức tỉnh/i)).toBeInTheDocument()
    expect(screen.getByText(/Cảnh 4: Màn chắn ngọc bích/i)).toBeInTheDocument()
  })

  it("adds a new chapter and navigates to new chapter URL when clicking Thêm button", () => {
    renderChapterPage("/chapters/chap-03")

    const addButton = screen.getByRole("button", { name: /Thêm/i })
    fireEvent.click(addButton)

    // F4 Invariant: Clicking Thêm MUST navigate to the new chapter URL
    expect(screen.getByTestId("location-display").textContent).toBe("/chapters/chap-05")

    expect(
      screen.getByRole("heading", { level: 2, name: /Chapter 05: Phân đoạn mới/i })
    ).toBeInTheDocument()
  })

  it("isolates analysis results and does not leak results to unanalyzed chapters", () => {
    renderChapterPage("/chapters/chap-03")

    // Chapter 03 analysis result is present (visible in analysis result panel)
    expect(screen.getAllByText("Tiêu Viêm").length).toBeGreaterThan(0)

    // Switch to Chapter 01 (which has no analysis result yet)
    const chapter1 = screen.getByText("Khởi đầu hành trình")
    fireEvent.click(chapter1)

    // F5 Invariant: Chapter 01 must NOT show Chapter 03's analysis result!
    expect(screen.getByTestId("location-display").textContent).toBe("/chapters/chap-01")
    expect(screen.getAllByText(/Chưa có dữ liệu phân tích/i).length).toBeGreaterThan(0)
    expect(screen.queryAllByText("Tiêu Viêm").length).toBe(0)
  })

  it("isolates analyzing state when switching chapters during active analysis", () => {
    renderChapterPage("/chapters/chap-01")

    // Initially chapter 01 is not analyzing
    expect(screen.queryByText(/Đang xử lý/i)).not.toBeInTheDocument()

    // Click Phân tích chapter on Chapter 01
    const analyzeButton = screen.getByRole("button", { name: /Phân tích chapter/i })
    fireEvent.click(analyzeButton)

    // Now Chapter 01 shows analyzing state
    expect(screen.getAllByText(/Đang xử lý/i).length).toBeGreaterThan(0)

    // Switch to Chapter 02
    const chapter2 = screen.getByText("Rừng sương mù")
    fireEvent.click(chapter2)

    // Chapter 02 must NOT show analyzing state!
    expect(screen.getByTestId("location-display").textContent).toBe("/chapters/chap-02")
    expect(screen.queryByText(/Đang xử lý/i)).not.toBeInTheDocument()

    // Switch back to Chapter 01
    const chapter1 = screen.getByText("Khởi đầu hành trình")
    fireEvent.click(chapter1)

    // Chapter 01 continues showing analyzing state
    expect(screen.getByTestId("location-display").textContent).toBe("/chapters/chap-01")
    expect(screen.getAllByText(/Đang xử lý/i).length).toBeGreaterThan(0)
  })

  it("preserves updated word count when analysis completes asynchronously", () => {
    vi.useFakeTimers()
    try {
      renderChapterPage("/chapters/chap-01")

      // 1. Click Phân tích chapter on Chapter 01
      const analyzeButton = screen.getByRole("button", { name: /Phân tích chapter/i })
      fireEvent.click(analyzeButton)

      // 2. While analysis is running, edit the story text
      const textarea = screen.getByPlaceholderText(
        /Nhập hoặc dán toàn bộ nội dung cốt truyện của chapter vào đây.../i
      )
      fireEvent.change(textarea, {
        target: { value: "Một hai ba bốn năm sáu bảy." },
      })

      // Word count is now 7 words
      expect(screen.getByText("7 / 5.000 từ")).toBeInTheDocument()

      // 3. Fast-forward timers for analysis completion
      vi.advanceTimersByTime(3500)

      // Invariant: Analysis completion must NOT overwrite word count with stale 0 count
      expect(screen.getByText("7 / 5.000 từ")).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })
})
