import { useState, useRef, useEffect } from "react"
import { WaveformVisualizer } from "@/shared/ui"
import { demoProjects } from "@/assets/demo"

export function EditorPage() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTimeSec, setCurrentTimeSec] = useState(12)
  const totalDurationSec = 28
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true)
  const [subtitleStyle, setSubtitleStyle] = useState<"default" | "blur" | "outline" | "color">("default")
  const [fontSize, setFontSize] = useState(48)
  const [borderWidth, setBorderWidth] = useState(2)
  const [alignment, setAlignment] = useState<"left" | "center" | "right">("center")
  const [activeTab, setActiveTab] = useState<"scenes" | "media">("scenes")
  const [inspectorTab, setInspectorTab] = useState<"subtitles" | "tts">("subtitles")
  const [selectedScene, setSelectedScene] = useState(3)
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16" | "1:1">("16:9")
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true)
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true)
  const [isTheaterMode, setIsTheaterMode] = useState(false)
  const [isMuted, setIsMuted] = useState(false)

  const stageRef = useRef<HTMLDivElement>(null)
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    if (!stageRef.current || typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setStageSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        })
      }
    })
    observer.observe(stageRef.current)
    return () => observer.disconnect()
  }, [])

  // Keyboard shortcuts (Space: play/pause, Left/Right: seek)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || "").toLowerCase()
      if (activeTag === "input" || activeTag === "textarea" || activeTag === "select") return

      if (e.code === "Space") {
        e.preventDefault()
        setIsPlaying((prev) => !prev)
      } else if (e.code === "ArrowLeft") {
        e.preventDefault()
        setCurrentTimeSec((prev) => Math.max(0, prev - 5))
      } else if (e.code === "ArrowRight") {
        e.preventDefault()
        setCurrentTimeSec((prev) => Math.min(totalDurationSec, prev + 5))
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [totalDurationSec])

  // Playback timer simulation
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTimeSec((prev) => {
          if (prev >= totalDurationSec) {
            setIsPlaying(false)
            return 0
          }
          return prev + 1
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isPlaying, totalDurationSec])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `00:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
  }

  const targetRatio =
    aspectRatio === "9:16" ? 9 / 16 : aspectRatio === "1:1" ? 1 : 16 / 9

  let playerWidth = 0
  let playerHeight = 0

  if (stageSize.width > 0 && stageSize.height > 0) {
    const availableW = stageSize.width
    const availableH = stageSize.height
    const stageRatio = availableW / availableH

    if (stageRatio > targetRatio) {
      playerHeight = availableH
      playerWidth = playerHeight * targetRatio
    } else {
      playerWidth = availableW
      playerHeight = playerWidth / targetRatio
    }
  }

  const togglePlay = () => setIsPlaying((prev) => !prev)

  const seek = (delta: number) => {
    setCurrentTimeSec((prev) =>
      Math.max(0, Math.min(totalDurationSec, prev + delta))
    )
  }

  const toggleTheaterMode = () => {
    if (isTheaterMode) {
      setIsLeftSidebarOpen(true)
      setIsRightSidebarOpen(true)
      setIsTheaterMode(false)
    } else {
      setIsLeftSidebarOpen(false)
      setIsRightSidebarOpen(false)
      setIsTheaterMode(true)
    }
  }

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      stageRef.current?.requestFullscreen?.()
    } else {
      document.exitFullscreen?.()
    }
  }

  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percent = Math.max(0, Math.min(1, clickX / rect.width))
    setCurrentTimeSec(Math.round(percent * totalDurationSec))
  }

  const scenes = [
    {
      id: 1,
      num: "01",
      title: "Cô gái thức dậy",
      duration: "00:04",
      desc: "Một ngày mới lại bắt đầu...",
      thumb: demoProjects[0],
    },
    {
      id: 2,
      num: "02",
      title: "Trên đường đến trường",
      duration: "00:06",
      desc: "Thành phố buổi sáng thật đẹp.",
      thumb: demoProjects[1],
    },
    {
      id: 3,
      num: "03",
      title: "Gặp lại người quen",
      duration: "00:05",
      desc: "Cậu... đã quay lại rồi sao?",
      thumb: demoProjects[2],
    },
    {
      id: 4,
      num: "04",
      title: "Hoàng hôn buông xuống",
      duration: "00:06",
      desc: "Những cảm xúc khó tả...",
      thumb: demoProjects[3],
    },
  ]

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col bg-background text-foreground select-none overflow-hidden">
      {/* Top Workspace Section */}
      <div className="flex h-[66%] border-b border-border min-h-0 overflow-hidden">
        {/* Left Panel: Scenes & Media (Collapsible) */}
        {isLeftSidebarOpen && (
          <div className="w-[460px] xl:w-[560px] 2xl:w-[600px] shrink-0 flex flex-col border-r border-border bg-card transition-all duration-200">
            {/* Tabs header */}
            <div className="flex items-center justify-between border-b border-border px-3.5 pt-2.5">
              <div className="flex gap-4 text-xs font-semibold">
                <button
                  onClick={() => setActiveTab("scenes")}
                  className={`pb-2 transition-colors relative cursor-pointer ${
                    activeTab === "scenes"
                      ? "text-foreground after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-blue-500 after:shadow-[0_0_8px_var(--primary)]"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Cảnh ({scenes.length})
                </button>
                <button
                  onClick={() => setActiveTab("media")}
                  className={`pb-2 transition-colors relative cursor-pointer ${
                    activeTab === "media"
                      ? "text-foreground after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-blue-500 after:shadow-[0_0_8px_var(--primary)]"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Media
                </button>
              </div>
              <button className="flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm hover:bg-blue-500 active:scale-95 transition-all cursor-pointer">
                <span>+ Thêm cảnh</span>
              </button>
            </div>

            {/* Scene list - 2 columns */}
            <div className="flex-1 overflow-y-auto p-2.5 grid grid-cols-2 gap-2 content-start">
              {scenes.map((s) => (
                <div
                  key={s.id}
                  onClick={() => setSelectedScene(s.id)}
                  className={`group relative flex items-center gap-2 rounded-xl border p-2 transition-all cursor-pointer ${
                    selectedScene === s.id
                      ? "border-blue-500/60 bg-blue-600/15 shadow-sm shadow-blue-500/10 ring-1 ring-blue-500/30"
                      : "border-border bg-secondary/40 hover:border-border hover:bg-secondary/70"
                  }`}
                >
                  <div className="relative w-16 h-10 shrink-0 rounded-lg overflow-hidden bg-black/50 border border-border">
                    <img src={s.thumb} alt={s.title} className="size-full object-cover" />
                    <span className="absolute bottom-0.5 right-0.5 rounded bg-black/80 px-1 text-[8.5px] font-mono text-white">
                      {s.duration}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col min-w-0 pr-4">
                    <span className="truncate text-xs font-semibold text-foreground group-hover:text-blue-400 transition-colors">
                      {s.num}. {s.title}
                    </span>
                    <span className="truncate text-[10.5px] text-muted-foreground mt-0.5">{s.desc}</span>
                  </div>
                  <button className="absolute top-1.5 right-1.5 text-muted-foreground/60 hover:text-foreground p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-secondary transition-all cursor-pointer">
                    <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Center Panel: Video Player Studio Stage (flex-1) */}
        <div className="flex-1 min-w-0 flex flex-col items-center justify-between bg-neutral-950/80 p-2 sm:p-3 overflow-hidden relative select-none">
          {/* Monitor Header Toolbar */}
          <div className="w-full flex items-center justify-between px-3 py-1.5 border-b border-border/40 bg-card/30 rounded-t-xl mb-1 shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                  isLeftSidebarOpen
                    ? "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                    : "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                }`}
                title={isLeftSidebarOpen ? "Ẩn danh sách cảnh" : "Hiện danh sách cảnh"}
              >
                <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h16" />
                </svg>
                <span className="hidden sm:inline">Cảnh</span>
              </button>
              <div className="h-3.5 w-px bg-border/60" />
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground truncate">
                <span className="size-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
                <span className="truncate">
                  Cảnh {scenes.find((s) => s.id === selectedScene)?.num || "03"}: {scenes.find((s) => s.id === selectedScene)?.title || "Gặp lại người quen"}
                </span>
              </div>
              <span className="hidden md:inline-flex rounded-md bg-secondary/70 border border-border/50 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground shrink-0">
                {aspectRatio} • 1080p FHD
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleTheaterMode}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                  isTheaterMode
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-500/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                }`}
                title={isTheaterMode ? "Thoát chế độ rạp chiếu" : "Chế độ rạp chiếu (Mở rộng tối đa)"}
              >
                <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="hidden sm:inline">{isTheaterMode ? "Thu nhỏ" : "Rạp chiếu"}</span>
              </button>

              <button
                onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                  isRightSidebarOpen
                    ? "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                    : "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                }`}
                title={isRightSidebarOpen ? "Ẩn bảng thuộc tính" : "Hiện bảng thuộc tính"}
              >
                <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                <span className="hidden sm:inline">Thuộc tính</span>
              </button>
            </div>
          </div>

          {/* Main Video Screen - Stage */}
          <div
            ref={stageRef}
            className="relative flex-1 w-full min-h-0 flex items-center justify-end p-1 sm:p-2 pr-3 sm:pr-6 md:pr-8 overflow-hidden"
          >
            <div
              onClick={togglePlay}
              className="group relative ml-auto mr-0 rounded-2xl overflow-hidden bg-black flex items-center justify-center border border-white/10 shadow-2xl shadow-black/90 ring-1 ring-white/5 transition-all duration-200 cursor-pointer"
              style={{
                width: playerWidth > 0 ? `${playerWidth}px` : "auto",
                height: playerHeight > 0 ? `${playerHeight}px` : "100%",
                maxWidth: "100%",
                maxHeight: "100%",
                aspectRatio: targetRatio,
              }}
            >
              <img
                src={demoProjects[selectedScene - 1] || demoProjects[0]}
                alt="Video Scene"
                className="size-full object-cover select-none pointer-events-none transition-transform duration-300 group-hover:scale-[1.01]"
              />

              {/* Center Play/Pause Click Overlay */}
              <div
                className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300 ${
                  !isPlaying ? "bg-black/25 opacity-100" : "opacity-0 group-hover:opacity-100 group-hover:bg-black/20"
                }`}
              >
                <div className="flex size-14 sm:size-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white shadow-xl transform transition-transform group-hover:scale-110 active:scale-95">
                  {isPlaying ? (
                    <svg className="size-6 sm:size-7 fill-white" viewBox="0 0 24 24">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                    </svg>
                  ) : (
                    <svg className="size-6 sm:size-7 fill-white ml-1" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </div>
              </div>

              {/* Live Subtitle Overlay */}
              {subtitlesEnabled && (
                <div
                  className={`absolute bottom-6 px-6 text-center transition-all pointer-events-none ${
                    alignment === "left"
                      ? "left-6 text-left"
                      : alignment === "right"
                      ? "right-6 text-right"
                      : "inset-x-0 text-center"
                  }`}
                >
                  <span
                    className={`font-bold tracking-wide transition-all ${
                      subtitleStyle === "blur"
                        ? "bg-black/70 px-4 py-1.5 rounded-xl backdrop-blur-md"
                        : subtitleStyle === "color"
                        ? "text-amber-400 font-extrabold"
                        : "text-white"
                    }`}
                    style={{
                      fontSize: `${Math.max(16, fontSize * (playerHeight > 0 ? playerHeight / 420 : 0.45))}px`,
                      textShadow:
                        borderWidth > 0
                          ? `-1px -1px 0 black, 1px -1px 0 black, -1px 1px 0 black, 1px 1px 0 black, 0 2px 10px rgba(0,0,0,0.9)`
                          : "0 2px 8px rgba(0,0,0,0.8)",
                    }}
                  >
                    {scenes.find((s) => s.id === selectedScene)?.desc || "Cậu... đã quay lại rồi sao?"}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Player Controls Bar - Matches video preview width exactly */}
          <div className="w-full flex justify-end pr-3 sm:pr-6 md:pr-8 shrink-0 mt-1.5">
            <div
              className="flex flex-col gap-1 px-4 py-1.5 rounded-xl bg-card/40 border border-border/40 backdrop-blur-sm shadow-lg transition-all"
              style={{
                width: playerWidth > 0 ? `${playerWidth}px` : "100%",
                maxWidth: "100%",
              }}
            >
            {/* Scrubber bar */}
            <div
              onClick={handleScrubberClick}
              className="relative h-2 w-full rounded-full bg-secondary/80 hover:h-2.5 transition-all cursor-pointer group flex items-center"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 transition-all"
                style={{ width: `${(currentTimeSec / totalDurationSec) * 100}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 size-3.5 rounded-full bg-white shadow-md ring-2 ring-blue-500 group-hover:scale-125 transition-transform cursor-pointer"
                style={{ left: `${(currentTimeSec / totalDurationSec) * 100}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="font-mono text-[11px] text-muted-foreground flex items-center gap-1.5">
                <span className="text-foreground font-semibold">{formatTime(currentTimeSec)}</span> / 00:00:28
                <span className="text-[10px] px-1 py-0.2 rounded bg-secondary/70 text-muted-foreground border border-border/40 font-mono">
                  30fps
                </span>
              </span>

              {/* Playback action buttons */}
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => seek(-5)}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-secondary/60 cursor-pointer active:scale-95"
                  title="Lùi 5s (Phím ←)"
                >
                  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={togglePlay}
                  className="flex size-9 items-center justify-center rounded-full bg-gradient-to-tr from-white to-slate-200 text-black shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer ring-2 ring-white/20"
                  title={isPlaying ? "Tạm dừng (Space)" : "Phát video (Space)"}
                >
                  {isPlaying ? (
                    <svg className="size-4 fill-current" viewBox="0 0 24 24">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                    </svg>
                  ) : (
                    <svg className="size-4 fill-current ml-0.5" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => seek(5)}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-secondary/60 cursor-pointer active:scale-95"
                  title="Tiến 5s (Phím →)"
                >
                  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Volume & Aspect Ratio & Fullscreen */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-secondary/60 cursor-pointer transition-colors"
                  title={isMuted ? "Bật âm lượng" : "Tắt âm lượng"}
                >
                  {isMuted ? (
                    <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    </svg>
                  ) : (
                    <svg className="size-4 fill-none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M11 5L6 9H2v6h4l5 4V5z" />
                    </svg>
                  )}
                </button>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value as any)}
                  className="h-6 rounded bg-card px-1.5 text-[10.5px] font-medium text-foreground border border-border cursor-pointer transition-colors focus:ring-1 focus:ring-blue-500 outline-none"
                >
                  <option value="16:9">16:9 Ngang</option>
                  <option value="9:16">9:16 Dọc</option>
                  <option value="1:1">1:1 Vuông</option>
                </select>
                <button
                  onClick={handleToggleFullscreen}
                  className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-secondary/60 cursor-pointer transition-colors"
                  title="Toàn màn hình"
                >
                  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* Right Panel: Subtitles & TTS Inspector (Collapsible) */}
        {isRightSidebarOpen && (
          <div className="w-72 xl:w-80 shrink-0 flex flex-col border-l border-border bg-card/60 p-3.5 overflow-y-auto transition-all duration-200">
            {/* Inspector Tabs */}
            <div className="flex border-b border-border pb-2 text-xs font-semibold gap-4">
              <button
                onClick={() => setInspectorTab("subtitles")}
                className={`pb-1 transition-colors relative cursor-pointer ${
                  inspectorTab === "subtitles"
                    ? "text-foreground after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-blue-500 after:shadow-[0_0_8px_var(--primary)]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Phụ đề
              </button>
              <button
                onClick={() => setInspectorTab("tts")}
                className={`pb-1 transition-colors relative cursor-pointer ${
                  inspectorTab === "tts"
                    ? "text-foreground after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-blue-500 after:shadow-[0_0_8px_var(--primary)]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                TTS / Giọng đọc
              </button>
            </div>

            {/* Subtitle Form */}
            <div className="flex flex-col gap-3.5 mt-3">
              {/* Toggle switch */}
              <div className="flex items-center justify-between rounded-xl bg-secondary/50 p-2.5 border border-border">
                <div>
                  <span className="text-xs font-semibold text-foreground block">Bật phụ đề</span>
                  <span className="text-[10.5px] text-muted-foreground">Hiển thị phụ đề trong video</span>
                </div>
                <button
                  onClick={() => setSubtitlesEnabled(!subtitlesEnabled)}
                  className={`relative h-5 w-9 rounded-full transition-colors cursor-pointer ${
                    subtitlesEnabled ? "bg-blue-600" : "bg-secondary"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 size-4 rounded-full bg-white transition-transform ${
                      subtitlesEnabled ? "left-4.5" : "left-0.5"
                    }`}
                  />
                </button>
              </div>

              {/* Subtitle Presets */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground mb-1.5 block">Kiểu phụ đề</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: "default", label: "Mặc định", style: "font-bold text-foreground" },
                    { id: "blur", label: "Nền mờ", style: "bg-black/50 text-white" },
                    { id: "outline", label: "Viền đậm", style: "font-extrabold text-foreground" },
                    { id: "color", label: "Chữ màu", style: "text-amber-400 font-bold" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSubtitleStyle(p.id as any)}
                      className={`flex flex-col items-center justify-center rounded-lg border p-1.5 transition-all cursor-pointer ${
                        subtitleStyle === p.id
                          ? "border-blue-500 bg-blue-600/20 shadow-sm shadow-blue-500/20"
                          : "border-border bg-secondary/40 hover:border-border"
                      }`}
                    >
                      <span className={`text-xs ${p.style}`}>Aa</span>
                      <span className="text-[9.5px] text-muted-foreground mt-1">{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Font selector */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Font chữ</label>
                <select className="h-8 w-full rounded-lg border border-border bg-secondary px-2 text-xs text-foreground cursor-pointer">
                  <option>Be Vietnam Pro</option>
                  <option>Inter</option>
                  <option>Roboto</option>
                  <option>Montserrat</option>
                </select>
              </div>

              {/* Font Size slider */}
              <div>
                <div className="flex justify-between text-[11px] font-semibold text-muted-foreground mb-1">
                  <span>Cỡ chữ</span>
                  <span className="text-foreground font-mono">{fontSize}</span>
                </div>
                <input
                  type="range"
                  min="24"
                  max="72"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-full h-1.5 bg-secondary rounded-lg accent-blue-500 cursor-pointer"
                />
              </div>

              {/* Color & Border controls */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Màu chữ</label>
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary p-1.5">
                    <span className="size-4 rounded bg-white border border-border" />
                    <span className="text-[11px] text-foreground font-mono">White</span>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Viền chữ</label>
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary p-1.5">
                    <span className="size-4 rounded bg-black border border-border" />
                    <span className="text-[11px] text-foreground font-mono">Black</span>
                  </div>
                </div>
              </div>

              {/* Border Width slider */}
              <div>
                <div className="flex justify-between text-[11px] font-semibold text-muted-foreground mb-1">
                  <span>Độ dày viền</span>
                  <span className="text-foreground font-mono">{borderWidth}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="8"
                  value={borderWidth}
                  onChange={(e) => setBorderWidth(Number(e.target.value))}
                  className="w-full h-1.5 bg-secondary rounded-lg accent-blue-500 cursor-pointer"
                />
              </div>

              {/* Alignment */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Vị trí</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: "left", label: "Dưới trái" },
                    { id: "center", label: "Dưới giữa" },
                    { id: "right", label: "Dưới phải" },
                  ].map((a) => (
                    <button
                      key={a.id}
                      onClick={() => setAlignment(a.id as any)}
                      className={`rounded-lg border py-1 text-[10.5px] font-medium transition-all cursor-pointer ${
                        alignment === a.id
                          ? "border-blue-500 bg-blue-600 text-white shadow-sm"
                          : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Section: NLE Timeline */}
      <div className="flex flex-1 flex-col bg-card/80 min-h-0 overflow-hidden">
        {/* Timeline Toolbar */}
        <div className="flex h-9 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2">
            <button className="text-muted-foreground hover:text-foreground p-1 cursor-pointer transition-colors" title="Hoàn tác">
              <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v2M3 10l6-6m-6 6l6 6" />
              </svg>
            </button>
            <button className="text-muted-foreground hover:text-foreground p-1 cursor-pointer transition-colors" title="Làm lại">
              <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a5 5 0 00-5 5v2m15-7l-6-6m6 6l-6 6" />
              </svg>
            </button>
            <span className="h-4 w-px bg-border mx-1" />
            <button className="flex items-center gap-1 rounded-md bg-secondary/60 border border-border/50 px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
              <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 6a3 3 0 100 6 3 3 0 000-6zm0 0l12 12M6 18a3 3 0 100-6 3 3 0 000 6zm0 0l12-12" />
              </svg>
              <span>Cắt</span>
            </button>
            <button className="flex items-center gap-1 rounded-md bg-secondary/60 border border-border/50 px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
              <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Xóa</span>
            </button>
            <button className="flex items-center gap-1 rounded-md bg-secondary/60 border border-border/50 px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
              <span>Chia</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <span>-</span>
              <input type="range" min="1" max="100" defaultValue="50" className="w-20 h-1 bg-secondary rounded accent-blue-500 cursor-pointer" />
              <span>+</span>
            </div>
            <button className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer">
              <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              <span>Vừa khung ▾</span>
            </button>
          </div>
        </div>

        {/* Tracks Area */}
        <div className="relative flex-1 overflow-x-auto overflow-y-hidden bg-background p-2">
          {/* Time Ruler */}
          <div className="flex items-center border-b border-border pb-1 text-[10px] font-mono text-muted-foreground ml-28">
            <span className="w-24">00:00</span>
            <span className="w-28">00:05</span>
            <span className="w-28">00:10</span>
            <span className="w-28">00:15</span>
            <span className="w-28">00:20</span>
            <span className="w-28">00:25</span>
            <span className="w-28">00:28</span>
          </div>

          {/* Timeline Playhead line */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-10 pointer-events-none"
            style={{ left: "320px" }}
          >
            <div className="size-2.5 -translate-x-[4px] -translate-y-0.5 bg-blue-500 rounded-sm rotate-45 shadow-[0_0_8px_var(--primary)]" />
          </div>

          <div className="flex flex-col gap-1.5 mt-2">
            {/* Track 1: Visual Beat */}
            <div className="flex items-center h-7 gap-2">
              <div className="w-26 flex items-center gap-1.5 text-[10.5px] font-semibold text-purple-400">
                <span className="size-1.5 rounded-full bg-purple-400" />
                <span>Visual Beat</span>
              </div>
              <div className="flex-1 h-5 rounded-lg bg-purple-950/20 border border-purple-500/20 relative flex items-center px-2">
                <span className="size-2 rounded-full bg-purple-400 absolute left-8 shadow-[0_0_6px_rgba(192,132,252,0.8)]" />
                <span className="size-2 rounded-full bg-purple-400 absolute left-28 shadow-[0_0_6px_rgba(192,132,252,0.8)]" />
                <span className="size-2 rounded-full bg-purple-400 absolute left-60 shadow-[0_0_6px_rgba(192,132,252,0.8)]" />
                <span className="size-2 rounded-full bg-purple-400 absolute left-96 shadow-[0_0_6px_rgba(192,132,252,0.8)]" />
              </div>
            </div>

            {/* Track 2: Video Track */}
            <div className="flex items-center h-12 gap-2">
              <div className="w-26 flex items-center gap-1.5 text-[10.5px] font-semibold text-blue-400">
                <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>Video</span>
              </div>
              <div className="flex-1 h-11 flex gap-1">
                <div className="w-48 h-full rounded-lg border border-blue-500/40 bg-card flex items-center overflow-hidden hover:border-blue-400 transition-colors cursor-pointer">
                  <img src={demoProjects[0]} className="h-full w-14 object-cover" />
                  <span className="text-[10px] text-blue-200 px-2 truncate">01_thuc_day.mp4</span>
                </div>
                <div className="w-64 h-full rounded-lg border border-blue-500/60 bg-secondary flex items-center overflow-hidden shadow-sm shadow-blue-500/15 ring-1 ring-blue-500/30 cursor-pointer">
                  <img src={demoProjects[1]} className="h-full w-14 object-cover" />
                  <span className="text-[10px] text-blue-100 font-semibold px-2 truncate">02_den_truong.mp4</span>
                </div>
                <div className="w-56 h-full rounded-lg border border-blue-500/40 bg-card flex items-center overflow-hidden hover:border-blue-400 transition-colors cursor-pointer">
                  <img src={demoProjects[2]} className="h-full w-14 object-cover" />
                  <span className="text-[10px] text-blue-200 px-2 truncate">03_gap_lai.mp4</span>
                </div>
              </div>
            </div>

            {/* Track 3: TTS / Voice */}
            <div className="flex items-center h-10 gap-2">
              <div className="w-26 flex items-center gap-1.5 text-[10.5px] font-semibold text-emerald-400">
                <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
                </svg>
                <span>TTS / Voice</span>
              </div>
              <div className="flex-1 h-8 rounded-lg border border-emerald-500/30 bg-emerald-950/25 flex items-center px-2.5">
                <span className="text-[9.5px] font-mono text-emerald-300 mr-2 shrink-0">
                  Thanh Xuân Trở Lại_TTS.wav
                </span>
                <WaveformVisualizer height={20} barCount={120} activeColor="rgb(16, 185, 129)" color="rgba(16, 185, 129, 0.3)" progress={0.42} />
              </div>
            </div>

            {/* Track 4: Subtitles */}
            <div className="flex items-center h-8 gap-2">
              <div className="w-26 flex items-center gap-1.5 text-[10.5px] font-semibold text-amber-400">
                <span className="text-[11px] font-bold">Aa</span>
                <span>Phụ đề</span>
              </div>
              <div className="flex-1 h-7 flex gap-1">
                <div className="w-48 h-full rounded-md border border-blue-500/30 bg-blue-600/30 flex items-center justify-center text-[10.5px] font-medium text-white truncate px-2">
                  Một ngày mới lại bắt đầu...
                </div>
                <div className="w-56 h-full rounded-md border border-blue-500/50 bg-blue-600/50 flex items-center justify-center text-[10.5px] font-medium text-white truncate px-2 shadow-sm">
                  Cậu... đã quay lại rồi sao?
                </div>
                <div className="w-48 h-full rounded-md border border-blue-500/30 bg-blue-600/30 flex items-center justify-center text-[10.5px] font-medium text-white truncate px-2">
                  Mọi thứ... đều khác rồi.
                </div>
                <div className="w-44 h-full rounded-md border border-blue-500/30 bg-blue-600/30 flex items-center justify-center text-[10.5px] font-medium text-white truncate px-2">
                  Nhưng lần này...
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
