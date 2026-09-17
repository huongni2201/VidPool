import { useState } from "react"
import { WaveformVisualizer } from "@/components/shared/WaveformVisualizer"

export function EditorPage() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime] = useState("00:00:12")
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true)
  const [subtitleStyle, setSubtitleStyle] = useState<"default" | "blur" | "outline" | "color">("default")
  const [fontSize, setFontSize] = useState(48)
  const [borderWidth, setBorderWidth] = useState(2)
  const [alignment, setAlignment] = useState<"left" | "center" | "right">("center")
  const [activeTab, setActiveTab] = useState<"scenes" | "media">("scenes")
  const [inspectorTab, setInspectorTab] = useState<"subtitles" | "tts">("subtitles")
  const [selectedScene, setSelectedScene] = useState(3)

  const scenes = [
    {
      id: 1,
      num: "01",
      title: "Cô gái thức dậy",
      duration: "00:04",
      desc: "Một ngày mới lại bắt đầu...",
      thumb: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
    },
    {
      id: 2,
      num: "02",
      title: "Trên đường đến trường",
      duration: "00:06",
      desc: "Thành phố buổi sáng thật đẹp.",
      thumb: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80",
    },
    {
      id: 3,
      num: "03",
      title: "Gặp lại người quen",
      duration: "00:05",
      desc: "Cậu... đã quay lại rồi sao?",
      thumb: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&auto=format&fit=crop&q=80",
    },
    {
      id: 4,
      num: "04",
      title: "Hoàng hôn",
      duration: "00:06",
      desc: "Những cảm xúc khó tả...",
      thumb: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
    },
  ]

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col bg-[#07090e] text-[#f3f6fc] select-none overflow-hidden">
      {/* Top Workspace Section (3 Columns) */}
      <div className="grid h-[58%] grid-cols-12 border-b border-white/[0.08]">
        {/* Left Panel: Scenes & Media (3 cols) */}
        <div className="col-span-3 flex flex-col border-r border-white/[0.08] bg-[#0c1017]">
          {/* Tabs header */}
          <div className="flex items-center justify-between border-b border-white/[0.08] px-3 pt-2">
            <div className="flex gap-4 text-xs font-semibold">
              <button
                onClick={() => setActiveTab("scenes")}
                className={`pb-2 transition-colors relative ${
                  activeTab === "scenes"
                    ? "text-white after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-blue-500"
                    : "text-[#9ca8bc] hover:text-white"
                }`}
              >
                Cảnh
              </button>
              <button
                onClick={() => setActiveTab("media")}
                className={`pb-2 transition-colors relative ${
                  activeTab === "media"
                    ? "text-white after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-blue-500"
                    : "text-[#9ca8bc] hover:text-white"
                }`}
              >
                Media
              </button>
            </div>
            <button className="flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors">
              <span>+ Thêm cảnh</span>
            </button>
          </div>

          {/* Scene list */}
          <div className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-2">
            {scenes.map((s) => (
              <div
                key={s.id}
                onClick={() => setSelectedScene(s.id)}
                className={`group flex items-center gap-2.5 rounded-xl border p-2 transition-all cursor-pointer ${
                  selectedScene === s.id
                    ? "border-blue-500/60 bg-blue-600/10"
                    : "border-white/[0.06] bg-[#121824] hover:border-white/[0.12] hover:bg-white/[0.04]"
                }`}
              >
                <div className="relative size-14 shrink-0 rounded-lg overflow-hidden bg-black/50 border border-white/[0.08]">
                  <img src={s.thumb} alt={s.title} className="size-full object-cover" />
                  <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 text-[9px] font-mono text-white">
                    {s.duration}
                  </span>
                </div>
                <div className="flex flex-1 flex-col min-w-0">
                  <span className="truncate text-xs font-semibold text-[#f3f6fc] group-hover:text-blue-400 transition-colors">
                    {s.num}. {s.title}
                  </span>
                  <span className="truncate text-[10.5px] text-[#64748b] mt-0.5">{s.desc}</span>
                </div>
                <button className="text-[#64748b] hover:text-white p-1">
                  <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Center Panel: Video Player (6 cols) */}
        <div className="col-span-6 flex flex-col bg-[#07090e] p-3">
          {/* Main Video Screen */}
          <div className="relative flex-1 rounded-xl overflow-hidden bg-black flex items-center justify-center border border-white/[0.08] shadow-2xl">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1200&auto=format&fit=crop&q=80"
              alt="Video Scene"
              className="size-full object-cover"
            />

            {/* Live Subtitle Overlay */}
            {subtitlesEnabled && (
              <div
                className={`absolute bottom-8 px-6 text-center transition-all ${
                  alignment === "left"
                    ? "left-8 text-left"
                    : alignment === "right"
                    ? "right-8 text-right"
                    : "inset-x-0 text-center"
                }`}
              >
                <span
                  className="font-bold tracking-wide transition-all"
                  style={{
                    fontSize: `${fontSize * 0.45}px`,
                    color: "#ffffff",
                    textShadow:
                      borderWidth > 0
                        ? `-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 2px 8px rgba(0,0,0,0.8)`
                        : "0 2px 8px rgba(0,0,0,0.8)",
                  }}
                >
                  Cậu... đã quay lại rồi sao?
                </span>
              </div>
            )}
          </div>

          {/* Player Controls Bar */}
          <div className="mt-2.5 flex flex-col gap-1.5 px-2">
            {/* Scrubber bar */}
            <div className="relative h-1.5 w-full rounded-full bg-white/[0.12] cursor-pointer">
              <div className="h-full rounded-full bg-blue-500" style={{ width: "42%" }} />
              <div
                className="absolute top-1/2 -translate-y-1/2 size-3 rounded-full bg-white shadow-md ring-2 ring-blue-500 cursor-pointer"
                style={{ left: "42%" }}
              />
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="font-mono text-[11px] text-[#9ca8bc]">
                <span className="text-white font-semibold">{currentTime}</span> / 00:00:28
              </span>

              {/* Playback action buttons */}
              <div className="flex items-center gap-3">
                <button className="text-[#9ca8bc] hover:text-white transition-colors">
                  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="flex size-8 items-center justify-center rounded-full bg-white text-black hover:scale-105 active:scale-95 transition-all"
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
                <button className="text-[#9ca8bc] hover:text-white transition-colors">
                  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Volume & Aspect Ratio & Fullscreen */}
              <div className="flex items-center gap-2">
                <button className="text-[#9ca8bc] hover:text-white p-1">
                  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M11 5L6 9H2v6h4l5 4V5z" />
                  </svg>
                </button>
                <button className="text-[#9ca8bc] hover:text-white p-1">
                  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </button>
                <select className="h-6 rounded bg-[#121824] px-1.5 text-[10.5px] text-[#9ca8bc] border border-white/[0.08] cursor-pointer">
                  <option>16:9 ▾</option>
                  <option>9:16</option>
                  <option>1:1</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Subtitles & TTS Inspector (3 cols) */}
        <div className="col-span-3 flex flex-col border-l border-white/[0.08] bg-[#0c1017] p-3 overflow-y-auto">
          {/* Inspector Tabs */}
          <div className="flex border-b border-white/[0.08] pb-2 text-xs font-semibold gap-4">
            <button
              onClick={() => setInspectorTab("subtitles")}
              className={`pb-1 transition-colors relative ${
                inspectorTab === "subtitles"
                  ? "text-white after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-blue-500"
                  : "text-[#9ca8bc] hover:text-white"
              }`}
            >
              Phụ đề
            </button>
            <button
              onClick={() => setInspectorTab("tts")}
              className={`pb-1 transition-colors relative ${
                inspectorTab === "tts"
                  ? "text-white after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-blue-500"
                  : "text-[#9ca8bc] hover:text-white"
              }`}
            >
              TTS / Giọng đọc
            </button>
          </div>

          {/* Subtitle Form */}
          <div className="flex flex-col gap-3.5 mt-3">
            {/* Toggle switch */}
            <div className="flex items-center justify-between rounded-lg bg-[#121824] p-2.5 border border-white/[0.06]">
              <div>
                <span className="text-xs font-semibold text-white block">Bật phụ đề</span>
                <span className="text-[10.5px] text-[#64748b]">Hiển thị phụ đề trong video</span>
              </div>
              <button
                onClick={() => setSubtitlesEnabled(!subtitlesEnabled)}
                className={`relative h-5 w-9 rounded-full transition-colors ${
                  subtitlesEnabled ? "bg-blue-600" : "bg-white/[0.15]"
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
              <label className="text-[11px] font-semibold text-[#9ca8bc] mb-1.5 block">Kiểu phụ đề</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: "default", label: "Mặc định", style: "font-bold text-white" },
                  { id: "blur", label: "Nền mờ", style: "bg-black/50 text-white" },
                  { id: "outline", label: "Viền đậm", style: "font-extrabold text-white" },
                  { id: "color", label: "Chữ màu", style: "text-amber-400 font-bold" },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSubtitleStyle(p.id as any)}
                    className={`flex flex-col items-center justify-center rounded-lg border p-1.5 transition-all ${
                      subtitleStyle === p.id
                        ? "border-blue-500 bg-blue-600/15"
                        : "border-white/[0.08] bg-[#121824] hover:border-white/[0.14]"
                    }`}
                  >
                    <span className={`text-xs ${p.style}`}>Aa</span>
                    <span className="text-[9.5px] text-[#9ca8bc] mt-1">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Font selector */}
            <div>
              <label className="text-[11px] font-semibold text-[#9ca8bc] mb-1 block">Font chữ</label>
              <select className="h-8 w-full rounded-lg border border-white/[0.08] bg-[#121824] px-2 text-xs text-white">
                <option>Be Vietnam Pro</option>
                <option>Inter</option>
                <option>Roboto</option>
                <option>Montserrat</option>
              </select>
            </div>

            {/* Font Size slider */}
            <div>
              <div className="flex justify-between text-[11px] font-semibold text-[#9ca8bc] mb-1">
                <span>Cỡ chữ</span>
                <span className="text-white font-mono">{fontSize}</span>
              </div>
              <input
                type="range"
                min="24"
                max="72"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-full h-1.5 bg-white/[0.1] rounded-lg accent-blue-500 cursor-pointer"
              />
            </div>

            {/* Color & Border controls */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-[#9ca8bc] mb-1 block">Màu chữ</label>
                <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-[#121824] p-1.5">
                  <span className="size-4 rounded bg-white border border-white/20" />
                  <span className="text-[11px] text-white">#FFFFFF</span>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#9ca8bc] mb-1 block">Viền chữ</label>
                <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-[#121824] p-1.5">
                  <span className="size-4 rounded bg-black border border-white/20" />
                  <span className="text-[11px] text-white">#000000</span>
                </div>
              </div>
            </div>

            {/* Border Width slider */}
            <div>
              <div className="flex justify-between text-[11px] font-semibold text-[#9ca8bc] mb-1">
                <span>Độ dày viền</span>
                <span className="text-white font-mono">{borderWidth}</span>
              </div>
              <input
                type="range"
                min="0"
                max="8"
                value={borderWidth}
                onChange={(e) => setBorderWidth(Number(e.target.value))}
                className="w-full h-1.5 bg-white/[0.1] rounded-lg accent-blue-500 cursor-pointer"
              />
            </div>

            {/* Alignment */}
            <div>
              <label className="text-[11px] font-semibold text-[#9ca8bc] mb-1 block">Vị trí</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: "left", label: "Dưới trái" },
                  { id: "center", label: "Dưới giữa" },
                  { id: "right", label: "Dưới phải" },
                ].map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setAlignment(a.id as any)}
                    className={`rounded-lg border py-1 text-[10.5px] font-medium transition-all ${
                      alignment === a.id
                        ? "border-blue-500 bg-blue-600 text-white"
                        : "border-white/[0.08] bg-[#121824] text-[#9ca8bc] hover:text-white"
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: NLE Timeline (42%) */}
      <div className="flex flex-1 flex-col bg-[#0c1017]">
        {/* Timeline Toolbar */}
        <div className="flex h-9 items-center justify-between border-b border-white/[0.08] px-4">
          <div className="flex items-center gap-2">
            <button className="text-[#9ca8bc] hover:text-white p-1" title="Hoàn tác">
              <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v2M3 10l6-6m-6 6l6 6" />
              </svg>
            </button>
            <button className="text-[#9ca8bc] hover:text-white p-1" title="Làm lại">
              <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a5 5 0 00-5 5v2m15-7l-6-6m6 6l-6 6" />
              </svg>
            </button>
            <span className="h-4 w-px bg-white/[0.08] mx-1" />
            <button className="flex items-center gap-1 rounded bg-white/[0.05] px-2 py-0.5 text-[11px] text-[#9ca8bc] hover:text-white">
              <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879a3 3 0 11-4.242-4.242L10.757 8.5m1.243 3.5l-2.879-2.879a3 3 0 10-4.242 4.242L7.757 16.5" />
              </svg>
              <span>Cắt</span>
            </button>
            <button className="flex items-center gap-1 rounded bg-white/[0.05] px-2 py-0.5 text-[11px] text-[#9ca8bc] hover:text-white">
              <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Xóa</span>
            </button>
            <button className="flex items-center gap-1 rounded bg-white/[0.05] px-2 py-0.5 text-[11px] text-[#9ca8bc] hover:text-white">
              <span>Chia</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-[11px] text-[#9ca8bc]">
              <span>-</span>
              <input type="range" min="1" max="100" defaultValue="50" className="w-20 h-1 bg-white/[0.1] rounded accent-blue-500" />
              <span>+</span>
            </div>
            <button className="flex items-center gap-1 text-[11px] text-[#9ca8bc] hover:text-white">
              <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              <span>Vừa khung ▾</span>
            </button>
          </div>
        </div>

        {/* Tracks Area */}
        <div className="relative flex-1 overflow-x-auto overflow-y-hidden bg-[#07090e] p-2">
          {/* Time Ruler */}
          <div className="flex items-center border-b border-white/[0.06] pb-1 text-[10px] font-mono text-[#64748b] ml-28">
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
            <div className="size-2.5 -translate-x-[4px] -translate-y-0.5 bg-blue-500 rounded-sm rotate-45" />
          </div>

          <div className="flex flex-col gap-1.5 mt-2">
            {/* Track 1: Visual Beat */}
            <div className="flex items-center h-7 gap-2">
              <div className="w-26 flex items-center gap-1 text-[10.5px] font-semibold text-purple-400">
                <span className="size-1.5 rounded-full bg-purple-400" />
                <span>Visual Beat</span>
              </div>
              <div className="flex-1 h-5 rounded bg-purple-950/20 border border-purple-500/20 relative flex items-center px-2">
                <span className="size-2 rounded-full bg-purple-400 absolute left-8" />
                <span className="size-2 rounded-full bg-purple-400 absolute left-28" />
                <span className="size-2 rounded-full bg-purple-400 absolute left-60" />
                <span className="size-2 rounded-full bg-purple-400 absolute left-96" />
              </div>
            </div>

            {/* Track 2: Video Track */}
            <div className="flex items-center h-12 gap-2">
              <div className="w-26 flex items-center gap-1 text-[10.5px] font-semibold text-blue-400">
                <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>Video</span>
              </div>
              <div className="flex-1 h-11 flex gap-1">
                <div className="w-48 h-full rounded border border-blue-500/40 bg-[#162036] flex items-center overflow-hidden">
                  <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80" className="h-full w-14 object-cover" />
                  <span className="text-[10px] text-blue-200 px-2 truncate">01_thuc_day.mp4</span>
                </div>
                <div className="w-64 h-full rounded border border-blue-500/40 bg-[#162036] flex items-center overflow-hidden">
                  <img src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80" className="h-full w-14 object-cover" />
                  <span className="text-[10px] text-blue-200 px-2 truncate">02_den_truong.mp4</span>
                </div>
                <div className="w-56 h-full rounded border border-blue-500/40 bg-[#162036] flex items-center overflow-hidden">
                  <img src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=100&auto=format&fit=crop&q=80" className="h-full w-14 object-cover" />
                  <span className="text-[10px] text-blue-200 px-2 truncate">03_gap_lai.mp4</span>
                </div>
              </div>
            </div>

            {/* Track 3: TTS / Voice */}
            <div className="flex items-center h-10 gap-2">
              <div className="w-26 flex items-center gap-1 text-[10.5px] font-semibold text-emerald-400">
                <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
                </svg>
                <span>TTS / Voice</span>
              </div>
              <div className="flex-1 h-8 rounded border border-emerald-500/30 bg-emerald-950/25 flex items-center px-2">
                <span className="text-[9.5px] font-mono text-emerald-300 mr-2 shrink-0">
                  Thanh Xuân Trở Lại_TTS.wav
                </span>
                <WaveformVisualizer height={20} barCount={120} activeColor="#10b981" color="rgba(16, 185, 129, 0.3)" progress={0.42} />
              </div>
            </div>

            {/* Track 4: Subtitles */}
            <div className="flex items-center h-8 gap-2">
              <div className="w-26 flex items-center gap-1 text-[10.5px] font-semibold text-amber-400">
                <span className="text-[11px] font-bold">Aa</span>
                <span>Phụ đề</span>
              </div>
              <div className="flex-1 h-7 flex gap-1">
                <div className="w-48 h-full rounded border border-blue-500/30 bg-blue-600/30 flex items-center justify-center text-[10.5px] font-medium text-white truncate px-2">
                  Một ngày mới lại bắt đầu...
                </div>
                <div className="w-56 h-full rounded border border-blue-500/50 bg-blue-600/50 flex items-center justify-center text-[10.5px] font-medium text-white truncate px-2">
                  Cậu... đã quay lại rồi sao?
                </div>
                <div className="w-48 h-full rounded border border-blue-500/30 bg-blue-600/30 flex items-center justify-center text-[10.5px] font-medium text-white truncate px-2">
                  Mọi thứ... đều khác rồi.
                </div>
                <div className="w-44 h-full rounded border border-blue-500/30 bg-blue-600/30 flex items-center justify-center text-[10.5px] font-medium text-white truncate px-2">
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
