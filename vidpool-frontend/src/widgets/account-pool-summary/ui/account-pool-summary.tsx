import type { AccountSummary } from "@/entities/account"

export interface AccountPoolSummaryProps {
  accounts: AccountSummary[]
  variant?: "detailed" | "compact"
  onViewDetails?: () => void
  className?: string
}

export function AccountPoolSummary({
  accounts,
  variant = "detailed",
  onViewDetails,
  className = "",
}: AccountPoolSummaryProps) {
  const totalCount = accounts.length
  const activeCount = accounts.filter((a) => a.status === "active").length
  const authRequiredCount = accounts.filter((a) => a.status === "auth_required").length
  const cooldownCount = accounts.filter((a) => a.status === "cooldown").length
  const disabledCount = accounts.filter((a) => a.status === "disabled").length

  if (variant === "compact") {
    const activePercent = totalCount > 0 ? (activeCount / totalCount) * 100 : 0
    const authPercent = totalCount > 0 ? (authRequiredCount / totalCount) * 100 : 0
    const otherPercent = totalCount > 0 ? ((cooldownCount + disabledCount) / totalCount) * 100 : 0

    return (
      <div className={`rounded-xl border border-border bg-card p-4 flex flex-col gap-3 ${className}`}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Account Pool</h3>
          {onViewDetails && (
            <button
              onClick={onViewDetails}
              className="text-[11.5px] font-medium text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
            >
              Xem chi tiết →
            </button>
          )}
        </div>

        <div className="flex items-center gap-5 mt-1">
          {/* Progress / Donut visualization */}
          <div className="relative flex size-24 shrink-0 items-center justify-center">
            <svg className="size-full -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r="15.9155"
                className="text-white/[0.06]"
                strokeWidth="4"
                stroke="currentColor"
                fill="none"
              />
              {totalCount > 0 && (
                <>
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9155"
                    className="text-emerald-500"
                    strokeWidth="4"
                    strokeDasharray={`${activePercent} ${100 - activePercent}`}
                    strokeDashoffset="0"
                    stroke="currentColor"
                    fill="none"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9155"
                    className="text-amber-500"
                    strokeWidth="4"
                    strokeDasharray={`${authPercent} ${100 - authPercent}`}
                    strokeDashoffset={`${-activePercent}`}
                    stroke="currentColor"
                    fill="none"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9155"
                    className="text-rose-500"
                    strokeWidth="4"
                    strokeDasharray={`${otherPercent} ${100 - otherPercent}`}
                    strokeDashoffset={`${-(activePercent + authPercent)}`}
                    stroke="currentColor"
                    fill="none"
                  />
                </>
              )}
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-foreground font-mono">{totalCount}</span>
              <span className="text-[9px] text-muted-foreground">Tổng account</span>
            </div>
          </div>

          {/* Breakdown Legend */}
          <div className="flex flex-1 flex-col gap-1.5 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-400" />
                <span className="text-muted-foreground">Sẵn sàng (Active)</span>
              </div>
              <span className="font-semibold text-foreground font-mono">{activeCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-amber-400" />
                <span className="text-muted-foreground">Cần đăng nhập</span>
              </div>
              <span className="font-semibold text-foreground font-mono">{authRequiredCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-blue-400" />
                <span className="text-muted-foreground">Đang Cooldown</span>
              </div>
              <span className="font-semibold text-foreground font-mono">{cooldownCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-zinc-400" />
                <span className="text-muted-foreground">Đã tắt</span>
              </div>
              <span className="font-semibold text-foreground font-mono">{disabledCount}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 ${className}`}>
      {/* Metric 1: Total */}
      <div className="group relative flex flex-col justify-between rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm hover:border-blue-500/40 hover:bg-card transition-all duration-200">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground">Tổng tài khoản</span>
          <div className="flex size-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
            <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <span data-testid="metric-total" className="text-2xl sm:text-3xl font-extrabold text-foreground font-mono tracking-tight">
            {totalCount}
          </span>
          <span className="rounded-full bg-blue-500/15 border border-blue-500/20 px-2 py-0.5 text-[10.5px] font-semibold text-blue-400">
            Tổng pool
          </span>
        </div>
      </div>

      {/* Metric 2: Active */}
      <div className="group relative flex flex-col justify-between rounded-2xl border border-emerald-500/25 bg-gradient-to-b from-emerald-500/[0.06] via-card/80 to-card/80 p-4 shadow-sm hover:border-emerald-500/50 hover:shadow-emerald-500/10 transition-all duration-200">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-emerald-400">Sẵn sàng (Active)</span>
          <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
            <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <span data-testid="metric-active" className="text-2xl sm:text-3xl font-extrabold text-foreground font-mono tracking-tight">
            {activeCount}
          </span>
          <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-400 flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Ready
          </span>
        </div>
      </div>

      {/* Metric 3: Auth Required */}
      <div className="group relative flex flex-col justify-between rounded-2xl border border-amber-500/25 bg-gradient-to-b from-amber-500/[0.06] via-card/80 to-card/80 p-4 shadow-sm hover:border-amber-500/50 hover:shadow-amber-500/10 transition-all duration-200">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-amber-400">Cần đăng nhập</span>
          <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
            <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <span data-testid="metric-auth-required" className="text-2xl sm:text-3xl font-extrabold text-foreground font-mono tracking-tight">
            {authRequiredCount}
          </span>
          <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10.5px] font-semibold text-amber-400">
            Auth Needed
          </span>
        </div>
      </div>

      {/* Metric 4: Cooldown */}
      <div className="group relative flex flex-col justify-between rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm hover:border-blue-500/30 hover:bg-card transition-all duration-200">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground">Đang Cooldown</span>
          <div className="flex size-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
            <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <span data-testid="metric-cooldown" className="text-2xl sm:text-3xl font-extrabold text-foreground font-mono tracking-tight">
            {cooldownCount}
          </span>
          <span className="rounded-full bg-secondary border border-border px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground">
            Tạm dừng
          </span>
        </div>
      </div>

      {/* Metric 5: Disabled */}
      <div className="group relative flex flex-col justify-between rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm hover:border-border hover:bg-card transition-all duration-200 col-span-2 sm:col-span-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground">Đã vô hiệu hóa</span>
          <div className="flex size-7 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
            <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <span data-testid="metric-disabled" className="text-2xl sm:text-3xl font-extrabold text-foreground font-mono tracking-tight">
            {disabledCount}
          </span>
          <span className="rounded-full bg-secondary border border-border px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground">
            Disabled
          </span>
        </div>
      </div>
    </div>
  )
}
