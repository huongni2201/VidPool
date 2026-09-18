import type { Chapter } from "../model/types"
import { StatusBadge } from "@/shared/ui"

interface ChapterListItemProps {
  chapter: Chapter
  isSelected: boolean
  onSelect: (id: string) => void
}

export function ChapterListItem({ chapter, isSelected, onSelect }: ChapterListItemProps) {
  const getBadgeProps = () => {
    switch (chapter.status) {
      case "analyzed":
        return { label: "Đã phân tích", tone: "success" as const }
      case "analyzing":
        return { label: "Đang phân tích", tone: "info" as const }
      case "error":
        return { label: "Có lỗi", tone: "danger" as const }
      case "draft":
      default:
        if (chapter.stats.sceneCount === 0 && chapter.stats.visualBeatCount === 0) {
          return { label: "Chưa phân tích", tone: "neutral" as const }
        }
        return { label: "Bản nháp", tone: "warning" as const }
    }
  }

  const badgeProps = getBadgeProps()
  const orderStr = String(chapter.order).padStart(2, "0")

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(chapter.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onSelect(chapter.id)
        }
      }}
      className={`group relative flex flex-col gap-2 rounded-xl border p-3.5 text-left transition-all cursor-pointer select-none ${
        isSelected
          ? "border-blue-500/50 bg-blue-950/20 shadow-sm shadow-blue-500/10 ring-1 ring-blue-500/30"
          : "border-border bg-card/60 hover:border-border hover:bg-card/90"
      }`}
    >
      {/* Title & Status */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-5 items-center justify-center rounded bg-white/[0.06] px-1.5 text-[11px] font-semibold text-muted-foreground group-hover:text-foreground">
            {orderStr}
          </span>
          <span
            className={`truncate text-xs font-semibold ${
              isSelected ? "text-blue-400" : "text-foreground group-hover:text-white"
            }`}
          >
            {chapter.title}
          </span>
        </div>
        <StatusBadge tone={badgeProps.tone} size="sm">
          {badgeProps.label}
        </StatusBadge>
      </div>

      {/* Summary preview */}
      <p className="line-clamp-1 text-[11.5px] leading-relaxed text-muted-foreground">
        {chapter.summary || "Chưa có mô tả tóm tắt..."}
      </p>

      {/* Meta / Stats */}
      <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
        <span>{chapter.stats.sceneCount} cảnh</span>
        <span>•</span>
        <span>{chapter.stats.visualBeatCount} beats</span>
        <span>•</span>
        <span>{chapter.stats.wordCount.toLocaleString("vi-VN")} từ</span>
      </div>
    </div>
  )
}
