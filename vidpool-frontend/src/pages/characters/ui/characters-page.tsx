import { useState } from "react"
import { WaveformVisualizer } from "@/shared/ui"
import { demoAvatars, demoCharacterList as characterList } from "@/shared/demo"

export function CharactersPage() {
  const [selectedCharacter, setSelectedCharacter] = useState("Mai")
  const [isLocked, setIsLocked] = useState(true)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")

  const allCount = characterList.length
  const mainCount = characterList.filter((c) => c.role === "Nhân vật chính").length
  const subCount = characterList.filter((c) => c.role === "Phụ").length
  const otherCount = characterList.filter((c) => c.role === "Khác").length

  const filteredList = characterList.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
    const matchesRole = roleFilter === "all" || c.role === roleFilter
    return matchesSearch && matchesRole
  })

  const activeChar = characterList.find((c) => c.name === selectedCharacter) || characterList[0]

  const turnaroundSlots = [
    {
      label: "Front",
      sub: "(Chính diện)",
      image: activeChar.avatar,
    },
    {
      label: "3/4 Left",
      sub: "(Nghiêng trái)",
      image: demoAvatars[1],
    },
    {
      label: "3/4 Right",
      sub: "(Nghiêng phải)",
      image: demoAvatars[2],
    },
    {
      label: "Profile",
      sub: "(Nghiêng ngang)",
      image: demoAvatars[3],
    },
    {
      label: "Full Body",
      sub: "(Toàn thân)",
      image: activeChar.avatar,
    },
    {
      label: "Outfit / Biểu cảm",
      sub: "(Trang phục / Cảm xúc)",
      image: demoAvatars[1],
    },
  ]

  return (
    <div className="flex flex-col gap-5 p-5 max-w-[1700px] mx-auto select-none">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Nhân vật</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Quản lý nhân vật, reference hình ảnh và giọng nói để đảm bảo tính nhất quán trong tất cả video. Các reference này sẽ được sử dụng cho Seedance khi tạo video.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300">
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Hướng dẫn sử dụng</span>
          </button>
          <button className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-blue-500/25 hover:bg-blue-500 transition-all">
            <span>+ Nhân vật mới</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-12 gap-5">
        {/* Left Column: Character List (4 cols) */}
        <div className="col-span-4 flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
          {/* Section Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">Danh sách nhân vật</h3>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground border border-border/50">
                {filteredList.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Grid / List View Switcher */}
              <div className="flex items-center rounded-lg border border-border bg-secondary/60 p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  title="Dạng lưới gọn"
                  aria-label="Xem dạng lưới"
                  className={`rounded-md p-1 transition-all ${
                    viewMode === "grid"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  title="Dạng danh sách"
                  aria-label="Xem dạng danh sách"
                  className={`rounded-md p-1 transition-all ${
                    viewMode === "list"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>

              <button className="rounded bg-blue-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-blue-500 transition-colors">
                + Thêm nhân vật
              </button>
            </div>
          </div>

          {/* Search & Category Dropdown */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm nhân vật..."
                className="h-8 w-full rounded-lg border border-border bg-secondary pl-7 pr-7 text-xs text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none"
              />
              <svg className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-2 text-muted-foreground hover:text-foreground text-xs"
                >
                  ✕
                </button>
              )}
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-8 rounded-lg border border-border bg-secondary px-2 text-xs text-foreground cursor-pointer"
            >
              <option value="all">Tất cả ▾</option>
              <option value="Nhân vật chính">Chính</option>
              <option value="Phụ">Phụ</option>
              <option value="Khác">Khác</option>
            </select>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 text-xs flex-wrap">
            <button
              onClick={() => setRoleFilter("all")}
              className={`rounded-lg px-2.5 py-1 text-[11.5px] font-semibold transition-all ${
                roleFilter === "all"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              Tất cả ({allCount})
            </button>
            <button
              onClick={() => setRoleFilter("Nhân vật chính")}
              className={`rounded-lg px-2.5 py-1 text-[11.5px] font-semibold transition-all ${
                roleFilter === "Nhân vật chính"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              Nhân vật chính ({mainCount})
            </button>
            <button
              onClick={() => setRoleFilter("Phụ")}
              className={`rounded-lg px-2.5 py-1 text-[11.5px] font-semibold transition-all ${
                roleFilter === "Phụ"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              Phụ ({subCount})
            </button>
            <button
              onClick={() => setRoleFilter("Khác")}
              className={`rounded-lg px-2.5 py-1 text-[11.5px] font-semibold transition-all ${
                roleFilter === "Khác"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              Khác ({otherCount})
            </button>
          </div>

          {/* Characters Container (Grid or List View) */}
          <div className="max-h-[580px] overflow-y-auto pr-1">
            {filteredList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                <svg className="size-8 mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-xs">Không tìm thấy nhân vật nào</p>
                <button
                  onClick={() => {
                    setSearchQuery("")
                    setRoleFilter("all")
                  }}
                  className="mt-2 text-xs text-blue-400 hover:underline"
                >
                  Xóa bộ lọc
                </button>
              </div>
            ) : viewMode === "grid" ? (
              /* Compact Refined Grid: scaled-down avatars with breathing room */
              <div className="grid grid-cols-2 gap-2 mt-0.5">
                {filteredList.map((c) => {
                  const isSelected = selectedCharacter === c.name
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedCharacter(c.name)}
                      className={`group relative flex flex-col items-center text-center rounded-xl border p-3 transition-all cursor-pointer select-none ${
                        isSelected
                          ? "border-blue-500/80 bg-blue-600/10 ring-1 ring-blue-500/30 shadow-xs"
                          : "border-border bg-secondary/40 hover:border-border/80 hover:bg-secondary/70"
                      }`}
                    >
                      {/* Card Top Row: Role badge & More button */}
                      <div className="flex w-full items-center justify-between gap-1 mb-2">
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md truncate max-w-[70%] ${
                            c.role === "Nhân vật chính"
                              ? "bg-blue-500/15 text-blue-400 border border-blue-500/25"
                              : c.role === "Phụ"
                              ? "bg-amber-500/15 text-amber-300 border border-amber-500/25"
                              : "bg-secondary text-muted-foreground border border-border"
                          }`}
                        >
                          {c.role}
                        </span>

                        <button
                          type="button"
                          onClick={(e) => e.stopPropagation()}
                          className="text-muted-foreground hover:text-foreground opacity-60 group-hover:opacity-100 p-0.5 rounded transition-opacity"
                          title="Tùy chọn"
                        >
                          <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                          </svg>
                        </button>
                      </div>

                      {/* Scaled-down Compact Avatar (56px) */}
                      <div className="relative mb-2">
                        <div
                          className={`size-14 rounded-full overflow-hidden border-2 bg-black/40 ring-2 ring-background transition-transform duration-200 group-hover:scale-105 shadow-sm ${
                            isSelected ? "border-blue-500" : "border-border/80"
                          }`}
                        >
                          {c.isNarrator ? (
                            <div className="size-full flex items-center justify-center bg-blue-950/40 text-blue-400">
                              <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                              </svg>
                            </div>
                          ) : (
                            <img src={c.avatar} alt={c.name} className="size-full object-cover" />
                          )}
                        </div>
                        {isSelected && (
                          <span className="absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-blue-600 text-white text-[9px] font-bold ring-2 ring-background">
                            ✓
                          </span>
                        )}
                      </div>

                      {/* Name & Count */}
                      <span
                        className={`text-xs font-semibold truncate w-full transition-colors ${
                          isSelected ? "text-blue-400 font-bold" : "text-foreground group-hover:text-blue-400"
                        }`}
                      >
                        {c.name}
                      </span>
                      <span className="text-[10.5px] text-muted-foreground mt-0.5">
                        {c.count || "0 video"}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              /* Sleek Horizontal List View */
              <div className="flex flex-col gap-1.5 mt-0.5">
                {filteredList.map((c) => {
                  const isSelected = selectedCharacter === c.name
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedCharacter(c.name)}
                      className={`group flex items-center justify-between rounded-xl border p-2.5 transition-all cursor-pointer select-none ${
                        isSelected
                          ? "border-blue-500/80 bg-blue-600/10 ring-1 ring-blue-500/30 shadow-xs"
                          : "border-border bg-secondary/40 hover:border-border/80 hover:bg-secondary/70"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative size-10 shrink-0">
                          <div
                            className={`size-full rounded-full overflow-hidden border bg-black/40 ring-1 ring-background shadow-xs ${
                              isSelected ? "border-blue-500" : "border-border/80"
                            }`}
                          >
                            {c.isNarrator ? (
                              <div className="size-full flex items-center justify-center bg-blue-950/40 text-blue-400">
                                <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                </svg>
                              </div>
                            ) : (
                              <img src={c.avatar} alt={c.name} className="size-full object-cover" />
                            )}
                          </div>
                          {isSelected && (
                            <span className="absolute -bottom-0.5 -right-0.5 flex size-3.5 items-center justify-center rounded-full bg-blue-600 text-white text-[8px] font-bold ring-1 ring-background">
                              ✓
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`truncate text-xs font-semibold ${
                                isSelected ? "text-blue-400 font-bold" : "text-foreground group-hover:text-blue-400"
                              }`}
                            >
                              {c.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[10px]">
                            <span
                              className={`px-1.5 py-0.2 rounded-md ${
                                c.role === "Nhân vật chính"
                                  ? "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                                  : c.role === "Phụ"
                                  ? "bg-amber-500/15 text-amber-300 border border-amber-500/20"
                                  : "bg-secondary text-muted-foreground border border-border"
                              }`}
                            >
                              {c.role}
                            </span>
                            <span className="text-muted-foreground">{c.count || "0 video"}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => e.stopPropagation()}
                        className="text-muted-foreground hover:text-foreground opacity-60 group-hover:opacity-100 p-1 rounded transition-opacity"
                        title="Tùy chọn"
                      >
                        <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                        </svg>
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Character Studio Workspace (8 cols) */}
        <div className="col-span-8 flex flex-col gap-4">
          {/* Card 1: Character Info Profile */}
          <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="text-sm font-bold text-foreground">Thông tin nhân vật</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Trạng thái</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400 border border-emerald-500/20">
                  <span className="size-1.5 rounded-full bg-emerald-400" />
                  Đang sử dụng ▾
                </span>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-4">
              {/* Master Reference Avatar (4 cols) */}
              <div className="col-span-4 relative rounded-xl overflow-hidden bg-black/40 border border-border">
                {activeChar.isNarrator ? (
                  <div className="size-full flex flex-col items-center justify-center bg-blue-950/40 text-blue-400 aspect-[4/5] p-4">
                    <svg className="size-16 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    <span className="text-xs font-semibold text-foreground">Giọng đọc thuyết minh</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">Không yêu cầu hình ảnh visual</span>
                  </div>
                ) : (
                  <img
                    key={activeChar.id}
                    src={activeChar.avatar}
                    alt={activeChar.name}
                    className="size-full object-cover aspect-[4/5]"
                  />
                )}
                <button className="absolute bottom-2.5 right-2.5 flex size-8 items-center justify-center rounded-lg bg-black/60 backdrop-blur-md text-white hover:bg-black/80">
                  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              </div>

              {/* Form details (8 cols) */}
              <div className="col-span-8 flex flex-col gap-2.5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Tên nhân vật</label>
                    <input
                      key={`name-${activeChar.id}`}
                      type="text"
                      defaultValue={activeChar.name}
                      className="h-8 w-full rounded-lg border border-border bg-secondary px-2.5 text-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Vai trò</label>
                    <select
                      key={`role-${activeChar.id}`}
                      defaultValue={activeChar.role}
                      className="h-8 w-full rounded-lg border border-border bg-secondary px-2 text-foreground"
                    >
                      <option value="Nhân vật chính">Nhân vật chính</option>
                      <option value="Phụ">Nhân vật phụ</option>
                      <option value="Khác">Khác / Thuyết minh</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Tuổi (ước tính)</label>
                  <input
                    type="text"
                    defaultValue="18 - 22"
                    className="h-8 w-full rounded-lg border border-border bg-secondary px-2.5 text-foreground"
                  />
                </div>

                {/* Traits tags */}
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Tính cách</label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {["Dịu dàng", "Mạnh mẽ", "Suy tư"].map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-md bg-secondary/80 px-2 py-0.5 text-[11px] text-foreground border border-border/50"
                      >
                        {tag}
                        <button className="text-muted-foreground hover:text-foreground">✕</button>
                      </span>
                    ))}
                    <button className="rounded-md border border-dashed border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:border-foreground">
                      + Thêm
                    </button>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <div className="flex justify-between text-[11px] font-semibold text-muted-foreground mb-1">
                    <span>Mô tả nhân vật</span>
                    <span className="text-[10px] text-muted-foreground">123/500</span>
                  </div>
                  <textarea
                    rows={2}
                    defaultValue="Cô gái trẻ, học sinh đại học, giàu cảm xúc, luôn hướng về phía trước. Dù trải qua nhiều biến cố nhưng vẫn giữ được sự lạc quan và ấm áp."
                    className="w-full rounded-lg border border-border bg-secondary p-2 text-xs text-foreground leading-relaxed resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Reference Turnaround Sheets */}
          <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">Reference hình ảnh</h3>
                <p className="text-[11px] text-muted-foreground">
                  Bộ hình ảnh tham chiếu để duy trì ngoại hình nhất quán khi tạo video với Seedance.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsLocked(!isLocked)}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                    isLocked ? "bg-blue-600 text-white" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>{isLocked ? "Khóa reference" : "Mở khóa"}</span>
                </button>
                <button className="rounded-lg border border-border bg-secondary px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-secondary/80">
                  Tạo pack mẫu
                </button>
                <button className="text-muted-foreground hover:text-foreground p-1">
                  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 6 Turnaround Slots Grid */}
            <div className="grid grid-cols-6 gap-2">
              {turnaroundSlots.map((slot, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <div className="relative aspect-[3/4] w-full rounded-lg overflow-hidden bg-black/40 border border-border">
                    <img src={slot.image} alt={slot.label} className="size-full object-cover" />
                  </div>
                  <div className="text-center">
                    <span className="text-[11px] font-semibold text-foreground block truncate">{slot.label}</span>
                    <span className="text-[9.5px] text-muted-foreground block truncate">{slot.sub}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Row: Voice Reference & Notes */}
          <div className="grid grid-cols-12 gap-4">
            {/* Voice Reference Card (7 cols) */}
            <div className="col-span-7 rounded-xl border border-border bg-card p-4 flex flex-col justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-foreground">Reference giọng nói</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Giọng nói này sẽ được sử dụng để tạo thoại với TTS, đảm bảo tính nhất quán cho nhân vật.
                </p>
              </div>

              <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/50 p-2.5">
                <button className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-md shadow-blue-500/25">
                  <svg className="size-4 fill-current ml-0.5" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>
                <div className="flex-1">
                  <WaveformVisualizer height={22} barCount={40} progress={0.5} activeColor="var(--primary)" />
                  <div className="flex justify-between text-[10px] text-muted-foreground font-mono mt-1">
                    <span>00:00 / 00:08</span>
                    <span>1.0x</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="flex-1 rounded-lg border border-border bg-secondary py-1.5 text-xs font-semibold text-foreground hover:bg-secondary/80">
                  Nghe voice
                </button>
                <button className="flex-1 rounded-lg border border-border bg-secondary py-1.5 text-xs font-semibold text-foreground hover:bg-secondary/80">
                  Thay voice
                </button>
              </div>
            </div>

            {/* Notes Card (5 cols) */}
            <div className="col-span-5 rounded-xl border border-border bg-card p-4 flex flex-col justify-between gap-2">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-foreground">Ghi chú</h4>
                <span className="text-[10px] text-muted-foreground">158/500</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed rounded-lg bg-secondary/50 p-2.5 border border-border flex-1">
                Sử dụng bộ reference này cho tất cả các cảnh có nhân vật Mai. Đảm bảo giữ nhất quán ngoại hình, trang phục và phong cách. Reference này sẽ được sử dụng cho Seedance khi tạo video.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
