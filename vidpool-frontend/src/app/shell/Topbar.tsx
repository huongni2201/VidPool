import { useNavigationStore } from "@/app/store/navigation-store"

interface TopbarProps {
  onPrimaryAction?: () => void
}

export function Topbar({ onPrimaryAction }: TopbarProps) {
  const { activeScreen, projectName, savedTime, setScreen } = useNavigationStore()

  const getPrimaryButton = () => {
    switch (activeScreen) {
      case "overview":
      case "projects":
        return {
          label: "+ Dự án mới",
          action: () => setScreen("projects"),
        }
      case "editor":
        return {
          label: "Xuất video",
          icon: (
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          ),
          action: () => onPrimaryAction?.(),
        }
      case "visual-beat":
        return {
          label: "Tạo video",
          icon: (
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          action: () => setScreen("editor"),
        }
      case "characters":
        return {
          label: "+ Nhân vật mới",
          action: () => onPrimaryAction?.(),
        }
      case "voice":
        return {
          label: "Xuất video",
          action: () => setScreen("editor"),
        }
      case "accounts":
        return {
          label: "+ Thêm account",
          action: () => onPrimaryAction?.(),
        }
      case "jobs":
        return {
          label: "+ Thêm account",
          action: () => setScreen("accounts"),
        }
      case "settings":
        return {
          label: "Lưu thiết lập",
          action: () => onPrimaryAction?.(),
        }
      default:
        return {
          label: "+ Dự án mới",
          action: () => setScreen("projects"),
        }
    }
  }

  const primary = getPrimaryButton()

  return (
    <header className="flex h-14 w-full items-center justify-between border-b border-border bg-sidebar/80 px-6 backdrop-blur-md select-none sticky top-0 z-20">
      {/* Left Project Info */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-white/[0.06] text-muted-foreground">
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-foreground">{projectName}</span>
          <button className="text-studio-subtle hover:text-muted-foreground p-0.5 transition-colors" title="Đổi tên dự án">
            <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <svg className="size-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 00-9.78 2.096A4.001 4.001 0 003 15z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13l2 2 4-4" />
          </svg>
          <span>Đã lưu lúc {savedTime}</span>
        </div>
      </div>

      {/* Right Top Actions */}
      <div className="flex items-center gap-2">
        <button
          className="flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:border-studio-border-hover hover:bg-studio-hover hover:text-foreground transition-all"
          title="Thu nhỏ/Toàn màn hình"
        >
          <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
        <button
          className="flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:border-studio-border-hover hover:bg-studio-hover hover:text-foreground transition-all"
          title="Tùy chọn hiển thị"
        >
          <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
        </button>
        <button
          className="flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:border-studio-border-hover hover:bg-studio-hover hover:text-foreground transition-all"
          title="Tùy chọn thêm"
        >
          <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
          </svg>
        </button>

        {/* Primary Action Button */}
        <button
          onClick={primary.action}
          className="ml-2 flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-blue-500/25 hover:from-blue-500 hover:to-blue-400 active:scale-[0.98] transition-all"
        >
          {primary.icon}
          <span>{primary.label}</span>
        </button>
      </div>
    </header>
  )
}
