import { Link, useLocation } from "react-router-dom"
import { ROUTES } from "@/shared/constants"

export interface SidebarProps {
  backendStatus?: "ok" | "pending" | "error"
}

interface NavItem {
  to: string
  label: string
  badge?: string | number
  icon: (active: boolean) => React.ReactNode
}

export function Sidebar({ backendStatus = "ok" }: SidebarProps) {
  const location = useLocation()

  const navItems: NavItem[] = [
    {
      to: ROUTES.DASHBOARD,
      label: "Tổng quan",
      icon: (active) => (
        <svg
          className={`size-4.5 ${active ? "text-white" : "text-muted-foreground"}`}
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
      to: ROUTES.PROJECTS,
      label: "Dự án",
      badge: "12",
      icon: (active) => (
        <svg
          className={`size-4.5 ${active ? "text-white" : "text-muted-foreground"}`}
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
      to: ROUTES.EDITOR,
      label: "Chỉnh sửa",
      icon: (active) => (
        <svg
          className={`size-4.5 ${active ? "text-white" : "text-muted-foreground"}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 3h16a1 1 0 011 1v16a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1z"
          />
        </svg>
      ),
    },
    {
      to: ROUTES.VISUAL_BEAT,
      label: "Visual Beat",
      icon: (active) => (
        <svg
          className={`size-4.5 ${active ? "text-white" : "text-muted-foreground"}`}
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
      to: ROUTES.CHARACTERS,
      label: "Nhân vật",
      icon: (active) => (
        <svg
          className={`size-4.5 ${active ? "text-white" : "text-muted-foreground"}`}
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
      to: ROUTES.VOICE,
      label: "Voice",
      icon: (active) => (
        <svg
          className={`size-4.5 ${active ? "text-white" : "text-muted-foreground"}`}
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
      to: ROUTES.ACCOUNTS,
      label: "Account Pool",
      badge: "8",
      icon: (active) => (
        <svg
          className={`size-4.5 ${active ? "text-white" : "text-muted-foreground"}`}
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
      to: ROUTES.JOBS,
      label: "Jobs",
      badge: "3",
      icon: (active) => (
        <svg
          className={`size-4.5 ${active ? "text-white" : "text-muted-foreground"}`}
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
    <aside className="flex h-screen w-60 flex-col border-r border-sidebar-border bg-sidebar p-3 text-sidebar-foreground select-none shrink-0 z-30">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-2 py-3 border-b border-white/[0.06] mb-3">
        <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-400 text-white shadow-lg shadow-blue-500/30 ring-1 ring-white/20">
          <svg className="size-4.5 fill-white" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight text-white leading-tight">VidPool</h1>
          <span className="text-[11px] font-medium text-muted-foreground block">
            Video Production Studio
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto pr-1">
        {navItems.map((item) => {
          const isActive =
            item.to === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.to) ||
                (item.to === ROUTES.JOBS && location.pathname.startsWith("/generations"))
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`group relative flex items-center justify-between rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-150 ${
                isActive
                  ? "bg-gradient-to-r from-blue-600/25 via-blue-500/15 to-transparent text-white border border-blue-500/35 shadow-sm shadow-blue-900/30 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:rounded-r before:bg-blue-500 before:shadow-[0_0_8px_var(--primary)]"
                  : "hover:bg-white/[0.05] hover:text-foreground border border-transparent"
              }`}
            >
              <div className="flex items-center gap-3">
                {item.icon(isActive)}
                <span className={isActive ? "font-semibold text-white" : ""}>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold transition-colors ${
                    isActive
                      ? "bg-blue-500/30 text-blue-300 border border-blue-400/30"
                      : "bg-white/[0.08] text-muted-foreground group-hover:bg-white/[0.14] group-hover:text-white"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom Section: Settings & Backend Status & User profile */}
      <div className="flex flex-col gap-2 border-t border-white/[0.06] pt-3">
        <Link
          to={ROUTES.SETTINGS}
          className={`group relative flex items-center justify-between rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-150 ${
            location.pathname.startsWith(ROUTES.SETTINGS)
              ? "bg-gradient-to-r from-blue-600/25 via-blue-500/15 to-transparent text-white border border-blue-500/35 shadow-sm before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-1 before:rounded-r before:bg-blue-500"
              : "hover:bg-white/[0.05] hover:text-foreground border border-transparent"
          }`}
        >
          <div className="flex items-center gap-3">
            <svg
              className={`size-4.5 ${location.pathname.startsWith(ROUTES.SETTINGS) ? "text-blue-400" : "text-muted-foreground group-hover:text-white"}`}
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
            <span className={location.pathname.startsWith(ROUTES.SETTINGS) ? "font-semibold text-white" : ""}>Cài đặt</span>
          </div>
        </Link>

        {/* Backend Status indicator */}
        <div className="flex items-center justify-between rounded-lg bg-white/[0.03] px-2.5 py-1.5 text-[11px] border border-white/[0.04]">
          <div className="flex items-center">
            {backendStatus === "ok" ? (
              <>
                <span className="relative flex size-2 mr-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
                </span>
                <span className="text-emerald-400 font-medium">Backend connected</span>
              </>
            ) : backendStatus === "pending" ? (
              <>
                <span className="size-2 rounded-full bg-amber-400 animate-pulse mr-2" />
                <span className="text-amber-400">Connecting…</span>
              </>
            ) : (
              <>
                <span className="size-2 rounded-full bg-rose-500 mr-2" />
                <span className="text-rose-400">Disconnected</span>
              </>
            )}
          </div>
          <span className="font-mono text-[10px] text-studio-subtle">v0.2.0</span>
        </div>

        {/* User profile card */}
        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card p-2.5 transition-all hover:bg-studio-hover">
          <div className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 ring-2 ring-indigo-500/30">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
              alt="Avatar"
              className="size-full object-cover"
              onError={(e) => {
                ;(e.currentTarget as HTMLElement).style.display = "none"
              }}
            />
            <span className="text-xs font-bold text-white uppercase absolute">TX</span>
          </div>
          <div className="flex flex-col overflow-hidden leading-tight min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-xs font-semibold text-foreground">
                Thanh Xuân Trở Lại
              </span>
              <span className="rounded bg-blue-600 px-1 py-0.2 text-[9px] font-bold text-white">
                Pro
              </span>
            </div>
            <span className="truncate text-[10.5px] text-studio-subtle">user@vidpool.ai</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
