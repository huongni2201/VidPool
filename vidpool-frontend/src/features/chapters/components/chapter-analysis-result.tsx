import type { AnalysisResult } from "../model/types"

interface ChapterAnalysisResultProps {
  result: AnalysisResult | null
}

export function ChapterAnalysisResult({ result }: ChapterAnalysisResultProps) {
  if (!result) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card/60 p-4.5 backdrop-blur-sm text-center">
        <span className="text-xs font-semibold text-foreground">Kết quả phân tích</span>
        <p className="text-xs text-muted-foreground py-4">Chưa có dữ liệu phân tích.</p>
      </div>
    )
  }

  const charNames = result.characters.map((c) => c.name).join(", ")
  const locNames = result.locations.map((l) => l.name).join(", ")
  const avgBeats = result.sceneCount > 0 ? (result.visualBeatCount / result.sceneCount).toFixed(1) : "0"

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card/60 p-4.5 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between pb-1 border-b border-border/60">
        <div className="flex items-center gap-2">
          <svg className="size-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
            Kết quả phân tích
          </h3>
        </div>
        {result.completedAt && (
          <span className="text-[11px] text-zinc-500">Lúc {result.completedAt}</span>
        )}
      </div>

      {/* 2x2 Grid of Stat Cards */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Nhân vật */}
        <div className="flex flex-col rounded-xl border border-border/70 bg-card/80 p-3">
          <span className="text-[11px] font-medium text-muted-foreground">Nhân vật</span>
          <span className="text-xl font-bold tracking-tight text-foreground mt-0.5">
            {result.characterCount}
          </span>
          <span className="text-[10.5px] text-zinc-400 truncate mt-1">
            {charNames || "Không phát hiện"}
          </span>
        </div>

        {/* Địa điểm */}
        <div className="flex flex-col rounded-xl border border-border/70 bg-card/80 p-3">
          <span className="text-[11px] font-medium text-muted-foreground">Địa điểm</span>
          <span className="text-xl font-bold tracking-tight text-foreground mt-0.5">
            {result.locationCount}
          </span>
          <span className="text-[10.5px] text-zinc-400 truncate mt-1">
            {locNames || "Không phát hiện"}
          </span>
        </div>

        {/* Cảnh */}
        <div className="flex flex-col rounded-xl border border-border/70 bg-card/80 p-3">
          <span className="text-[11px] font-medium text-muted-foreground">Cảnh</span>
          <span className="text-xl font-bold tracking-tight text-foreground mt-0.5">
            {result.sceneCount}
          </span>
          <span className="text-[10.5px] text-zinc-400 mt-1">Ước tính ~4:30</span>
        </div>

        {/* Visual Beat */}
        <div className="flex flex-col rounded-xl border border-border/70 bg-card/80 p-3">
          <span className="text-[11px] font-medium text-muted-foreground">Visual Beat</span>
          <span className="text-xl font-bold tracking-tight text-foreground mt-0.5">
            {result.visualBeatCount}
          </span>
          <span className="text-[10.5px] text-zinc-400 mt-1">{avgBeats} beats/cảnh</span>
        </div>
      </div>

      {/* Recognized Entities */}
      <div className="flex flex-col gap-2 pt-1 border-t border-border/50 text-xs">
        {/* Nhân vật */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-muted-foreground">
            Nhân vật nhận diện:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {result.characters.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-1 rounded-lg bg-blue-500/10 border border-blue-500/20 px-2 py-1 text-[11px] text-blue-300"
              >
                <span className="font-semibold text-white">{c.name}</span>
                <span className="text-blue-400/80">({c.role})</span>
              </span>
            ))}
          </div>
        </div>

        {/* Địa điểm */}
        <div className="flex flex-col gap-1.5 mt-1">
          <span className="text-[11px] font-medium text-muted-foreground">
            Địa điểm trích xuất:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {result.locations.map((l) => (
              <span
                key={l.id}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 text-[11px] text-emerald-300"
              >
                <span className="font-semibold text-white">📍 {l.name}</span>
                <span className="text-emerald-400/80">({l.description})</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
