import { useState } from "react"
import { WaveformVisualizer } from "@/components/shared/WaveformVisualizer"

interface VoiceItem {
  id: string
  name: string
  gender: "Nam" | "Nữ" | "Custom"
  language: string
  style: string
  avatar?: string
  isNarrator?: boolean
}

export function VoicePage() {
  const [selectedVoice, setSelectedVoice] = useState("v1")
  const [voiceFilter, setVoiceFilter] = useState("all")
  const [speed, setSpeed] = useState(1.0)
  const [pitch, setPitch] = useState(0)
  const [ttsTab, setTtsTab] = useState<"new" | "history">("new")

  const voices: VoiceItem[] = [
    {
      id: "v1",
      name: "Mai - Nữ tự nhiên",
      gender: "Nữ",
      language: "Vietnamese",
      style: "Tự nhiên",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
    },
    {
      id: "v2",
      name: "Minh - Nam trầm",
      gender: "Nam",
      language: "Vietnamese",
      style: "Chín chắn",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
    },
    {
      id: "v3",
      name: "Linh - Nữ trẻ",
      gender: "Nữ",
      language: "Vietnamese",
      style: "Trẻ trung",
      avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80",
    },
    {
      id: "v4",
      name: "Bạch Thanh Hạ",
      gender: "Custom",
      language: "Vietnamese",
      style: "Cinematic",
      avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=120&auto=format&fit=crop&q=80",
    },
    {
      id: "v5",
      name: "Lục Viễn Thu",
      gender: "Custom",
      language: "Vietnamese",
      style: "Trầm ấm",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80",
    },
    {
      id: "v6",
      name: "David - Nam quốc tế",
      gender: "Nam",
      language: "English",
      style: "Chuyên nghiệp",
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&auto=format&fit=crop&q=80",
    },
    {
      id: "v7",
      name: "Emma - Nữ quốc tế",
      gender: "Nữ",
      language: "English",
      style: "Tự nhiên",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80",
    },
    {
      id: "v8",
      name: "Người dẫn chuyện",
      gender: "Nam",
      language: "Vietnamese",
      style: "Thuyết minh",
      isNarrator: true,
    },
  ]

  const currentVoice = voices.find((v) => v.id === selectedVoice) || voices[0]

  return (
    <div className="flex flex-col gap-5 p-5 max-w-[1700px] mx-auto select-none">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Voice</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Khám phá giọng đọc chất lượng cao từ VoiceStudio và nhân vật dự án. Chọn giọng phù hợp để xem trước hoặc tạo giọng đọc (TTS) cho video.
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-6 border-b border-border text-xs font-semibold">
        <button className="border-b-2 border-blue-500 pb-2 text-foreground">Thư viện giọng đọc</button>
        <button className="pb-2 text-muted-foreground hover:text-foreground">Giọng nhân vật</button>
        <button className="pb-2 text-muted-foreground hover:text-foreground">Giọng của tôi</button>
      </div>

      {/* 3-Column Studio Grid */}
      <div className="grid grid-cols-12 gap-5">
        {/* Column 1: Voice Directory (4 cols) */}
        <div className="col-span-4 flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
          {/* Search & Filter */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Tìm kiếm giọng đọc, tên, phong cách..."
                className="h-8 w-full rounded-lg border border-border bg-secondary pl-7 pr-2 text-xs text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none"
              />
              <svg className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <button className="flex items-center gap-1 rounded-lg border border-border bg-secondary px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground">
              <span>Bộ lọc ▾</span>
            </button>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 text-[11px]">
            <button
              onClick={() => setVoiceFilter("all")}
              className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
                voiceFilter === "all" ? "bg-blue-600 text-white" : "bg-secondary text-muted-foreground"
              }`}
            >
              Tất cả (24)
            </button>
            <button
              onClick={() => setVoiceFilter("male")}
              className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
                voiceFilter === "male" ? "bg-blue-600 text-white" : "bg-secondary text-muted-foreground"
              }`}
            >
              Nam (10)
            </button>
            <button
              onClick={() => setVoiceFilter("female")}
              className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
                voiceFilter === "female" ? "bg-blue-600 text-white" : "bg-secondary text-muted-foreground"
              }`}
            >
              Nữ (10)
            </button>
            <button
              onClick={() => setVoiceFilter("custom")}
              className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
                voiceFilter === "custom" ? "bg-blue-600 text-white" : "bg-secondary text-muted-foreground"
              }`}
            >
              Custom Clone (4)
            </button>
          </div>

          {/* Voice Cards List */}
          <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[580px] pr-1">
            {voices.map((v) => {
              const isSelected = selectedVoice === v.id
              return (
                <div
                  key={v.id}
                  onClick={() => setSelectedVoice(v.id)}
                  className={`group flex items-center justify-between rounded-xl border p-2.5 transition-all cursor-pointer ${
                    isSelected
                      ? "border-blue-500 bg-blue-600/15 shadow-sm"
                      : "border-border bg-secondary/50 hover:border-border hover:bg-secondary/80"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {v.isNarrator ? (
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-900/30 text-blue-400">
                        <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                      </div>
                    ) : (
                      <img
                        src={v.avatar}
                        alt={v.name}
                        className="size-10 shrink-0 rounded-lg object-cover border border-border"
                      />
                    )}
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-xs font-bold text-foreground group-hover:text-blue-400">
                          {v.name}
                        </span>
                        <span className="text-blue-400 text-xs">✓</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-[10px]">
                        <span className="rounded bg-indigo-500/20 px-1.5 py-0.2 text-indigo-300">
                          {v.gender}
                        </span>
                        <span className="rounded bg-secondary px-1.5 py-0.2 text-muted-foreground">
                          {v.language}
                        </span>
                        <span className="rounded bg-secondary px-1.5 py-0.2 text-muted-foreground">
                          {v.style}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button className="flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white transition-all">
                    <svg className="size-3 fill-current ml-0.5" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Column 2: Selected Voice Details (4 cols) */}
        <div className="col-span-4 flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-bold text-foreground">Chi tiết giọng đọc</h3>

          {/* Voice Portrait Banner */}
          <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/50 p-3">
            <img
              src={currentVoice.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80"}
              alt={currentVoice.name}
              className="size-16 rounded-xl object-cover border border-border"
            />
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-foreground">{currentVoice.name}</span>
                <span className="text-blue-400 text-xs">✓</span>
              </div>
              <div className="flex flex-wrap gap-1 text-[10.5px]">
                <span className="rounded bg-blue-600/20 px-1.5 py-0.2 text-blue-300 font-semibold">
                  VoiceStudio
                </span>
                <span className="rounded bg-indigo-500/20 px-1.5 py-0.2 text-indigo-300">
                  {currentVoice.gender}
                </span>
                <span className="rounded bg-secondary px-1.5 py-0.2 text-muted-foreground">
                  {currentVoice.language}
                </span>
              </div>
              <div className="flex gap-1 text-[10px] text-muted-foreground mt-0.5">
                <span>Tự nhiên</span> • <span>Trẻ trung</span> • <span>Thân thiện</span>
              </div>
            </div>
          </div>

          <p className="text-[11.5px] text-muted-foreground leading-relaxed">
            Giọng nữ tự nhiên, ấm áp, phù hợp cho thuyết minh, kể chuyện, vlog và nội dung đời sống.
          </p>

          {/* Specs grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-secondary/60 p-2.5 border border-border">
              <span className="text-[10.5px] text-muted-foreground block">Ngôn ngữ</span>
              <span className="text-xs font-semibold text-foreground mt-0.5 block">{currentVoice.language}</span>
            </div>
            <div className="rounded-lg bg-secondary/60 p-2.5 border border-border">
              <span className="text-[10.5px] text-muted-foreground block">Giới tính</span>
              <span className="text-xs font-semibold text-foreground mt-0.5 block">{currentVoice.gender}</span>
            </div>
            <div className="rounded-lg bg-secondary/60 p-2.5 border border-border">
              <span className="text-[10.5px] text-muted-foreground block">Phong cách</span>
              <span className="text-xs font-semibold text-foreground mt-0.5 block">Tự nhiên, thân thiện</span>
            </div>
            <div className="rounded-lg bg-secondary/60 p-2.5 border border-border">
              <span className="text-[10.5px] text-muted-foreground block">Chất lượng</span>
              <span className="text-xs font-semibold text-blue-400 mt-0.5 block">Studio HD</span>
            </div>
          </div>

          {/* Sample audio player */}
          <div className="flex flex-col gap-2 rounded-xl border border-border bg-secondary/40 p-3">
            <div className="flex justify-between items-center text-[11px] font-semibold text-muted-foreground">
              <span>Nghe thử giọng đọc</span>
              <span className="text-[10px] text-muted-foreground">89/500</span>
            </div>
            <p className="text-[11px] text-foreground leading-relaxed italic">
              "Thanh xuân là những tháng ngày rực rỡ nhất, khi chúng ta dám mơ, dám làm và không sợ hãi trước những thử thách của cuộc sống."
            </p>

            <div className="flex items-center gap-2.5 pt-2 border-t border-border mt-1">
              <button className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-md shadow-blue-500/25">
                <svg className="size-3.5 fill-current ml-0.5" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
              <div className="flex-1">
                <WaveformVisualizer height={22} barCount={40} progress={0.35} activeColor="var(--primary)" />
                <div className="flex justify-between text-[10px] text-muted-foreground font-mono mt-0.5">
                  <span>00:00 / 00:08</span>
                  <span>1.0x</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sample phrases */}
          <div className="flex flex-col gap-1.5 text-xs">
            <span className="text-[11px] font-semibold text-muted-foreground">Câu ví dụ khác</span>
            {[
              "Một ngày mới lại bắt đầu, hãy luôn giữ tinh thần tích cực.",
              "Cuộc sống luôn có những cơ hội mới đang chờ chúng ta.",
              "Cảm ơn bạn đã luôn đồng hành cùng VidPool!",
            ].map((phrase, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg bg-secondary/50 p-2 text-[11px] text-muted-foreground hover:text-foreground border border-border/40"
              >
                <span className="truncate mr-2">{phrase}</span>
                <button className="text-blue-400 hover:text-blue-300">
                  <svg className="size-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Column 3: TTS Generator Panel (4 cols) */}
        <div className="col-span-4 flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
          <div>
            <h3 className="text-sm font-bold text-foreground">Tạo giọng đọc (TTS)</h3>
            <p className="text-[11px] text-muted-foreground">
              Nhập nội dung văn bản và chọn giọng đọc để tạo file âm thanh.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex rounded-lg bg-secondary p-1 text-xs font-semibold">
            <button
              onClick={() => setTtsTab("new")}
              className={`flex-1 rounded-md py-1 transition-all ${
                ttsTab === "new" ? "bg-blue-600 text-white" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Tạo mới
            </button>
            <button
              onClick={() => setTtsTab("history")}
              className={`flex-1 rounded-md py-1 transition-all ${
                ttsTab === "history" ? "bg-blue-600 text-white" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Lịch sử (12)
            </button>
          </div>

          {/* Step 1: Chọn giọng đọc */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
              <span className="size-4 rounded-full bg-blue-600/30 text-blue-400 text-[10px] flex items-center justify-center font-bold">
                1
              </span>
              <span>Chọn giọng đọc</span>
            </span>
            <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/50 p-2">
              <div className="flex items-center gap-2">
                <img
                  src={currentVoice.avatar}
                  alt={currentVoice.name}
                  className="size-8 rounded-md object-cover"
                />
                <div>
                  <span className="text-xs font-bold text-foreground block">{currentVoice.name}</span>
                  <span className="text-[10px] text-muted-foreground">Nữ • Vietnamese • Tự nhiên</span>
                </div>
              </div>
              <button className="text-xs text-blue-400 hover:text-blue-300">Thay đổi</button>
            </div>
          </div>

          {/* Step 2: Nhập nội dung */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-[11px] font-semibold text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-4 rounded-full bg-blue-600/30 text-blue-400 text-[10px] flex items-center justify-center font-bold">
                  2
                </span>
                <span>Nhập nội dung</span>
              </span>
              <span className="text-[10px] text-muted-foreground">78/1000</span>
            </div>
            <textarea
              rows={4}
              defaultValue="Một ngày mới lại bắt đầu, hãy luôn giữ tinh thần tích cực và tin tưởng vào hành trình của chính mình."
              className="w-full rounded-lg border border-border bg-secondary p-2.5 text-xs text-foreground leading-relaxed resize-none focus:border-primary focus:outline-none"
            />
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1 rounded bg-secondary px-2 py-1 text-[10.5px] text-foreground hover:bg-secondary/80 border border-border">
                <svg className="size-3 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Gợi ý kịch bản</span>
              </button>
              <button className="flex items-center gap-1 rounded bg-secondary px-2 py-1 text-[10.5px] text-muted-foreground hover:bg-secondary/80 border border-border">
                <svg className="size-3 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Từ các đoạn hội thoại</span>
              </button>
            </div>
          </div>

          {/* Step 3: Tùy chỉnh nâng cao */}
          <div className="flex flex-col gap-2 pt-2 border-t border-border">
            <span className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="size-4 rounded-full bg-blue-600/30 text-blue-400 text-[10px] flex items-center justify-center font-bold">
                  3
                </span>
                <span>Tùy chỉnh nâng cao</span>
              </span>
              <span>▾</span>
            </span>

            <div>
              <div className="flex justify-between text-[10.5px] text-muted-foreground mb-1">
                <span>Tốc độ (Speed)</span>
                <span className="text-foreground font-mono">{speed.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="w-full h-1 bg-secondary rounded accent-blue-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-[10.5px] text-muted-foreground mb-1">
                <span>Cao độ (Pitch)</span>
                <span className="text-foreground font-mono">{pitch}</span>
              </div>
              <input
                type="range"
                min="-10"
                max="10"
                step="1"
                value={pitch}
                onChange={(e) => setPitch(Number(e.target.value))}
                className="w-full h-1 bg-secondary rounded accent-blue-500"
              />
            </div>

            <div>
              <label className="text-[10.5px] text-muted-foreground mb-1 block">Định dạng xuất</label>
              <select className="h-8 w-full rounded-lg border border-border bg-secondary px-2 text-xs text-foreground">
                <option>MP3 (Khuyến nghị)</option>
                <option>WAV (Chất lượng gốc)</option>
                <option>AAC</option>
              </select>
            </div>
          </div>

          {/* Submit Button */}
          <button className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-500/25 hover:bg-blue-500 transition-all">
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            <span>Tạo giọng đọc</span>
          </button>

          <span className="text-center text-[10px] text-muted-foreground">
            Thời gian xử lý ước tính: ~ 10 giây
          </span>
        </div>
      </div>
    </div>
  )
}
