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
      <div className="flex flex-col gap-1 rounded-xl border border-border bg-card/80 p-3.5">
        <span className="text-[11.5px] font-medium text-muted-foreground">Tổng account</span>
        <div className="flex items-baseline justify-between">
          <span data-testid="metric-total" className="text-2xl font-bold text-foreground font-mono">
            {totalCount}
          </span>
          <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">
            Tổng số
          </span>
        </div>
      </div>

      {/* Metric 2: Active */}
      <div className="flex flex-col gap-1 rounded-xl border border-emerald-500/20 bg-card/80 p-3.5">
        <span className="text-[11.5px] font-medium text-emerald-400">Sẵn sàng (Active)</span>
        <div className="flex items-baseline justify-between">
          <span data-testid="metric-active" className="text-2xl font-bold text-foreground font-mono">
            {activeCount}
          </span>
          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
            Ready
          </span>
        </div>
      </div>

      {/* Metric 3: Auth Required */}
      <div className="flex flex-col gap-1 rounded-xl border border-amber-500/20 bg-card/80 p-3.5">
        <span className="text-[11.5px] font-medium text-amber-400">Cần đăng nhập</span>
        <div className="flex items-baseline justify-between">
          <span data-testid="metric-auth-required" className="text-2xl font-bold text-foreground font-mono">
            {authRequiredCount}
          </span>
          <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
            Auth Needed
          </span>
        </div>
      </div>

      {/* Metric 4: Cooldown */}
      <div className="flex flex-col gap-1 rounded-xl border border-border bg-card/80 p-3.5">
        <span className="text-[11.5px] font-medium text-muted-foreground">Đang Cooldown</span>
        <div className="flex items-baseline justify-between">
          <span data-testid="metric-cooldown" className="text-2xl font-bold text-foreground font-mono">
            {cooldownCount}
          </span>
          <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
            Tạm dừng
          </span>
        </div>
      </div>

      {/* Metric 5: Disabled */}
      <div className="flex flex-col gap-1 rounded-xl border border-border bg-card/80 p-3.5 col-span-2 sm:col-span-1">
        <span className="text-[11.5px] font-medium text-muted-foreground">Đã vô hiệu hóa</span>
        <div className="flex items-baseline justify-between">
          <span data-testid="metric-disabled" className="text-2xl font-bold text-foreground font-mono">
            {disabledCount}
          </span>
          <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
            Disabled
          </span>
        </div>
      </div>
    </div>
  )
}
