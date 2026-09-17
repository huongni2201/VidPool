interface StatusBadgeProps {
  status:
    | "Đang hoạt động"
    | "Sẵn sàng"
    | "Đã hoàn thành"
    | "Hoàn thành"
    | "Đang xử lý"
    | "Đang tạo"
    | "Đang chạy"
    | "Đang chỉnh sửa"
    | "Chờ tạo"
    | "Đang chờ"
    | "Tạm dừng"
    | "Có lỗi"
    | "Thất bại"
    | "Cần đăng nhập"
    | "Cần xác thực lại"
    | "Cần chú ý"
    | "Hết quota"
    | "Đã tắt"
    | string
  className?: string
  size?: "sm" | "md"
}

export function StatusBadge({ status, className = "", size = "md" }: StatusBadgeProps) {
  let style = "bg-white/[0.06] text-[#9ca8bc] border-white/[0.08]"
  let dotColor = "bg-[#9ca8bc]"

  switch (status) {
    case "Đang hoạt động":
    case "Sẵn sàng":
    case "Đã hoàn thành":
    case "Hoàn thành":
      style = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
      dotColor = "bg-emerald-400"
      break
    case "Đang xử lý":
    case "Đang tạo":
    case "Đang chạy":
    case "Đang chỉnh sửa":
      style = "bg-blue-500/15 text-blue-400 border-blue-500/25"
      dotColor = "bg-blue-400"
      break
    case "Chờ tạo":
    case "Đang chờ":
    case "Tạm dừng":
    case "Cần chú ý":
      style = "bg-amber-500/15 text-amber-300 border-amber-500/25"
      dotColor = "bg-amber-400"
      break
    case "Cần đăng nhập":
    case "Cần xác thực lại":
      style = "bg-amber-500/15 text-amber-300 border-amber-500/25"
      dotColor = "bg-amber-400"
      break
    case "Có lỗi":
    case "Thất bại":
    case "Hết quota":
      style = "bg-rose-500/15 text-rose-300 border-rose-500/25"
      dotColor = "bg-rose-400"
      break
    case "Đã tắt":
      style = "bg-white/[0.05] text-[#64748b] border-white/[0.08]"
      dotColor = "bg-[#64748b]"
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
      <span>{status}</span>
    </span>
  )
}
