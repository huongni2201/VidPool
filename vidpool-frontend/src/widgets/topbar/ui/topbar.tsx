import { useLocation, useNavigate } from "react-router-dom"
import { ROUTES } from "@/shared/constants"
import { useProjectStore } from "@/entities/project"

export interface TopbarProps {
  onPrimaryAction?: () => void
  projectName?: string
  savedTime?: string
}

export function Topbar({
  onPrimaryAction,
  projectName: propProjectName,
  savedTime: propSavedTime,
}: TopbarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const {
    projectName: storeProjectName,
    savedTime: storeSavedTime,
    closeProject,
    setIsCreateOpen,
  } = useProjectStore()

  const activeProjectName = propProjectName || storeProjectName || "Thanh Xuân Trở Lại"
  const activeSavedTime = propSavedTime || storeSavedTime || "15:24"

  const isWorkspace =
    location.pathname.startsWith(ROUTES.EDITOR) ||
    location.pathname.startsWith(ROUTES.CHAPTERS) ||
    location.pathname.startsWith(ROUTES.VISUAL_BEAT) ||
    location.pathname.startsWith(ROUTES.CHARACTERS) ||
    location.pathname.startsWith(ROUTES.VOICE) ||
    location.pathname.startsWith(ROUTES.JOBS) ||
    location.pathname.startsWith("/generations")

  const getPageInfo = () => {
    const path = location.pathname
    if (path.startsWith(ROUTES.ACCOUNTS)) {
      return {
        title: "Tài khoản AI",
        primaryLabel: undefined,
        action: undefined,
      }
    }
    if (path === "/" || path === "/projects" || path.startsWith("/projects")) {
      return {
        title: "Dự án",
        primaryLabel: "+ Dự án mới",
        action: () => {
          setIsCreateOpen(true)
          onPrimaryAction?.()
        },
      }
    }
    if (path.startsWith(ROUTES.EDITOR)) {
      return {
        title: "Chỉnh sửa",
        primaryLabel: "Xuất video",
        icon: (
          <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        ),
        action: () => onPrimaryAction?.(),
      }
    }
    if (path.startsWith(ROUTES.VISUAL_BEAT)) {
      return {
        title: "Visual Beat",
        primaryLabel: "Tạo video",
        icon: (
          <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        action: () => navigate(ROUTES.EDITOR),
      }
    }
    if (path.startsWith(ROUTES.CHARACTERS)) {
      return {
        title: "Nhân vật",
        primaryLabel: "+ Nhân vật mới",
        action: () => onPrimaryAction?.(),
      }
    }
    if (path.startsWith(ROUTES.VOICE)) {
      return {
        title: "Voice",
        primaryLabel: "+ Tạo giọng đọc",
        icon: (
          <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        ),
        action: () => onPrimaryAction?.(),
      }
    }
    if (path.startsWith(ROUTES.JOBS) || path.startsWith(ROUTES.GENERATIONS)) {
      return {
        title: "Jobs",
        primaryLabel: "+ Tạo job mới",
        icon: (
          <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        ),
        action: () => onPrimaryAction?.(),
      }
    }
    if (path.startsWith(ROUTES.SETTINGS)) {
      return {
        title: "Cài đặt",
        primaryLabel: "Lưu thiết lập",
        action: () => onPrimaryAction?.(),
      }
    }
    return {
      title: "Dự án",
      primaryLabel: "+ Dự án mới",
      action: () => {
        setIsCreateOpen(true)
        onPrimaryAction?.()
      },
    }
  }

  const info = getPageInfo()

  return (
    <header className="flex h-14 w-full items-center justify-between border-b border-border bg-sidebar/85 px-6 backdrop-blur-md select-none sticky top-0 z-20">
      {/* Left: CapCut project switcher or Launcher title */}
      {isWorkspace ? (
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              closeProject()
              navigate(ROUTES.PROJECTS)
            }}
            className="group flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:border-primary/50 hover:bg-studio-hover hover:text-foreground transition-all cursor-pointer shadow-sm"
            title="Đóng dự án và quay về danh sách"
          >
            <svg
              className="size-3.5 transition-transform group-hover:-translate-x-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Màn hình dự án</span>
          </button>

          <div className="h-4 w-px bg-border" />

          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </div>
            <span className="text-sm font-semibold text-foreground tracking-tight">
              {activeProjectName}
            </span>
            <span className="rounded bg-secondary px-1.5 py-0.2 text-[10px] font-mono font-semibold text-muted-foreground">
              16:9
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground ml-1">
            <svg className="size-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-[11.5px] text-studio-subtle">Đã lưu lúc {activeSavedTime}</span>
          </div>
        </div>
      ) : location.pathname.startsWith(ROUTES.ACCOUNTS) ? (
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-lg bg-blue-600/15 text-blue-400 border border-blue-500/20">
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <span className="text-sm font-bold text-foreground">Tài Khoản AI</span>
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            • Quản lý kết nối & quota provider
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-lg bg-blue-600/15 text-blue-400 border border-blue-500/20">
            <svg className="size-4 fill-current" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <span className="text-sm font-bold text-foreground">Không Gian Dự Án</span>
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            • Quản lý & khởi tạo dự án AI
          </span>
        </div>
      )}

      {/* Right Top Actions */}
      <div className="flex items-center gap-2.5">
        <button
          className="flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:border-studio-border-hover hover:bg-studio-hover hover:text-foreground transition-all cursor-pointer"
          title="Thu nhỏ/Toàn màn hình"
        >
          <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
        <button
          className="flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:border-studio-border-hover hover:bg-studio-hover hover:text-foreground transition-all cursor-pointer"
          title="Tùy chọn hiển thị"
        >
          <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
        </button>
        <button
          className="flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:border-studio-border-hover hover:bg-studio-hover hover:text-foreground transition-all cursor-pointer"
          title="Tùy chọn thêm"
        >
          <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
          </svg>
        </button>

        {/* Primary Page Action Button */}
        {info.primaryLabel && (
          <button
            onClick={info.action}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/25 hover:from-blue-500 hover:to-indigo-500 active:scale-95 transition-all cursor-pointer"
          >
            {info.icon}
            <span>{info.primaryLabel}</span>
          </button>
        )}
      </div>
    </header>
  )
}
