import { useNavigate } from "react-router-dom"
import { useNavigationStore } from "@/app/store/navigation-store"
import { ROUTES } from "@/shared/constants"
import { StatCard } from "@/components/shared/StatCard"
import { StatusBadge } from "@/components/shared/StatusBadge"

export function DashboardPage() {
  const navigate = useNavigate()
  const { setScreen } = useNavigationStore()

  const handleNavigate = (route: string, screenId: any) => {
    setScreen(screenId)
    navigate(route)
  }

  const recentProjects = [
    {
      id: "p1",
      name: "Thanh Xuân Trở Lại",
      meta: "12 video • Cập nhật 2 giờ trước",
      status: "Đang chỉnh sửa",
      cover: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    },
    {
      id: "p2",
      name: "Những Ngày Bình Yên",
      meta: "8 video • Cập nhật 1 ngày trước",
      status: "Đã hoàn thành",
      cover: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
    },
    {
      id: "p3",
      name: "Đường Về Nhà",
      meta: "6 video • Cập nhật 2 ngày trước",
      status: "Đang xử lý",
      cover: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    },
    {
      id: "p4",
      name: "Thành Phố Lên Đèn",
      meta: "10 video • Cập nhật 3 ngày trước",
      status: "Tạm dừng",
      cover: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80",
    },
    {
      id: "p5",
      name: "Một Ngày Khác",
      meta: "4 video • Cập nhật 5 ngày trước",
      status: "Đã hoàn thành",
      cover: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80",
    },
  ]

  const characters = [
    {
      name: "Mai",
      role: "Nữ • Trẻ trung",
      count: "12 video",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
    },
    {
      name: "Linh",
      role: "Nữ • Hiện đại",
      count: "8 video",
      avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80",
    },
    {
      name: "Minh",
      role: "Nam • Trầm",
      count: "6 video",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
    },
    {
      name: "Bạch Thanh Hạ",
      role: "Custom Clone",
      count: "4 video",
      avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=120&auto=format&fit=crop&q=80",
    },
  ]

  const recentJobs = [
    {
      id: "j1",
      title: "Tạo video từ kịch bản",
      project: "Thanh Xuân Trở Lại",
      percent: 78,
      time: "2 phút trước",
      status: "Đang chạy",
      thumb: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80",
    },
    {
      id: "j2",
      title: "Phân tích Visual Beat",
      project: "Đường Về Nhà",
      percent: 100,
      time: "12 phút trước",
      status: "Hoàn thành",
      thumb: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=80",
    },
    {
      id: "j3",
      title: "Tạo phụ đề (TTS)",
      project: "Một Ngày Khác",
      percent: 45,
      time: "28 phút trước",
      status: "Đang xử lý",
      thumb: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=80&auto=format&fit=crop&q=80",
    },
  ]

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[1600px] mx-auto select-none">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <span className="sr-only">Chào mừng bạn đến với VidPool</span>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Tổng quan</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Chào mừng bạn trở lại! Đây là tổng quan dự án và hoạt động studio của VidPool.
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs font-semibold text-muted-foreground">Thứ 3, 15 thg 4, 2025</div>
          <div className="text-[11px] text-blue-400/90 mt-0.5">
            Sáng tạo hôm nay, nội dung lớn hơn ngày mai!
          </div>
        </div>
      </div>

      {/* 5 Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <StatCard
          title="Dự án của tôi"
          value="12"
          trend={{ direction: "up", text: "3" }}
          subtext="So với tuần trước"
          icon={
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          }
        />
        <StatCard
          title="Video đã tạo"
          value="48"
          trend={{ direction: "up", text: "12" }}
          subtext="Tổng tất cả dự án"
          icon={
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          title="Thời gian xử lý"
          value="2.6 giờ"
          trend={{ direction: "down", text: "32%" }}
          subtext="So với tuần trước"
          icon={
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          title="Dung lượng lưu trữ"
          value="12.6 GB"
          progress={{ current: 12.6, max: 50, percent: 25 }}
          icon={
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
          }
        />
        <StatCard
          title="Jobs đang chạy"
          value="3"
          subtext="/ 8 tổng jobs"
          icon={
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
          iconBg="bg-purple-600/15 text-purple-400 border border-purple-500/20"
        />
      </div>

      {/* Main 3-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Column 1: Recent Projects & Account Pool (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          {/* Recent Projects */}
          <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Dự Án Gần Đây</h3>
              <button
                onClick={() => handleNavigate(ROUTES.PROJECTS, "projects")}
                className="text-[11.5px] font-medium text-blue-400 hover:text-blue-300 transition-colors"
              >
                Xem tất cả →
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {recentProjects.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleNavigate(ROUTES.EDITOR, "editor")}
                  className="group flex items-center justify-between rounded-lg p-2 hover:bg-white/[0.04] transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={p.cover}
                      alt={p.name}
                      className="size-10 rounded-md object-cover border border-border"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="truncate text-xs font-semibold text-foreground group-hover:text-blue-400 transition-colors">
                        {p.name}
                      </span>
                      <span className="truncate text-[11px] text-studio-subtle">{p.meta}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={p.status} size="sm" />
                    <button className="text-studio-subtle hover:text-foreground p-1">
                      <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Account Pool Mini Summary */}
          <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Account Pool</h3>
              <button
                onClick={() => setScreen("accounts")}
                className="text-[11.5px] font-medium text-blue-400 hover:text-blue-300 transition-colors"
              >
                Xem chi tiết →
              </button>
            </div>

            <div className="flex items-center gap-5 mt-1">
              {/* Donut Chart representation */}
              <div className="relative flex size-24 shrink-0 items-center justify-center">
                <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-emerald-500"
                    strokeWidth="4"
                    strokeDasharray="60, 100"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-blue-500"
                    strokeWidth="4"
                    strokeDasharray="20, 100"
                    strokeDashoffset="-60"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-amber-500"
                    strokeWidth="4"
                    strokeDasharray="20, 100"
                    strokeDashoffset="-80"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-foreground">5</span>
                  <span className="text-[9px] text-studio-subtle">Tổng account</span>
                </div>
              </div>

              {/* Breakdown Legend */}
              <div className="flex flex-1 flex-col gap-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-emerald-400" />
                    <span className="text-muted-foreground">Đang hoạt động</span>
                  </div>
                  <span className="font-semibold text-foreground">3</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-blue-400" />
                    <span className="text-muted-foreground">Sẵn sàng</span>
                  </div>
                  <span className="font-semibold text-foreground">1</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-amber-400" />
                    <span className="text-muted-foreground">Cần chú ý</span>
                  </div>
                  <span className="font-semibold text-foreground">1</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-rose-400" />
                    <span className="text-muted-foreground">Đã hết stamina</span>
                  </div>
                  <span className="font-semibold text-foreground">0</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: Characters & Voice Library (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          {/* Character Pack */}
          <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Nhân vật (Character Pack)</h3>
              <button
                onClick={() => setScreen("characters")}
                className="text-[11.5px] font-medium text-blue-400 hover:text-blue-300 transition-colors"
              >
                Xem tất cả →
              </button>
            </div>

            {/* 4 Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {characters.map((c) => (
                <div
                  key={c.name}
                  onClick={() => setScreen("characters")}
                  className="group flex flex-col items-center rounded-lg border border-white/[0.06] bg-white/[0.02] p-2 text-center hover:border-white/[0.14] hover:bg-white/[0.05] transition-all cursor-pointer"
                >
                  <img
                    src={c.avatar}
                    alt={c.name}
                    className="size-16 rounded-lg object-cover border border-border shadow-sm"
                  />
                  <span className="mt-2 text-xs font-semibold text-foreground group-hover:text-blue-400 transition-colors">
                    {c.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{c.role}</span>
                  <span className="mt-1 rounded bg-white/[0.06] px-1.5 py-0.5 text-[9.5px] text-studio-subtle">
                    {c.count}
                  </span>
                </div>
              ))}
            </div>

            {/* Quick Stat Chips */}
            <div className="grid grid-cols-3 gap-2 mt-1">
              <div className="flex items-center gap-2 rounded-lg bg-white/[0.03] p-2 border border-white/[0.05]">
                <div className="flex size-7 items-center justify-center rounded-md bg-indigo-500/15 text-indigo-400 text-xs font-bold">
                  8
                </div>
                <div className="text-[10.5px] leading-tight text-muted-foreground">Nhân vật đã tạo</div>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-white/[0.03] p-2 border border-white/[0.05]">
                <div className="flex size-7 items-center justify-center rounded-md bg-blue-500/15 text-blue-400 text-xs font-bold">
                  3
                </div>
                <div className="text-[10.5px] leading-tight text-muted-foreground">Custom Clone</div>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-white/[0.03] p-2 border border-white/[0.05]">
                <div className="flex size-7 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-400 text-xs font-bold">
                  12
                </div>
                <div className="text-[10.5px] leading-tight text-muted-foreground">Đang sử dụng</div>
              </div>
            </div>
          </div>

          {/* Voice Library Breakdown */}
          <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Thư viện Voice</h3>
              <button
                onClick={() => setScreen("voice")}
                className="text-[11.5px] font-medium text-blue-400 hover:text-blue-300 transition-colors"
              >
                Xem tất cả →
              </button>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center justify-center rounded-xl bg-blue-600/15 border border-blue-500/20 p-3 text-blue-400">
                <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                <span className="mt-1 text-base font-bold text-foreground">12</span>
                <span className="text-[9.5px] text-muted-foreground">Giọng đọc</span>
              </div>

              <div className="flex flex-1 flex-col gap-2 text-xs">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-muted-foreground">Tiếng Việt</span>
                    <span className="font-semibold text-foreground">6</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full bg-blue-500" style={{ width: "50%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-muted-foreground">English</span>
                    <span className="font-semibold text-foreground">3</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full bg-indigo-500" style={{ width: "25%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-muted-foreground">Nhật Bản</span>
                    <span className="font-semibold text-foreground">2</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full bg-purple-500" style={{ width: "16%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-muted-foreground">Custom</span>
                    <span className="font-semibold text-foreground">1</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: "9%" }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Column 3: Creation Banner & Recent Jobs (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          {/* Studio Creation Hero Banner */}
          <div className="relative overflow-hidden rounded-xl border border-blue-500/30 bg-card p-5 shadow-lg shadow-black/20">
            <div className="relative z-10 flex flex-col gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                Bắt đầu biên tập
              </span>
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
                  <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 3h16a1 1 0 011 1v16a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-foreground">Chỉnh sửa video ngay</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Cắt ghép, đồng bộ timeline, render video hoàn chỉnh với hiệu suất cao và chuẩn xác.
              </p>
              <button
                onClick={() => handleNavigate(ROUTES.EDITOR, "editor")}
                className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-600/20 transition-all"
              >
                <span>Mở trình chỉnh sửa</span>
                <span>→</span>
              </button>
            </div>
          </div>

          {/* Recent Jobs */}
          <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">Jobs gần đây</h3>
                <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-blue-400 border border-blue-500/20">
                  Generation Queue
                </span>
              </div>
              <button
                onClick={() => handleNavigate(ROUTES.JOBS, "jobs")}
                className="text-[11.5px] font-medium text-blue-400 hover:text-blue-300 transition-colors"
              >
                Xem tất cả →
              </button>
            </div>

            <div className="flex flex-col gap-2.5">
              {recentJobs.map((j) => (
                <div
                  key={j.id}
                  onClick={() => setScreen("jobs")}
                  className="flex flex-col gap-1.5 rounded-lg border border-border/50 bg-secondary/30 p-2.5 hover:border-border hover:bg-secondary/60 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={j.thumb}
                        alt={j.title}
                        className="size-7 rounded object-cover border border-border"
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="truncate text-xs font-semibold text-foreground">{j.title}</span>
                        <span className="truncate text-[10px] text-muted-foreground">{j.project}</span>
                      </div>
                    </div>
                    <StatusBadge status={j.status} size="sm" />
                  </div>

                  <div className="flex items-center gap-3 mt-1">
                    <div className="h-1.5 flex-1 rounded-full bg-secondary overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          j.percent === 100 ? "bg-emerald-500" : "bg-blue-500"
                        }`}
                        style={{ width: `${j.percent}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-foreground">{j.percent}%</span>
                    <span className="text-[9.5px] text-muted-foreground">{j.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
