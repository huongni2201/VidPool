import type { AnalysisProgressStep } from "../model/types"

interface ChapterAnalysisProgressProps {
  steps: AnalysisProgressStep[]
  isAnalyzing: boolean
  completedAt?: string
  sceneCount?: number
}

export function ChapterAnalysisProgress({
  steps,
  isAnalyzing,
  completedAt,
  sceneCount = 4,
}: ChapterAnalysisProgressProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card/60 p-4.5 backdrop-blur-sm">
      <div className="flex items-center justify-between pb-1 border-b border-border/60">
        <div className="flex items-center gap-2">
          <svg className="size-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
            Tiến trình phân tích
          </h3>
        </div>
        {isAnalyzing && (
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-blue-400">
            <span className="size-1.5 rounded-full bg-blue-400 animate-ping" />
            <span>Đang xử lý...</span>
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        {steps.map((step) => {
          return (
            <div key={step.id} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                {step.status === "completed" ? (
                  <span className="flex size-4.5 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                ) : step.status === "running" ? (
                  <span className="flex size-4.5 items-center justify-center rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
                    <svg className="size-3 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </span>
                ) : (
                  <span className="flex size-4.5 items-center justify-center rounded-full bg-white/[0.04] text-zinc-600 border border-white/[0.06]">
                    <span className="size-1.5 rounded-full bg-zinc-600" />
                  </span>
                )}

                <span
                  className={`truncate ${
                    step.status === "completed"
                      ? "text-zinc-300"
                      : step.status === "running"
                        ? "text-blue-400 font-medium"
                        : "text-zinc-500"
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {step.duration && (
                <span className="text-[11px] text-zinc-500 shrink-0 font-mono">
                  {step.duration}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer summary */}
      <div className="pt-2 border-t border-border/50 text-[11px] text-zinc-500 flex items-center justify-between">
        {isAnalyzing ? (
          <span>Vui lòng đợi trong giây lát...</span>
        ) : (
          <>
            <span>Hoàn tất {completedAt ? `lúc ${completedAt}` : "vừa xong"}</span>
            <span className="text-zinc-400 font-medium">{sceneCount} cảnh đã tạo</span>
          </>
        )}
      </div>
    </div>
  )
}
