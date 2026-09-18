import { useState, useMemo } from "react"
import { useNavigate, useSearchParams, Link } from "react-router-dom"
import { ROUTES } from "@/shared/constants"
import { StatusBadge } from "@/shared/ui"
import {
  INITIAL_CHAPTERS,
  DEMO_ANALYZED_SCENES,
  DEMO_VISUAL_BEATS,
  type VisualBeat,
  type AnalyzedScene,
  type Chapter,
} from "@/features/chapters"

export function VisualBeatPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // 1. Resolve Chapter from URL or fallback to first analyzed chapter
  const rawChapterId = searchParams.get("chapterId")
  const activeChapterId = useMemo(() => {
    const found = INITIAL_CHAPTERS.find((c) => c.id === rawChapterId)
    return found ? found.id : "chap-03"
  }, [rawChapterId])

  const currentChapter: Chapter = useMemo(() => {
    return (
      INITIAL_CHAPTERS.find((c) => c.id === activeChapterId) ||
      INITIAL_CHAPTERS.find((c) => c.id === "chap-03") ||
      INITIAL_CHAPTERS[0]
    )
  }, [activeChapterId])

  // 2. Scenes for the current Chapter
  const chapterScenes: AnalyzedScene[] = useMemo(() => {
    return DEMO_ANALYZED_SCENES[currentChapter.id] || []
  }, [currentChapter.id])

  // 3. Resolve Scene from URL ("all" or specific sceneId)
  const rawSceneId = searchParams.get("sceneId")
  const activeSceneId = useMemo(() => {
    if (!rawSceneId || rawSceneId === "all") return "all"
    const found = chapterScenes.find((s) => s.id === rawSceneId)
    return found ? found.id : "all"
  }, [rawSceneId, chapterScenes])

  const currentScene: AnalyzedScene | undefined = useMemo(() => {
    if (activeSceneId === "all") return undefined
    return chapterScenes.find((s) => s.id === activeSceneId)
  }, [activeSceneId, chapterScenes])

  // 4. Visual Beats for the current Chapter and Scene
  const chapterBeats: VisualBeat[] = useMemo(() => {
    return DEMO_VISUAL_BEATS.filter((b) => b.chapterId === currentChapter.id)
  }, [currentChapter.id])

  // Filter beats by scene
  const sceneFilteredBeats: VisualBeat[] = useMemo(() => {
    if (activeSceneId === "all") return chapterBeats
    return chapterBeats.filter((b) => b.sceneId === activeSceneId)
  }, [chapterBeats, activeSceneId])

  // UI States
  const [filter, setFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid")
  const [selectedBeatId, setSelectedBeatId] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isGeneratingAll, setIsGeneratingAll] = useState(false)
  const [isGeneratingSingle, setIsGeneratingSingle] = useState(false)
  const [copiedPrompt, setCopiedPrompt] = useState(false)

  // Filter beats by status & search
  const displayedBeats = useMemo(() => {
    return sceneFilteredBeats.filter((b) => {
      // Status filter
      if (filter === "completed" && b.status !== "Đã tạo") return false
      if (filter === "generating" && b.status !== "Đang tạo") return false
      if (filter === "pending" && b.status !== "Chờ tạo") return false

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchTitle = b.title.toLowerCase().includes(q)
        const matchPrompt = b.prompt.toLowerCase().includes(q)
        const matchCharacter = b.character.toLowerCase().includes(q)
        const matchDialogue = b.dialogue.toLowerCase().includes(q)
        if (!matchTitle && !matchPrompt && !matchCharacter && !matchDialogue) return false
      }
      return true
    })
  }, [sceneFilteredBeats, filter, searchQuery])

  // Currently inspected beat
  const inspectedBeat: VisualBeat | undefined = useMemo(() => {
    if (selectedBeatId) {
      const found = chapterBeats.find((b) => b.id === selectedBeatId)
      if (found) return found
    }
    return displayedBeats[0] || chapterBeats[0]
  }, [selectedBeatId, chapterBeats, displayedBeats])

  // Stats calculation
  const totalChapterBeats = chapterBeats.length
  const completedChapterBeats = chapterBeats.filter((b) => b.status === "Đã tạo").length
  const progressPercent = totalChapterBeats > 0 ? Math.round((completedChapterBeats / totalChapterBeats) * 100) : 0

  const pendingCount = sceneFilteredBeats.filter((b) => b.status === "Chờ tạo").length
  const generatingCount = sceneFilteredBeats.filter((b) => b.status === "Đang tạo").length
  const completedCount = sceneFilteredBeats.filter((b) => b.status === "Đã tạo").length

  // Handlers for Chapter & Scene navigation
  const handleSelectChapter = (chapterId: string) => {
    setSearchParams({ chapterId, sceneId: "all" })
    setSelectedBeatId(null)
  }

  const handleSelectScene = (sceneId: string) => {
    setSearchParams({ chapterId: currentChapter.id, sceneId })
    setSelectedBeatId(null)
  }

  const handleCopyPrompt = () => {
    if (!inspectedBeat) return
    navigator.clipboard.writeText(inspectedBeat.prompt)
    setCopiedPrompt(true)
    setTimeout(() => setCopiedPrompt(false), 2000)
  }

  const handleGenerateAll = () => {
    setIsGeneratingAll(true)
    setTimeout(() => setIsGeneratingAll(false), 2500)
  }

  const handleGenerateSingle = () => {
    setIsGeneratingSingle(true)
    setTimeout(() => setIsGeneratingSingle(false), 2000)
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col p-4 max-w-[1760px] mx-auto select-none overflow-hidden gap-3">
      {/* 1. TOP HEADER & BREADCRUMB BAR */}
      <div className="flex items-center justify-between border-b border-border/80 pb-3">
        <div className="flex flex-col gap-1">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Link to={ROUTES.PROJECTS} className="hover:text-foreground transition-colors">
              Dự án
            </Link>
            <span>/</span>
            <Link to={`/chapters/${currentChapter.id}`} className="hover:text-foreground transition-colors">
              Kịch bản & Chapters
            </Link>
            <span>/</span>
            <span className="font-semibold text-foreground">Visual Beat</span>
          </div>

          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <span>Visual Beat</span>
            </h2>

            {/* Chapter Selector Dropdown */}
            <div className="relative flex items-center">
              <label htmlFor="chapter-select" className="sr-only">
                Chọn Chapter
              </label>
              <select
                id="chapter-select"
                value={currentChapter.id}
                onChange={(e) => handleSelectChapter(e.target.value)}
                className="h-8 rounded-lg border border-border bg-secondary/80 px-2.5 pr-8 text-xs font-semibold text-foreground hover:bg-secondary cursor-pointer focus:border-blue-500 focus:outline-none transition-colors"
              >
                {INITIAL_CHAPTERS.map((chap) => (
                  <option key={chap.id} value={chap.id}>
                    Chương {chap.order.toString().padStart(2, "0")}: {chap.title} ({chap.stats.sceneCount} cảnh • {chap.stats.visualBeatCount} beats)
                  </option>
                ))}
              </select>
            </div>

            <Link
              to={`/chapters/${currentChapter.id}`}
              className="flex items-center gap-1 rounded-lg border border-border/70 bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all cursor-pointer"
            >
              <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Về Chapter {currentChapter.order}</span>
            </Link>
          </div>
        </div>

        {/* Right Action Tools: Overall Chapter Generation Progress */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card/80 px-3.5 py-1.5 backdrop-blur-sm shadow-xs">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 text-[11px]">
                <span className="text-muted-foreground">Tiến độ Chapter {currentChapter.order}:</span>
                <span className="font-semibold text-foreground">
                  {completedChapterBeats}/{totalChapterBeats} beats
                </span>
                <span className="text-[10.5px] font-bold text-blue-400 font-mono">
                  {progressPercent}%
                </span>
              </div>
              <div className="h-1.5 w-36 rounded-full bg-secondary overflow-hidden mt-1">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <button
              onClick={handleGenerateAll}
              disabled={isGeneratingAll || totalChapterBeats === 0}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-500 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isGeneratingAll ? (
                <>
                  <svg className="size-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Đang tạo {totalChapterBeats} video...</span>
                </>
              ) : (
                <>
                  <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Tạo tất cả video</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 2. SCENE HIERARCHY NAVIGATION BAR */}
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-card/60 p-2.5 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <svg className="size-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
              </svg>
              <span>Phân cảnh trong Chapter {currentChapter.order} ({chapterScenes.length} cảnh)</span>
            </span>
          </div>

          <span className="text-[11px] text-muted-foreground">
            Chọn cảnh để xem các Visual Beats tương ứng
          </span>
        </div>

        {/* Scene Tabs Scrollable Strip */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 custom-scrollbar">
          {/* All Scenes Tab */}
          <button
            onClick={() => handleSelectScene("all")}
            className={`group flex shrink-0 items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              activeSceneId === "all"
                ? "border-blue-500 bg-blue-600/15 text-blue-400 shadow-xs"
                : "border-border/70 bg-card/70 text-muted-foreground hover:border-border hover:bg-secondary/70 hover:text-foreground"
            }`}
          >
            <span>Tất cả các cảnh</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                activeSceneId === "all"
                  ? "bg-blue-500 text-white"
                  : "bg-white/[0.08] text-muted-foreground"
              }`}
            >
              {totalChapterBeats} beats
            </span>
          </button>

          {/* Individual Scene Tabs */}
          {chapterScenes.map((sc) => {
            const isSelected = activeSceneId === sc.id
            return (
              <button
                key={sc.id}
                onClick={() => handleSelectScene(sc.id)}
                className={`group flex shrink-0 items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                  isSelected
                    ? "border-blue-500 bg-blue-600/15 text-blue-400 shadow-xs font-semibold"
                    : "border-border/70 bg-card/70 text-muted-foreground hover:border-border hover:bg-secondary/70 hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[11px] opacity-75">#{sc.sceneNumber}</span>
                  <span className="truncate max-w-[130px]">{sc.title}</span>
                </div>

                <div className="flex items-center gap-1">
                  <span
                    className={`rounded px-1 py-0.2 text-[9.5px] border ${
                      sc.sceneType === "Ngoại cảnh"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                    }`}
                  >
                    {sc.sceneType === "Ngoại cảnh" ? "Ngoại" : "Nội"}
                  </span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                      isSelected
                        ? "bg-blue-500 text-white"
                        : "bg-white/[0.08] text-zinc-300"
                    }`}
                  >
                    {sc.visualBeatCount} beats
                  </span>
                </div>
              </button>
            )
          })}
        </div>

        {/* Context Banner for Current Scene */}
        {currentScene ? (
          <div className="flex items-center justify-between rounded-lg border border-border/50 bg-secondary/30 px-3 py-2 text-xs">
            <div className="flex items-center gap-3 min-w-0">
              <span className="font-semibold text-foreground flex items-center gap-1.5 shrink-0">
                <span className="text-blue-400">Cảnh {currentScene.sceneNumber}:</span> {currentScene.title}
              </span>
              <span className="text-muted-foreground truncate hidden md:inline text-[11.5px]">
                {currentScene.promptPreview}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <svg className="size-3 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                {currentScene.location}
              </span>
              <span>•</span>
              <span className="font-mono">{currentScene.estimatedDuration}</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-lg border border-border/50 bg-secondary/30 px-3 py-1.5 text-xs text-muted-foreground">
            <span>Hiển thị tất cả <strong>{chapterScenes.length} cảnh</strong> và <strong>{totalChapterBeats} visual beats</strong> của Chapter {currentChapter.order}</span>
            <span className="text-[11px]">Bấm vào từng cảnh ở trên để lọc theo cảnh</span>
          </div>
        )}
      </div>

      {/* 3. TOOLBAR: FILTERS, SEARCH & VIEW MODE */}
      <div className="flex items-center justify-between">
        {/* Status Filters */}
        <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
              filter === "all" ? "bg-blue-600 text-white" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Tất cả ({sceneFilteredBeats.length})
          </button>
          <button
            onClick={() => setFilter("pending")}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
              filter === "pending" ? "bg-blue-600 text-white" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Chờ tạo ({pendingCount})
          </button>
          <button
            onClick={() => setFilter("generating")}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
              filter === "generating" ? "bg-blue-600 text-white" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Đang tạo ({generatingCount})
          </button>
          <button
            onClick={() => setFilter("completed")}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
              filter === "completed" ? "bg-blue-600 text-white" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Đã hoàn thành ({completedCount})
          </button>
        </div>

        {/* Search & View Switcher */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <label htmlFor="search-beat" className="sr-only">
              Tìm kiếm visual beat
            </label>
            <input
              id="search-beat"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm visual beat, prompt..."
              className="h-8 w-60 rounded-xl border border-border bg-card pl-8 pr-3 text-xs text-foreground placeholder-muted-foreground focus:border-blue-500 focus:outline-none transition-colors"
            />
            <svg className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div className="flex items-center rounded-xl border border-border bg-card p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`flex size-7 items-center justify-center rounded-lg text-xs transition-all cursor-pointer ${
                viewMode === "grid" ? "bg-blue-600 text-white" : "text-muted-foreground hover:text-foreground"
              }`}
              title="Chế độ Storyboard Lưới"
            >
              <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`flex size-7 items-center justify-center rounded-lg text-xs transition-all cursor-pointer ${
                viewMode === "table" ? "bg-blue-600 text-white" : "text-muted-foreground hover:text-foreground"
              }`}
              title="Chế độ Bảng Studio"
            >
              <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* 4. MAIN SPLIT VIEW: BEATS GALLERY (Col 8) & INSPECTOR (Col 4) */}
      <div className="grid flex-1 grid-cols-12 gap-4 overflow-hidden">
        {/* Left: Beat Gallery (Grid or Table) */}
        <div className="col-span-8 flex flex-col rounded-xl border border-border bg-card overflow-hidden">
          {displayedBeats.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <svg className="size-10 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p className="text-sm font-medium text-foreground">Không tìm thấy Visual Beat nào</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Thử thay đổi bộ lọc trạng thái hoặc từ khóa tìm kiếm.
              </p>
            </div>
          ) : viewMode === "grid" ? (
            /* Storyboard Grid View */
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {displayedBeats.map((beat) => {
                  const isSelected = inspectedBeat?.id === beat.id
                  const sceneParent = chapterScenes.find((s) => s.id === beat.sceneId)
                  return (
                    <div
                      key={beat.id}
                      onClick={() => setSelectedBeatId(beat.id)}
                      className={`group relative flex flex-col justify-between rounded-xl border p-3 transition-all cursor-pointer ${
                        isSelected
                          ? "border-blue-500 bg-blue-950/20 shadow-md shadow-blue-500/10 ring-1 ring-blue-500"
                          : "border-border bg-card/60 hover:border-border hover:bg-secondary/40"
                      }`}
                    >
                      {/* Top Media Thumbnail */}
                      <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-black/50 border border-white/[0.06]">
                        <img
                          src={beat.thumb}
                          alt={beat.title}
                          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />

                        {/* Top Badges over image */}
                        <div className="absolute top-2 inset-x-2 flex items-center justify-between">
                          <span className="rounded-md bg-black/75 backdrop-blur-md px-1.5 py-0.5 text-[10px] font-mono font-bold text-white border border-white/10">
                            Beat #{beat.beatNumber}
                          </span>
                          <StatusBadge status={beat.status} size="sm" />
                        </div>

                        {/* Bottom Info over image */}
                        <div className="absolute bottom-1.5 inset-x-2 flex items-center justify-between text-[10px] text-white">
                          <span className="rounded bg-black/60 px-1.5 py-0.5 font-mono">
                            {beat.duration}
                          </span>
                          <span className="rounded bg-black/60 px-1.5 py-0.5">
                            {beat.cameraShot}
                          </span>
                        </div>
                      </div>

                      {/* Content Info */}
                      <div className="flex flex-col gap-1.5 mt-2.5">
                        {/* Scene tag if in "All Scenes" view */}
                        {activeSceneId === "all" && sceneParent && (
                          <span className="text-[10px] font-medium text-blue-400">
                            Cảnh {sceneParent.sceneNumber}: {sceneParent.title}
                          </span>
                        )}

                        <h4 className="text-xs font-bold text-foreground group-hover:text-blue-400 transition-colors line-clamp-1">
                          {beat.title}
                        </h4>

                        <p className="text-[11px] leading-relaxed text-muted-foreground line-clamp-2">
                          {beat.prompt}
                        </p>
                      </div>

                      {/* Footer: Character & Dialogue */}
                      <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2 text-[10.5px]">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {beat.characterAvatar && (
                            <img
                              src={beat.characterAvatar}
                              alt={beat.character}
                              className="size-4.5 rounded-full object-cover shrink-0"
                            />
                          )}
                          <span className="font-medium text-zinc-300 truncate max-w-[90px]">
                            {beat.character}
                          </span>
                        </div>

                        <span className="text-muted-foreground font-mono text-[10px] shrink-0">
                          {beat.cameraMovement}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            /* Studio Table View */
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-secondary/80 backdrop-blur-md border-b border-border text-[11px] font-semibold text-muted-foreground z-10">
                  <tr>
                    <th className="p-3 w-8">
                      <input type="checkbox" className="rounded border-border bg-secondary" />
                    </th>
                    <th className="py-3 px-2 w-10">#</th>
                    <th className="py-3 px-2 w-16">Preview</th>
                    <th className="py-3 px-2">Cảnh / Tiêu đề Beat & Prompt</th>
                    <th className="py-3 px-2">Nhân vật</th>
                    <th className="py-3 px-2">Thoại (TTS)</th>
                    <th className="py-3 px-2">Thời lượng</th>
                    <th className="py-3 px-2">Góc & Chuyển động</th>
                    <th className="py-3 px-2">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {displayedBeats.map((beat) => {
                    const isSelected = inspectedBeat?.id === beat.id
                    const sceneParent = chapterScenes.find((s) => s.id === beat.sceneId)
                    return (
                      <tr
                        key={beat.id}
                        onClick={() => setSelectedBeatId(beat.id)}
                        className={`group transition-colors cursor-pointer ${
                          isSelected ? "bg-blue-600/15" : "hover:bg-secondary/40"
                        }`}
                      >
                        <td className="p-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => setSelectedBeatId(beat.id)}
                            className="rounded border-border bg-secondary accent-blue-500"
                          />
                        </td>
                        <td className="py-3 px-2 font-mono text-muted-foreground font-bold">
                          {beat.beatNumber.toString().padStart(2, "0")}
                        </td>
                        <td className="py-2 px-2">
                          <img
                            src={beat.thumb}
                            alt={beat.title}
                            className="size-11 rounded-md object-cover border border-border shrink-0"
                          />
                        </td>
                        <td className="py-3 px-2 max-w-[220px]">
                          <div className="flex flex-col">
                            {activeSceneId === "all" && sceneParent && (
                              <span className="text-[10px] text-blue-400 font-medium">
                                Cảnh {sceneParent.sceneNumber}: {sceneParent.title}
                              </span>
                            )}
                            <span className="font-semibold text-foreground group-hover:text-blue-400 transition-colors truncate">
                              {beat.title}
                            </span>
                            <span className="truncate text-[11px] text-muted-foreground">
                              {beat.prompt}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          {beat.characterAvatar ? (
                            <div className="flex items-center gap-1.5">
                              <img
                                src={beat.characterAvatar}
                                alt={beat.character}
                                className="size-5 rounded-full object-cover border border-border shrink-0"
                              />
                              <span className="text-[11px] text-zinc-300 whitespace-nowrap">{beat.character}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="py-3 px-2 max-w-[140px] truncate text-muted-foreground text-[11px]">
                          {beat.dialogue ? `"${beat.dialogue}"` : "-"}
                        </td>
                        <td className="py-3 px-2 font-mono text-muted-foreground text-[11px]">{beat.duration}</td>
                        <td className="py-3 px-2 text-muted-foreground text-[11px]">
                          <span className="text-zinc-300">{beat.cameraShot}</span>
                          <span className="block text-[10px] text-muted-foreground">{beat.cameraMovement}</span>
                        </td>
                        <td className="py-3 px-2">
                          <StatusBadge status={beat.status} size="sm" />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: Beat Inspector & AI Generation Panel (Col 4) */}
        {inspectedBeat ? (
          <div className="col-span-4 flex flex-col rounded-xl border border-border bg-card p-4 overflow-y-auto custom-scrollbar">
            {/* Top Title & Hierarchy Breadcrumb */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex flex-col">
                <span className="text-[10.5px] font-semibold uppercase tracking-wider text-blue-400">
                  {(() => {
                    const parent = chapterScenes.find((s) => s.id === inspectedBeat.sceneId)
                    return parent
                      ? `Cảnh ${parent.sceneNumber}: ${parent.title}`
                      : `Chapter ${currentChapter.order}`
                  })()}
                </span>
                <h3 className="text-sm font-bold text-foreground">
                  Beat #{inspectedBeat.beatNumber}: {inspectedBeat.title}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <StatusBadge status={inspectedBeat.status} size="sm" />
              </div>
            </div>

            {/* Video Player Preview Frame */}
            <div className="relative mt-3 aspect-video w-full rounded-lg overflow-hidden bg-black border border-border">
              <img src={inspectedBeat.thumb} alt={inspectedBeat.title} className="size-full object-cover" />

              {/* Playback Simulation Overlay */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-2.5 flex items-center justify-between text-[11px] text-white">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="size-7 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/40 transition-colors cursor-pointer"
                  >
                    {isPlaying ? (
                      <svg className="size-3 fill-current" viewBox="0 0 24 24">
                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                      </svg>
                    ) : (
                      <svg className="size-3.5 fill-current ml-0.5" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </button>
                  <span className="font-mono text-[10.5px]">
                    {isPlaying ? "00:02" : "00:00"} / {inspectedBeat.duration}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span className="rounded bg-black/60 px-1.5 py-0.5 font-mono">16:9</span>
                  <span className="rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 px-1.5 py-0.5 font-mono">1080p</span>
                </div>
              </div>
            </div>

            {/* Form Fields for the Beat */}
            <div className="flex flex-col gap-3 mt-3.5 text-xs">
              {/* Beat Title */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground">Tên Visual Beat</label>
                <input
                  type="text"
                  value={inspectedBeat.title}
                  readOnly
                  className="mt-1 h-8 w-full rounded-lg border border-border bg-secondary/80 px-2.5 text-foreground focus:outline-none"
                />
              </div>

              {/* AI Visual Prompt */}
              <div>
                <div className="flex justify-between items-center text-[11px] font-semibold text-muted-foreground">
                  <span>Prompt hình ảnh (AI Prompt)</span>
                  <button
                    onClick={handleCopyPrompt}
                    className="flex items-center gap-1 text-[10.5px] text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                  >
                    <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    <span>{copiedPrompt ? "Đã chép!" : "Sao chép"}</span>
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={inspectedBeat.prompt}
                  readOnly
                  className="mt-1 w-full rounded-lg border border-border bg-secondary/80 p-2 text-xs text-foreground leading-relaxed resize-none focus:outline-none"
                />
              </div>

              {/* Character & Dialogue */}
              <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/50 p-2.5">
                <div className="flex items-center gap-2.5">
                  {inspectedBeat.characterAvatar && (
                    <img
                      src={inspectedBeat.characterAvatar}
                      alt={inspectedBeat.character}
                      className="size-8 rounded-md object-cover border border-border"
                    />
                  )}
                  <div>
                    <span className="text-xs font-semibold text-foreground block">
                      {inspectedBeat.character}
                    </span>
                    <span className="text-[10.5px] text-muted-foreground">
                      Nhân vật xuất hiện
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => navigate(ROUTES.CHARACTERS)}
                  className="rounded bg-secondary px-2 py-1 text-[10.5px] font-semibold text-foreground hover:bg-secondary/80 border border-border cursor-pointer transition-colors"
                >
                  Nhân vật
                </button>
              </div>

              {/* TTS Dialogue */}
              <div>
                <div className="flex justify-between text-[11px] font-semibold text-muted-foreground">
                  <span>Lời thoại / Thuyết minh (TTS)</span>
                  <span className="text-[10px] text-muted-foreground">
                    {inspectedBeat.dialogue ? `${inspectedBeat.dialogue.length} ký tự` : "Không có thoại"}
                  </span>
                </div>
                <input
                  type="text"
                  value={inspectedBeat.dialogue || "-"}
                  readOnly
                  className="mt-1 h-8 w-full rounded-lg border border-border bg-secondary/80 px-2.5 text-foreground focus:outline-none"
                />
              </div>

              {/* Camera Angle & Movement */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-border bg-secondary/40 p-2">
                  <span className="text-[10.5px] text-muted-foreground block">Góc máy (Shot)</span>
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground mt-0.5">
                    <svg className="size-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    {inspectedBeat.cameraShot}
                  </span>
                </div>

                <div className="rounded-lg border border-border bg-secondary/40 p-2">
                  <span className="text-[10.5px] text-muted-foreground block">Chuyển động máy</span>
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground mt-0.5">
                    <svg className="size-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    {inspectedBeat.cameraMovement}
                  </span>
                </div>
              </div>

              {/* Duration & Generation Strategy */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-border bg-secondary/40 p-2">
                  <span className="text-[10.5px] text-muted-foreground block">Thời lượng</span>
                  <span className="flex items-center gap-1 text-xs font-semibold text-foreground font-mono mt-0.5">
                    <svg className="size-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {inspectedBeat.duration}
                  </span>
                </div>

                <div className="rounded-lg border border-border bg-secondary/40 p-2">
                  <span className="text-[10.5px] text-muted-foreground block">Chiến lược tạo</span>
                  <span className="text-[11px] font-semibold text-emerald-400 font-mono mt-0.5 block">
                    {inspectedBeat.generationStrategy}
                  </span>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-border mt-1">
                <button
                  onClick={() => navigate(ROUTES.EDITOR)}
                  className="flex-1 rounded-lg border border-border bg-secondary/60 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition-all text-center cursor-pointer"
                >
                  Mở trong Chỉnh sửa
                </button>

                <button
                  onClick={handleGenerateSingle}
                  disabled={isGeneratingSingle}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/25 hover:bg-blue-500 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isGeneratingSingle ? (
                    <>
                      <svg className="size-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Đang tạo...</span>
                    </>
                  ) : (
                    <>
                      <svg className="size-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      <span>Tạo video</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="col-span-4 flex items-center justify-center rounded-xl border border-border bg-card p-4 text-center text-muted-foreground">
            <p className="text-xs">Chọn một Visual Beat để xem và chỉnh sửa chi tiết</p>
          </div>
        )}
      </div>
    </div>
  )
}
