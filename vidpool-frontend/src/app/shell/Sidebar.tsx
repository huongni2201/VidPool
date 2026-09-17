import { useNavigationStore, type ScreenId } from "@/app/store/navigation-store"

interface SidebarProps {
  backendStatus?: "ok" | "pending" | "error"
}

interface NavItem {
  id: ScreenId
  label: string
  badge?: string | number
  icon: (active: boolean) => React.ReactNode
}

export function Sidebar({ backendStatus = "ok" }: SidebarProps) {
  const { activeScreen, setScreen } = useNavigationStore()

  const navItems: NavItem[] = [
    {
      id: "overview",
      label: "Tổng quan",
      icon: (active) => (
        <svg
          className={`size-4.5 ${active ? "text-white" : "text-[#9ca8bc]"}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
    },
    {
      id: "projects",
      label: "Dự án",
      badge: "12",
      icon: (active) => (
        <svg
          className={`size-4.5 ${active ? "text-white" : "text-[#9ca8bc]"}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
          />
        </svg>
      ),
    },
    {
      id: "editor",
      label: "Chỉnh sửa",
      icon: (active) => (
        <svg
          className={`size-4.5 ${active ? "text-white" : "text-[#9ca8bc]"}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879a3 3 0 11-4.242-4.242L10.757 8.5m1.243 3.5l-2.879-2.879a3 3 0 10-4.242 4.242L7.757 16.5"
          />
        </svg>
      ),
    },
    {
      id: "visual-beat",
      label: "Visual Beat",
      icon: (active) => (
        <svg
          className={`size-4.5 ${active ? "text-white" : "text-[#9ca8bc]"}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
          />
        </svg>
      ),
    },
    {
      id: "characters",
      label: "Nhân vật",
      icon: (active) => (
        <svg
          className={`size-4.5 ${active ? "text-white" : "text-[#9ca8bc]"}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      ),
    },
    {
      id: "voice",
      label: "Voice",
      icon: (active) => (
        <svg
          className={`size-4.5 ${active ? "text-white" : "text-[#9ca8bc]"}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
          />
        </svg>
      ),
    },
    {
      id: "accounts",
      label: "Account Pool",
      badge: "8",
      icon: (active) => (
        <svg
          className={`size-4.5 ${active ? "text-white" : "text-[#9ca8bc]"}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
    },
    {
      id: "jobs",
      label: "Jobs",
      badge: "3",
      icon: (active) => (
        <svg
          className={`size-4.5 ${active ? "text-white" : "text-[#9ca8bc]"}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
    },
  ]

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-white/[0.08] bg-[#0c1017] p-3 text-[#9ca8bc] select-none">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-2 py-3 border-b border-white/[0.06] mb-3">
        <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-blue-400 text-white shadow-lg shadow-blue-500/25">
          <svg className="size-5 fill-white" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight text-white leading-tight">VidPool</h1>
          <span className="text-[11px] font-medium text-blue-400/90 block">AI Video Studio</span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto pr-1">
        {navItems.map((item) => {
          const isActive = activeScreen === item.id
          return (
            <button
              key={item.id}
              onClick={() => setScreen(item.id)}
              className={`group flex items-center justify-between rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all ${
                isActive
                  ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md shadow-blue-500/25"
                  : "hover:bg-white/[0.05] hover:text-[#f3f6fc]"
              }`}
            >
              <div className="flex items-center gap-3">
                {item.icon(isActive)}
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-white/[0.08] text-[#9ca8bc] group-hover:bg-white/[0.12] group-hover:text-white"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Bottom Section: Settings & Backend Status & Profile */}
      <div className="flex flex-col gap-2 border-t border-white/[0.06] pt-3">
        {/* Settings button */}
        <button
          onClick={() => setScreen("settings")}
          className={`flex items-center justify-between rounded-lg px-3 py-2 text-[13px] font-medium transition-all ${
            activeScreen === "settings"
              ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md shadow-blue-500/25"
              : "hover:bg-white/[0.05] hover:text-[#f3f6fc]"
          }`}
        >
          <div className="flex items-center gap-3">
            <svg
              className={`size-4.5 ${activeScreen === "settings" ? "text-white" : "text-[#9ca8bc]"}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span>Cài đặt</span>
          </div>
        </button>

        {/* Backend Connection Indicator (Satisfies App.test.tsx) */}
        <div className="flex items-center justify-between rounded-lg bg-white/[0.03] px-2.5 py-1.5 text-[11px] border border-white/[0.05]">
          <div className="flex items-center gap-2">
            <span
              className={`size-2 rounded-full ${
                backendStatus === "ok"
                  ? "bg-emerald-500 shadow-sm shadow-emerald-500/50"
                  : backendStatus === "error"
                  ? "bg-rose-500"
                  : "bg-amber-500 animate-pulse"
              }`}
            />
            <span className="text-[#9ca8bc]">
              {backendStatus === "pending" && "Starting VidPool…"}
              {backendStatus === "error" && "Backend unavailable"}
              {backendStatus === "ok" && "Backend connected"}
            </span>
          </div>
          <span className="text-[10px] text-[#64748b]">v0.2.0</span>
        </div>

        {/* User profile card */}
        <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-[#121824] p-2.5 transition-all hover:bg-[#182132]">
          <div className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-600 text-sm font-bold text-white ring-2 ring-indigo-500/30">
            <span className="text-xs">TX</span>
            <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-blue-600 px-1 py-0.2 text-[8px] font-bold text-white">
              PRO
            </span>
          </div>
          <div className="flex flex-col overflow-hidden leading-tight">
            <span className="truncate text-xs font-semibold text-[#f3f6fc]">
              Thanh Xuân Trở Lại
            </span>
            <span className="truncate text-[10.5px] text-[#64748b]">user@vidpool.ai</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
