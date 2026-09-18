import { cleanup, render, screen, fireEvent } from "@testing-library/react"
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom"
import { afterEach, describe, expect, it } from "vitest"
import { VisualBeatPage } from "./visual-beat-page"

function LocationDisplay() {
  const location = useLocation()
  return <div data-testid="location-display">{location.pathname + location.search}</div>
}

function renderVisualBeatPage(initialEntry = "/visual-beat") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <LocationDisplay />
      <Routes>
        <Route path="/visual-beat" element={<VisualBeatPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe("VisualBeatPage - Chapter > Scene > Visual Beat Hierarchy", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders chapter selector, scene tabs, and visual beats for default chapter (Chapter 03)", () => {
    renderVisualBeatPage("/visual-beat")

    // Heading and breadcrumbs
    expect(screen.getByRole("heading", { level: 2, name: /Visual Beat/i })).toBeInTheDocument()
    expect(screen.getByText(/Kịch bản & Chapters/i)).toBeInTheDocument()

    // Chapter selector has Chapter 03 selected by default
    const chapterSelect = screen.getByLabelText(/Chọn Chapter/i) as HTMLSelectElement
    expect(chapterSelect.value).toBe("chap-03")

    // Scene tabs for Chapter 03
    expect(screen.getByRole("button", { name: /Tất cả các cảnh/i })).toBeInTheDocument()
    expect(screen.getAllByText(/Lối vào cổ mộ/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Khám phá điện thờ/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Hộ mộ thú thức tỉnh/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Màn chắn ngọc bích/i).length).toBeGreaterThan(0)

    // Default "all scenes" shows beats from multiple scenes
    expect(screen.getAllByText(/Tiêu Viêm đứng trước cửa cổ mộ/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Phủi bụi ký tự cổ đại phát sáng/i).length).toBeGreaterThan(0)
  })

  it("filters visual beats when selecting a specific scene tab", () => {
    renderVisualBeatPage("/visual-beat?chapterId=chap-03")

    // Click Scene 1 ("Lối vào cổ mộ")
    const scene1Tab = screen.getAllByText(/Lối vào cổ mộ/i)[0].closest("button")!
    fireEvent.click(scene1Tab)

    // URL is updated with sceneId=scene-3-1
    expect(screen.getByTestId("location-display").textContent).toContain("sceneId=scene-3-1")

    // Beats of Scene 1 should be visible
    expect(screen.getAllByText(/Tiêu Viêm đứng trước cửa cổ mộ/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Phủi bụi ký tự cổ đại phát sáng/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Dược Lão vuốt râu cảnh báo/i).length).toBeGreaterThan(0)

    // Beats of Scene 2 should NOT be visible
    expect(screen.queryByText(/Bước vào điện thờ cổ u ám/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Quan sát bàn thờ đá trung tâm/i)).not.toBeInTheDocument()
  })

  it("restores all beats when clicking 'Tất cả các cảnh' tab", () => {
    renderVisualBeatPage("/visual-beat?chapterId=chap-03&sceneId=scene-3-1")

    // Initially Scene 2 beats are not present
    expect(screen.queryByText(/Bước vào điện thờ cổ u ám/i)).not.toBeInTheDocument()

    // Click "Tất cả các cảnh"
    const allTab = screen.getByRole("button", { name: /Tất cả các cảnh/i })
    fireEvent.click(allTab)

    // URL is updated with sceneId=all
    expect(screen.getByTestId("location-display").textContent).toContain("sceneId=all")

    // Both Scene 1 and Scene 2 beats are visible
    expect(screen.getAllByText(/Tiêu Viêm đứng trước cửa cổ mộ/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Bước vào điện thờ cổ u ám/i).length).toBeGreaterThan(0)
  })

  it("reads chapterId and sceneId from initial URL parameters", () => {
    renderVisualBeatPage("/visual-beat?chapterId=chap-03&sceneId=scene-3-2")

    // Scene 2 is active
    expect(screen.getAllByText(/Bước vào điện thờ cổ u ám/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Quan sát bàn thờ đá trung tâm/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Tiêu Viêm đưa tay mở hộp ngọc/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Bản văn Hồn Cốt Quyết xuất hiện/i).length).toBeGreaterThan(0)

    // Scene 1 beats are not shown
    expect(screen.queryByText(/Tiêu Viêm đứng trước cửa cổ mộ/i)).not.toBeInTheDocument()
  })

  it("switches chapters and updates available scenes and beats", () => {
    renderVisualBeatPage("/visual-beat?chapterId=chap-03")

    // Select Chapter 01
    const chapterSelect = screen.getByLabelText(/Chọn Chapter/i)
    fireEvent.change(chapterSelect, { target: { value: "chap-01" } })

    // URL updated to chap-01
    expect(screen.getByTestId("location-display").textContent).toContain("chapterId=chap-01")

    // Chapter 01 scenes are displayed
    expect(screen.getAllByText(/Rời khỏi gia tộc/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Chân núi Ma Thú/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Chiếc nhẫn đen thức tỉnh/i).length).toBeGreaterThan(0)

    // Chapter 01 beats are displayed
    expect(screen.getAllByText(/Tiêu Viêm nhìn cổng gia tộc/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Tiêu Huân Nhi vẫy tay từ xa/i).length).toBeGreaterThan(0)
  })

  it("toggles between Storyboard Grid and Table views", () => {
    renderVisualBeatPage("/visual-beat?chapterId=chap-03&sceneId=scene-3-1")

    // Switch to Table view
    const tableButton = screen.getByTitle(/Chế độ Bảng Studio/i)
    fireEvent.click(tableButton)

    // Check table headers
    expect(screen.getByRole("columnheader", { name: /Preview/i })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: /Thoại \(TTS\)/i })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: /Thời lượng/i })).toBeInTheDocument()

    // Switch back to Grid view
    const gridButton = screen.getByTitle(/Chế độ Storyboard Lưới/i)
    fireEvent.click(gridButton)

    // Table headers should no longer be in the document
    expect(screen.queryByRole("columnheader", { name: /Preview/i })).not.toBeInTheDocument()
  })

  it("updates inspector panel when a different beat is selected", () => {
    renderVisualBeatPage("/visual-beat?chapterId=chap-03&sceneId=scene-3-1")

    // Click on Beat 2 ("Phủi bụi ký tự cổ đại phát sáng")
    const beat2Card = screen.getAllByText(/Phủi bụi ký tự cổ đại phát sáng/i)[0].closest("div[class*='cursor-pointer']")!
    fireEvent.click(beat2Card)

    // Inspector should display Beat 2 details
    expect(screen.getByRole("heading", { level: 3, name: /Beat #2: Phủi bụi ký tự cổ đại phát sáng/i })).toBeInTheDocument()
    expect(screen.getByDisplayValue(/Ký tự này... chính là nơi phong ấn Hồn Cốt Quyết!/i)).toBeInTheDocument()
  })

  it("filters beats by status tab", () => {
    renderVisualBeatPage("/visual-beat?chapterId=chap-03&sceneId=all")

    // Click "Đang tạo" tab
    const generatingTab = screen.getByRole("button", { name: /Đang tạo/i })
    fireEvent.click(generatingTab)

    // Only "Đang tạo" beats shown
    expect(screen.getAllByText(/Tiêu Viêm đưa tay mở hộp ngọc/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Bản văn Hồn Cốt Quyết xuất hiện/i).length).toBeGreaterThan(0)

    // "Đã tạo" beats should not appear in displayed list
    expect(screen.queryByText(/Tiêu Viêm đứng trước cửa cổ mộ/i)).not.toBeInTheDocument()
  })
})
