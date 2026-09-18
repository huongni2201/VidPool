import { useRef, useMemo } from "react"
import type { Chapter } from "../model/types"

interface ChapterEditorFormProps {
  chapter: Chapter
  onUpdate: (updates: Partial<Omit<Chapter, "id" | "projectId">>) => void
}

export function ChapterEditorForm({ chapter, onUpdate }: ChapterEditorFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Estimated reading time: ~260 words per minute for audio narration
  const estimatedDuration = useMemo(() => {
    const words = chapter.stats.wordCount
    if (words === 0) return "~0 giây"
    const totalSeconds = Math.round((words / 260) * 60)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    if (minutes === 0) return `~${seconds} giây`
    return `~${minutes} phút ${seconds > 0 ? `${seconds} giây` : ""}`
  }, [chapter.stats.wordCount])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      if (content) {
        onUpdate({ sourceText: content })
      }
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  const handleNormalizeText = () => {
    if (!chapter.sourceText) return
    const cleaned = chapter.sourceText
      .replace(/\r\n/g, "\n")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
    onUpdate({ sourceText: cleaned })
  }

  const handleSplitParagraphs = () => {
    if (!chapter.sourceText) return
    // Ensure standard paragraph double-line spacing
    const paragraphs = chapter.sourceText
      .split(/\n+/)
      .map((p) => p.trim())
      .filter(Boolean)
      .join("\n\n")
    onUpdate({ sourceText: paragraphs })
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card/60 p-5 shadow-sm">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Row 1: Tiêu đề Chapter */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-foreground">
          Tiêu đề chapter
        </label>
        <input
          type="text"
          value={chapter.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Nhập tiêu đề chapter..."
          className="h-10 w-full rounded-xl border border-border bg-card/80 px-3.5 text-sm text-foreground placeholder-muted-foreground transition-all focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Row 2: Tóm tắt ngắn */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-foreground">
          Tóm tắt ngắn
        </label>
        <textarea
          rows={2}
          value={chapter.summary}
          onChange={(e) => onUpdate({ summary: e.target.value })}
          placeholder="Nhập tóm tắt cốt truyện ngắn..."
          className="w-full rounded-xl border border-border bg-card/80 p-3 text-xs leading-relaxed text-foreground placeholder-muted-foreground transition-all focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* Row 3: Nội dung cốt truyện */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-foreground">
            Nội dung cốt truyện
          </label>
          <span className="text-[11.5px] font-medium text-muted-foreground">
            {chapter.stats.wordCount.toLocaleString("vi-VN")} / 5.000 từ
          </span>
        </div>

        <textarea
          rows={10}
          value={chapter.sourceText}
          onChange={(e) => onUpdate({ sourceText: e.target.value })}
          placeholder="Nhập hoặc dán toàn bộ nội dung cốt truyện của chapter vào đây..."
          className="w-full rounded-xl border border-border bg-card/80 p-3.5 text-xs leading-relaxed text-foreground placeholder-muted-foreground transition-all focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans custom-scrollbar"
        />
      </div>

      {/* Row 4: Quick Tools Toolbar */}
      <div className="flex items-center justify-between pt-1 border-t border-border/50 text-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-card/80 hover:text-foreground hover:border-border transition-colors cursor-pointer"
          >
            <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>Nhập từ file</span>
          </button>

          <button
            type="button"
            onClick={handleNormalizeText}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-card/80 hover:text-foreground hover:border-border transition-colors cursor-pointer"
          >
            <svg className="size-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>Chuẩn hoá văn bản</span>
          </button>

          <button
            type="button"
            onClick={handleSplitParagraphs}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-card/80 hover:text-foreground hover:border-border transition-colors cursor-pointer"
          >
            <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879a3 3 0 11-4.242-4.242L10.657 10.5M5 19a2 2 0 100-4 2 2 0 000 4z" />
            </svg>
            <span>Tách đoạn tự động</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
          <svg className="size-3.5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Thời lượng ước tính: {estimatedDuration}</span>
        </div>
      </div>
    </div>
  )
}
