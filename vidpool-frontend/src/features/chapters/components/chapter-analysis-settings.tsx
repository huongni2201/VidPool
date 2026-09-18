import type { AnalysisSettings, VideoStyle, PacingType, DetailLevel } from "../model/types"

interface ChapterAnalysisSettingsProps {
  settings: AnalysisSettings
  onUpdate: <K extends keyof AnalysisSettings>(key: K, value: AnalysisSettings[K]) => void
  disabled?: boolean
}

export function ChapterAnalysisSettings({
  settings,
  onUpdate,
  disabled = false,
}: ChapterAnalysisSettingsProps) {
  const getDetailLevelLabel = (level: DetailLevel) => {
    switch (level) {
      case "low":
        return "Thấp (1-2 beats/cảnh)"
      case "medium":
        return "Vừa (2-3 beats/cảnh)"
      case "high":
        return "Cao (3-5 beats/cảnh)"
      case "very_high":
        return "Rất cao (5+ beats/cảnh)"
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card/60 p-4.5 backdrop-blur-sm">
      <div className="flex items-center gap-2 pb-1 border-b border-border/60">
        <svg className="size-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
          Tùy chọn phân tích
        </h3>
      </div>

      <div className="flex flex-col gap-3.5 text-xs">
        {/* Phong cách video */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11.5px] font-medium text-muted-foreground">
            Phong cách video
          </label>
          <select
            disabled={disabled}
            value={settings.videoStyle}
            onChange={(e) => onUpdate("videoStyle", e.target.value as VideoStyle)}
            className="h-8.5 w-full rounded-xl border border-border bg-card px-2.5 text-xs text-foreground focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="donghua">Anime / Donghua Trung Quốc</option>
            <option value="cinematic">Điện ảnh (Cinematic)</option>
            <option value="3d_animation">3D Animation</option>
            <option value="realistic">Realistic / Chân thực</option>
          </select>
        </div>

        {/* Nhịp điệu phân cảnh */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11.5px] font-medium text-muted-foreground">
            Nhịp điệu phân cảnh
          </label>
          <select
            disabled={disabled}
            value={settings.pacing}
            onChange={(e) => onUpdate("pacing", e.target.value as PacingType)}
            className="h-8.5 w-full rounded-xl border border-border bg-card px-2.5 text-xs text-foreground focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="fast">Nhanh (Hành động, dồn dập)</option>
            <option value="medium">Vừa phải (Tiêu chuẩn)</option>
            <option value="slow">Chậm (Tâm lý, cảm xúc)</option>
          </select>
        </div>

        {/* Số cảnh mục tiêu */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11.5px] font-medium text-muted-foreground">
              Số cảnh mục tiêu
            </label>
            <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[11px] font-bold text-blue-400 border border-blue-500/20">
              {settings.targetSceneCount} cảnh
            </span>
          </div>
          <input
            type="range"
            min={2}
            max={12}
            step={1}
            disabled={disabled}
            value={settings.targetSceneCount}
            onChange={(e) => onUpdate("targetSceneCount", Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-white/[0.08] accent-blue-500 disabled:opacity-50"
          />
          <div className="flex justify-between text-[10px] text-zinc-500">
            <span>2 cảnh</span>
            <span>12 cảnh</span>
          </div>
        </div>

        {/* Mức độ chi tiết Visual Beat */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11.5px] font-medium text-muted-foreground">
              Mức độ chi tiết Beat
            </label>
            <span className="text-[11px] font-medium text-zinc-300">
              {getDetailLevelLabel(settings.visualBeatDetailLevel)}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1 p-0.5 rounded-lg bg-card/80 border border-border">
            {(["low", "medium", "high", "very_high"] as DetailLevel[]).map((lvl) => {
              const labels: Record<DetailLevel, string> = {
                low: "Thấp",
                medium: "Vừa",
                high: "Cao",
                very_high: "Cực cao",
              }
              const active = settings.visualBeatDetailLevel === lvl
              return (
                <button
                  key={lvl}
                  type="button"
                  disabled={disabled}
                  onClick={() => onUpdate("visualBeatDetailLevel", lvl)}
                  className={`rounded py-1 text-[10.5px] font-semibold transition-all ${
                    active
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {labels[lvl]}
                </button>
              )
            })}
          </div>
        </div>

        {/* Toggles */}
        <div className="flex flex-col gap-2.5 pt-2 border-t border-border/50">
          <label className="flex items-center justify-between gap-2 cursor-pointer select-none">
            <span className="text-xs text-foreground">Tự động nhận diện nhân vật</span>
            <input
              type="checkbox"
              disabled={disabled}
              checked={settings.autoDetectCharacters}
              onChange={(e) => onUpdate("autoDetectCharacters", e.target.checked)}
              className="size-4 rounded border-border bg-card accent-blue-600 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between gap-2 cursor-pointer select-none">
            <span className="text-xs text-foreground">Tự động trích xuất địa điểm</span>
            <input
              type="checkbox"
              disabled={disabled}
              checked={settings.autoExtractLocations}
              onChange={(e) => onUpdate("autoExtractLocations", e.target.checked)}
              className="size-4 rounded border-border bg-card accent-blue-600 cursor-pointer"
            />
          </label>
        </div>
      </div>
    </div>
  )
}
