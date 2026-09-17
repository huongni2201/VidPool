import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ROUTES } from "@/shared/constants"
import { useProjectStore } from "@/entities/project"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { CreateProjectDialog } from "@/features/project-create"
import { demoProjects } from "@/assets/demo"

interface ProjectItem {
  id: string
  title: string
  status: "Đã hoàn thành" | "Đang xử lý" | "Tạm dừng" | "Có lỗi"
  progressText?: string
  progressPercent?: number
  duration: string
  aspectRatio: "16:9" | "9:16" | "1:1"
  scenes: number
  characters: number
  updated: string
  tags: string[]
  cover: string
}

export function ProjectsPage() {
  const navigate = useNavigate()
  const { openProject: storeOpenProject } = useProjectStore()
  const [filter, setFilter] = useState<string>("all")
  const [search, setSearch] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const projects: ProjectItem[] = [
    {
      id: "p1",
      title: "Thanh Xuân Trở Lại",
      status: "Đã hoàn thành",
      duration: "00:02:28",
      aspectRatio: "16:9",
      scenes: 12,
      characters: 3,
      updated: "Cập nhật 2 giờ trước",
      tags: ["Drama", "Thanh xuân", "Cảm xúc"],
      cover: demoProjects[0],
    },
    {
      id: "p2",
      title: "Hồi Ức Mùa Hạ",
      status: "Đang xử lý",
      progressText: "Xuất video...",
      progressPercent: 68,
      duration: "00:03:15",
      aspectRatio: "9:16",
      scenes: 18,
      characters: 2,
      updated: "Cập nhật 1 giờ trước",
      tags: ["Tình cảm", "Mùa hè", "Cinematic"],
      cover: demoProjects[1],
    },
    {
      id: "p3",
      title: "Một Ngày Bình Thường",
      status: "Tạm dừng",
      duration: "00:01:30",
      aspectRatio: "16:9",
      scenes: 10,
      characters: 2,
      updated: "Cập nhật 1 ngày trước",
      tags: ["Đời sống", "Minimal", "Vlog"],
      cover: demoProjects[2],
    },
    {
      id: "p4",
      title: "Những Chú Mèo",
      status: "Đã hoàn thành",
      duration: "00:00:58",
      aspectRatio: "1:1",
      scenes: 6,
      characters: 1,
      updated: "Cập nhật 2 ngày trước",
      tags: ["Động vật", "Đời sống", "Cute"],
      cover: demoProjects[3],
    },
    {
      id: "p5",
      title: "Anime Story #12",
      status: "Đang xử lý",
      progressText: "Tạo cảnh với AI...",
      progressPercent: 33,
      duration: "00:02:06",
      aspectRatio: "16:9",
      scenes: 14,
      characters: 2,
      updated: "Cập nhật 3 giờ trước",
      tags: ["Anime", "Story", "Fantasy"],
      cover: demoProjects[0],
    },
    {
      id: "p6",
      title: "Horror Shorts",
      status: "Có lỗi",
      duration: "00:01:42",
      aspectRatio: "9:16",
      scenes: 8,
      characters: 1,
      updated: "Cập nhật 5 giờ trước",
      tags: ["Horror", "Bí ẩn", "Dark"],
      cover: demoProjects[1],
    },
    {
      id: "p7",
      title: "Thành Phố Lúc Hoàng Hôn",
      status: "Đã hoàn thành",
      duration: "00:03:20",
      aspectRatio: "16:9",
      scenes: 20,
      characters: 3,
      updated: "Cập nhật 1 ngày trước",
      tags: ["Cinematic", "Thành phố", "Tâm trạng"],
      cover: demoProjects[2],
    },
    {
      id: "p8",
      title: "Lofi Chill Mix",
      status: "Tạm dừng",
      duration: "00:01:18",
      aspectRatio: "1:1",
      scenes: 8,
      characters: 1,
      updated: "Cập nhật 2 ngày trước",
      tags: ["Lofi", "Music", "Chill"],
      cover: demoProjects[3],
    },
    {
      id: "p9",
      title: "Dưới Cơn Mưa",
      status: "Đang xử lý",
      progressText: "Phân tích kịch bản...",
      progressPercent: 12,
      duration: "00:02:45",
      aspectRatio: "16:9",
      scenes: 16,
      characters: 2,
      updated: "Cập nhật 4 giờ trước",
      tags: ["Tình cảm", "Mưa", "Tâm trạng"],
      cover: demoProjects[0],
    },
  ]

  const filteredProjects = projects.filter((p) => {
    if (filter === "running" && p.status !== "Đang xử lý") return false
    if (filter === "completed" && p.status !== "Đã hoàn thành") return false
    if (filter === "paused" && p.status !== "Tạm dừng") return false
    if (filter === "error" && p.status !== "Có lỗi") return false
    if (search.trim() && !p.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const openProject = (title: string = "Thanh Xuân Trở Lại") => {
    storeOpenProject(title)
    navigate(ROUTES.EDITOR)
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[1600px] mx-auto select-none">
      {/* Header */}
      <div>
        <span className="sr-only">Quản Lý Dự Án</span>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Dự án</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Quản lý tất cả dự án AI video của bạn. Tạo, chỉnh sửa và theo dõi tiến độ dự án một cách dễ dàng.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 rounded-xl border border-border bg-card p-1">
          <button
            onClick={() => setFilter("all")}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              filter === "all"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>Tất cả</span>
            <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10.5px]">12</span>
          </button>
          <button
            onClick={() => setFilter("running")}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              filter === "running"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="size-1.5 rounded-full bg-blue-400" />
            <span>Đang xử lý</span>
            <span className="text-[10.5px] opacity-80">4</span>
          </button>
          <button
            onClick={() => setFilter("completed")}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              filter === "completed"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="size-1.5 rounded-full bg-emerald-400" />
            <span>Đã hoàn thành</span>
            <span className="text-[10.5px] opacity-80">5</span>
          </button>
          <button
            onClick={() => setFilter("paused")}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              filter === "paused"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="size-1.5 rounded-full bg-amber-400" />
            <span>Tạm dừng</span>
            <span className="text-[10.5px] opacity-80">2</span>
          </button>
          <button
            onClick={() => setFilter("error")}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              filter === "error"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="size-1.5 rounded-full bg-rose-400" />
            <span>Có lỗi</span>
            <span className="text-[10.5px] opacity-80">1</span>
          </button>
        </div>

        {/* Search, Sort, View Switcher */}
        <div className="flex items-center gap-2.5">
          {/* Search box */}
          <div className="relative flex items-center">
            <svg
              className="absolute left-3 size-4 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Tìm kiếm dự án..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-60 rounded-xl border border-border bg-card pl-9 pr-3 text-xs text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>

          {/* Sort dropdown */}
          <select className="h-9 rounded-xl border border-border bg-card px-3 text-xs text-muted-foreground focus:border-primary focus:outline-none cursor-pointer">
            <option>Mới nhất</option>
            <option>Cũ nhất</option>
            <option>Theo tên (A-Z)</option>
            <option>Thời lượng</option>
          </select>

          {/* View toggle */}
          <div className="flex items-center rounded-xl border border-border bg-card p-1">
            <button className="flex size-7 items-center justify-center rounded-lg bg-blue-600 text-white" title="Lưới">
              <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground" title="Danh sách">
              <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          {/* Filter button */}
          <button className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground hover:border-border hover:text-foreground transition-all">
            <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span>Bộ lọc</span>
          </button>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Create New Project Card */}
        <div
          onClick={() => setIsCreateOpen(true)}
          className="group flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card/40 p-6 text-center hover:border-blue-500/50 hover:bg-secondary/50 transition-all cursor-pointer min-h-[300px]"
        >
          <div className="flex size-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform">
            <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <span className="sr-only">+ Tạo dự án mới</span>
          <h3 className="mt-4 text-sm font-bold text-foreground group-hover:text-blue-400 transition-colors">
            Tạo dự án mới
          </h3>
          <p className="mt-1.5 text-xs text-muted-foreground max-w-[200px] leading-relaxed">
            Bắt đầu một dự án AI video mới với sức mạnh của VidPool
          </p>
        </div>

        {/* Project Cards */}
        {filteredProjects.map((p) => (
          <div
            key={p.id}
            className="group flex flex-col justify-between rounded-2xl border border-border bg-card overflow-hidden hover:border-border hover:shadow-xl transition-all"
          >
            {/* Thumbnail Header */}
            <div className="relative aspect-video w-full overflow-hidden bg-black/40">
              <img
                src={p.cover}
                alt={p.title}
                className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
              />

              {/* Status pill top left */}
              <div className="absolute top-2.5 left-2.5">
                <StatusBadge status={p.status} size="sm" />
              </div>

              {/* 3-dots top right */}
              <button className="absolute top-2.5 right-2.5 flex size-7 items-center justify-center rounded-full bg-black/50 backdrop-blur-md text-white/80 hover:text-white transition-colors">
                <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                </svg>
              </button>

              {/* Duration badge bottom right */}
              <span className="absolute bottom-2.5 right-2.5 rounded bg-black/60 px-1.5 py-0.5 text-[10.5px] font-mono font-medium text-white backdrop-blur-sm">
                {p.duration}
              </span>

              {/* Progress bar overlay if running */}
              {p.status === "Đang xử lý" && p.progressPercent && (
                <div className="absolute bottom-0 inset-x-0 bg-black/80 p-2 backdrop-blur-md flex flex-col gap-1">
                  <div className="flex justify-between text-[10px] text-white">
                    <span>{p.progressText}</span>
                    <span>{p.progressPercent}%</span>
                  </div>
                  <div className="h-1 w-full rounded-full bg-white/20 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                      style={{ width: `${p.progressPercent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Content Body */}
            <div className="flex flex-col gap-3 p-4">
              <div>
                <h3 className="text-sm font-bold text-foreground group-hover:text-blue-400 transition-colors">
                  {p.title}
                </h3>
                {/* Metadata Row */}
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <svg className="size-3 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {p.duration}
                  </span>
                  <span className="rounded bg-secondary px-1 py-0.2 font-semibold text-foreground">
                    {p.aspectRatio}
                  </span>
                  <span>{p.scenes} cảnh</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{p.characters} nhân vật</span>
                  <span>{p.updated}</span>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5">
                {p.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md bg-secondary px-2 py-0.5 text-[10.5px] text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="mt-1 flex items-center gap-2 pt-2 border-t border-border">
                <button
                  onClick={() => openProject(p.title)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600/15 py-1.5 text-xs font-semibold text-blue-400 hover:bg-blue-600 hover:text-white transition-all"
                >
                  <svg className="size-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  <span>Mở Studio</span>
                </button>
                <button className="flex size-7 items-center justify-center rounded-lg border border-border bg-secondary/50 text-muted-foreground hover:border-border hover:text-foreground transition-all">
                  <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
        <span>Hiển thị 1–8 trong 12 dự án</span>
        <div className="flex items-center gap-2">
          <button className="flex size-7 items-center justify-center rounded-lg border border-border bg-card hover:bg-secondary">
            &lt;
          </button>
          <button className="flex size-7 items-center justify-center rounded-lg bg-blue-600 text-white font-semibold">
            1
          </button>
          <button className="flex size-7 items-center justify-center rounded-lg border border-border bg-card hover:bg-secondary">
            2
          </button>
          <button className="flex size-7 items-center justify-center rounded-lg border border-border bg-card hover:bg-secondary">
            &gt;
          </button>
          <select className="h-7 rounded-lg border border-border bg-card px-2 text-[11px] text-muted-foreground ml-2">
            <option>8 / trang</option>
            <option>16 / trang</option>
            <option>24 / trang</option>
          </select>
        </div>
      </div>

      {/* Create Project Dialog */}
      <CreateProjectDialog
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={(data) => {
          openProject(data.name)
          setIsCreateOpen(false)
        }}
      />
    </div>
  )
}
