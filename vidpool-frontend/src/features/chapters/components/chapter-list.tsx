import type { Chapter } from "../model/types"
import { ChapterListItem } from "./chapter-list-item"

interface ChapterListProps {
  chapters: Chapter[]
  totalCount: number
  selectedId: string
  onSelect: (id: string) => void
  onAdd: () => void
  searchQuery: string
  onSearchChange: (q: string) => void
}

export function ChapterList({
  chapters,
  totalCount,
  selectedId,
  onSelect,
  onAdd,
  searchQuery,
  onSearchChange,
}: ChapterListProps) {
  return (
    <div className="flex h-full w-80 shrink-0 flex-col rounded-2xl border border-border bg-card/40 backdrop-blur-sm overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-border/80 p-4">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-foreground">Chapter</span>
          <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {totalCount}
          </span>
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors"
        >
          <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          <span>Thêm</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="p-3 border-b border-border/50">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm kiếm chapter..."
            className="h-9 w-full rounded-xl border border-border bg-card/60 pl-8.5 pr-8 text-xs text-foreground placeholder-muted-foreground transition-all focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <svg
            className="absolute left-2.5 top-2.5 size-4 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Chapter Cards List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
        {chapters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
            <svg className="size-8 mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-xs">Không tìm thấy chapter nào</p>
          </div>
        ) : (
          chapters.map((chapter) => (
            <ChapterListItem
              key={chapter.id}
              chapter={chapter}
              isSelected={chapter.id === selectedId}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </div>
  )
}
