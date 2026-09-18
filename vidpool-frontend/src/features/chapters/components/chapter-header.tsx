import { useState } from "react"
import type { Chapter } from "../model/types"
import { StatusBadge } from "@/shared/ui"

export type ChapterTab = "content" | "analysis" | "results"

interface ChapterHeaderProps {
  chapter: Chapter
  activeTab: ChapterTab
  onTabChange: (tab: ChapterTab) => void
  onSave: () => void
  onAnalyze: () => void
  isAnalyzing: boolean
  isSaved: boolean
  onTitleChange: (newTitle: string) => void
}

export function ChapterHeader({
  chapter,
  activeTab,
  onTabChange,
  onSave,
  onAnalyze,
  isAnalyzing,
  isSaved,
  onTitleChange,
}: ChapterHeaderProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editTitleValue, setEditTitleValue] = useState(chapter.title)

  const handleTitleSubmit = () => {
    if (editTitleValue.trim()) {
      onTitleChange(editTitleValue.trim())
    }
    setIsEditingTitle(false)
  }

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

  return (
    <div className="flex flex-col gap-3 pb-4 border-b border-border/80">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Title + Edit Icon + Metadata Badges */}
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="flex items-center gap-2">
            {isEditingTitle ? (
              <input
                type="text"
                autoFocus
                value={editTitleValue}
                onChange={(e) => setEditTitleValue(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTitleSubmit()
                  if (e.key === "Escape") {
                    setEditTitleValue(chapter.title)
                    setIsEditingTitle(false)
                  }
                }}
                className="rounded-lg border border-blue-500 bg-card px-2 py-0.5 text-xl font-bold text-foreground focus:outline-none"
              />
            ) : (
              <div className="flex items-center gap-2 group">
                <h2 className="text-xl font-bold tracking-tight text-foreground truncate">
                  Chapter {String(chapter.order).padStart(2, "0")}: {chapter.title}
                </h2>
                <button
                  onClick={() => {
                    setEditTitleValue(chapter.title)
                    setIsEditingTitle(true)
                  }}
                  className="rounded p-1 text-muted-foreground hover:bg-white/[0.06] hover:text-foreground transition-colors"
                  title="Đổi tên chapter"
                >
                  <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <StatusBadge tone={badgeProps.tone} size="sm">
              {badgeProps.label}
            </StatusBadge>

            <span className="inline-flex items-center gap-1 rounded-md bg-white/[0.04] px-2 py-0.5 text-[11px] text-zinc-300 border border-white/[0.06]">
              <svg className="size-3 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>{chapter.stats.wordCount.toLocaleString("vi-VN")} từ</span>
            </span>

            <span className="inline-flex items-center gap-1 rounded-md bg-white/[0.04] px-2 py-0.5 text-[11px] text-zinc-300 border border-white/[0.06]">
              <svg className="size-3 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>{chapter.stats.sceneCount} cảnh</span>
            </span>

            <span className="inline-flex items-center gap-1 rounded-md bg-white/[0.04] px-2 py-0.5 text-[11px] text-zinc-300 border border-white/[0.06]">
              <svg className="size-3 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>{chapter.stats.visualBeatCount} visual beats</span>
            </span>
          </div>
        </div>

        {/* Center: Tabs */}
        <div className="flex items-center gap-1 rounded-xl border border-border bg-card/60 p-1">
          <button
            onClick={() => onTabChange("content")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "content"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Nội dung
          </button>
          <button
            onClick={() => onTabChange("analysis")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "analysis"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Phân tích
          </button>
          <button
            onClick={() => onTabChange("results")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "results"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Kết quả
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onSave}
            disabled={isSaved}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
              isSaved
                ? "border-border/60 text-muted-foreground/60 cursor-default"
                : "border-border bg-card text-foreground hover:bg-card/80 hover:border-border cursor-pointer"
            }`}
          >
            <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
              />
            </svg>
            <span>{isSaved ? "Đã lưu" : "Lưu nháp"}</span>
          </button>

          <button
            onClick={onAnalyze}
            disabled={isAnalyzing}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-500 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isAnalyzing ? (
              <>
                <svg className="size-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Đang phân tích...</span>
              </>
            ) : (
              <>
                <span>✨</span>
                <span>Phân tích chapter</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
