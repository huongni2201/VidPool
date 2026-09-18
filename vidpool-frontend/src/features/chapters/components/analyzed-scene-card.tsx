import type { AnalyzedScene } from "../model/types"

interface AnalyzedSceneCardProps {
  scene: AnalyzedScene
  onOpenVisualBeat?: (sceneId: string) => void
}

export function AnalyzedSceneCard({ scene, onOpenVisualBeat }: AnalyzedSceneCardProps) {
  return (
    <div
      onClick={() => onOpenVisualBeat?.(scene.id)}
      className="group flex flex-col justify-between rounded-xl border border-border bg-card/60 p-4 transition-all hover:border-blue-500/40 hover:bg-card/90 cursor-pointer"
    >
      <div className="flex flex-col gap-2">
        {/* Top: Scene Title + Type and Duration Badges */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-foreground group-hover:text-blue-400 transition-colors truncate">
            Cảnh {scene.sceneNumber}: {scene.title}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="inline-flex items-center rounded-md bg-white/[0.05] px-2 py-0.5 text-[10.5px] font-medium text-zinc-300 border border-white/[0.06]">
              {scene.estimatedDuration}
            </span>
            <span
              className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10.5px] font-medium border ${
                scene.sceneType === "Ngoại cảnh"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-blue-500/10 text-blue-400 border-blue-500/20"
              }`}
            >
              {scene.sceneType}
            </span>
          </div>
        </div>

        {/* Prompt Preview */}
        <p className="line-clamp-2 text-[11.5px] leading-relaxed text-muted-foreground">
          {scene.promptPreview}
        </p>
      </div>

      {/* Bottom: Beat count + Location */}
      <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2.5 text-[11px] text-zinc-400">
        <div className="flex items-center gap-1">
          <svg className="size-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>{scene.visualBeatCount} visual beats</span>
        </div>

        <div className="flex items-center gap-1 text-zinc-400 truncate max-w-[140px]">
          <svg className="size-3 text-rose-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="truncate">{scene.location}</span>
        </div>
      </div>
    </div>
  )
}
