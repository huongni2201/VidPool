import { useNavigate } from "react-router-dom"
import { ROUTES } from "@/shared/constants"
import type { AnalyzedScene } from "../model/types"
import { AnalyzedSceneCard } from "./analyzed-scene-card"

interface AnalyzedSceneListProps {
  scenes: AnalyzedScene[]
  onOpenVisualBeat?: (sceneId?: string) => void
}

export function AnalyzedSceneList({ scenes, onOpenVisualBeat }: AnalyzedSceneListProps) {
  const navigate = useNavigate()

  const handleOpenVisualBeat = (sceneId?: string) => {
    if (onOpenVisualBeat) {
      onOpenVisualBeat(sceneId)
    } else {
      navigate(ROUTES.VISUAL_BEAT)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card/40 p-5 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            Cảnh đã phân tích
          </h3>
          <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {scenes.length}
          </span>
        </div>

        {scenes.length > 0 && (
          <button
            onClick={() => handleOpenVisualBeat()}
            className="group flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
          >
            <span>Mở Visual Beat</span>
            <svg
              className="size-3.5 transition-transform group-hover:translate-x-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        )}
      </div>

      {/* Grid of scenes */}
      {scenes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 py-10 text-center text-muted-foreground">
          <svg className="size-8 mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <p className="text-xs font-medium text-foreground">Chưa có phân cảnh nào</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Nhấn "Phân tích chapter" để AI tự động bóc tách phân cảnh và visual beats.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {scenes.map((scene) => (
            <AnalyzedSceneCard
              key={scene.id}
              scene={scene}
              onOpenVisualBeat={handleOpenVisualBeat}
            />
          ))}
        </div>
      )}
    </div>
  )
}
