import type React from "react"

export type StatusBadgeTone = "success" | "info" | "warning" | "danger" | "neutral"

export interface StatusBadgeProps {
  status?: string
  tone?: StatusBadgeTone
  children?: React.ReactNode
  className?: string
  size?: "sm" | "md"
}

export function StatusBadge({
  status,
  tone,
  children,
  className = "",
  size = "md",
}: StatusBadgeProps) {
  const label = children || status || ""

  let effectiveTone: StatusBadgeTone = tone || "neutral"
  if (!tone && status) {
    switch (status) {
      case "Đang hoạt động":
      case "Sẵn sàng":
      case "Đã hoàn thành":
      case "Hoàn thành":
        effectiveTone = "success"
        break
      case "Đang xử lý":
      case "Đang tạo":
      case "Đang chạy":
      case "Đang chỉnh sửa":
        effectiveTone = "info"
        break
      case "Chờ tạo":
      case "Đang chờ":
      case "Tạm dừng":
      case "Cần chú ý":
      case "Cần đăng nhập":
      case "Cần xác thực lại":
        effectiveTone = "warning"
        break
      case "Có lỗi":
      case "Thất bại":
      case "Hết quota":
        effectiveTone = "danger"
        break
      case "Đã tắt":
      default:
        effectiveTone = "neutral"
        break
    }
  }

  let style = "bg-white/[0.06] text-muted-foreground border-border"
  let dotColor = "bg-muted-foreground"

  switch (effectiveTone) {
    case "success":
      style = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
      dotColor = "bg-emerald-400"
      break
    case "info":
      style = "bg-blue-500/15 text-blue-400 border-blue-500/25"
      dotColor = "bg-blue-400"
      break
    case "warning":
      style = "bg-amber-500/15 text-amber-300 border-amber-500/25"
      dotColor = "bg-amber-400"
      break
    case "danger":
      style = "bg-rose-500/15 text-rose-300 border-rose-500/25"
      dotColor = "bg-rose-400"
      break
    case "neutral":
      style = "bg-white/[0.05] text-studio-subtle border-border"
      dotColor = "bg-studio-subtle"
      break
  }

  const sizeClass =
    size === "sm"
      ? "px-2 py-0.5 text-[10.5px] gap-1.5"
      : "px-2.5 py-1 text-[11.5px] gap-2"

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium whitespace-nowrap ${sizeClass} ${style} ${className}`}
    >
      <span className={`size-1.5 rounded-full ${dotColor}`} />
      <span>{label}</span>
    </span>
  )
}
