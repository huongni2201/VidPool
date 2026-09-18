import type { ReactNode } from "react"

export interface StatCardProps {
  title: string
  value: string | number
  subtext?: string
  trend?: {
    direction?: "up" | "down"
    icon?: "up" | "down"
    tone?: "success" | "danger" | "neutral"
    sentiment?: "positive" | "negative" | "neutral"
    text: string
  }
  progress?: {
    current: number
    max: number
    percent: number
  }
  icon?: ReactNode
  iconBg?: string
  badge?: string
}

export function StatCard({
  title,
  value,
  subtext,
  trend,
  progress,
  icon,
  iconBg = "bg-blue-600/15 text-blue-400 border border-blue-500/20",
  badge,
}: StatCardProps) {
  const trendTone = trend
    ? trend.tone ||
      (trend.sentiment === "positive"
        ? "success"
        : trend.sentiment === "negative"
          ? "danger"
          : trend.sentiment === "neutral"
            ? "neutral"
            : (trend.direction || trend.icon) === "up"
              ? "success"
              : "danger")
    : undefined

  const trendColor =
    trendTone === "success"
      ? "text-emerald-400"
      : trendTone === "danger"
        ? "text-rose-400"
        : "text-muted-foreground"

  const trendIcon =
    (trend?.icon || trend?.direction) === "up"
      ? "↑"
      : (trend?.icon || trend?.direction) === "down"
        ? "↓"
        : ""

  return (
    <div className="relative flex flex-col justify-between rounded-xl border border-border bg-card p-4 transition-all hover:border-studio-border-hover hover:bg-studio-hover">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-[12px] font-medium text-muted-foreground">{title}</span>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">{value}</span>
            {trend && (
              <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${trendColor}`}>
                {trendIcon && <span>{trendIcon}</span>} {trend.text}
              </span>
            )}
            {badge && (
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-400 border border-emerald-500/20">
                {badge}
              </span>
            )}
          </div>
        </div>
        {icon && (
          <div className={`flex size-10 items-center justify-center rounded-lg ${iconBg}`}>
            {icon}
          </div>
        )}
      </div>

      {progress && (
        <div className="mt-3 flex flex-col gap-1.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all"
              style={{ width: `${Math.min(100, Math.max(0, progress.percent))}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-studio-subtle">
            <span>{progress.current} GB / {progress.max} GB</span>
            <span>{progress.percent}%</span>
          </div>
        </div>
      )}

      {subtext && !progress && (
        <div className="mt-2 text-[11.5px] text-studio-subtle">{subtext}</div>
      )}
    </div>
  )
}
