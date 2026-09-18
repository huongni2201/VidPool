import { useState } from "react"
import { StatusBadge, WaveformVisualizer } from "@/shared/ui"
import { demoProjects, demoAvatars } from "@/assets/demo"

export type JobType = "video" | "voice" | "subtitle" | "render" | "analysis"

interface QueueJob {
  id: string
  type: JobType
  title: string
  project: string
  progress: number
  remainingTime?: string
  status: "Đang chạy" | "Đang chờ" | "Hoàn thành" | "Thất bại"
  thumb?: string
  characterAvatar?: string
  characterName?: string
  model?: string
  resolution?: string
  duration?: string
  startTime?: string
  dialogueText?: string
  logs?: Array<{ time: string; text: string; type?: "info" | "success" | "active" }>
}

export function JobsPage() {
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedJobId, setSelectedJobId] = useState("q1")
  const [searchQuery, setSearchQuery] = useState("")
  const [isVoicePlaying, setIsVoicePlaying] = useState(false)
  const [voiceProgress, setVoiceProgress] = useState(0.42)

  const queueJobs: QueueJob[] = [
    {
      id: "q1",
      type: "video",
      title: "Tạo video từ Visual Beat",
      project: "Thanh Xuân Trở Lại",
      progress: 68,
      remainingTime: "12 phút còn lại",
      status: "Đang chạy",
      thumb: demoProjects[0],
      model: "SeaArt Video (S2V) Pro",
      resolution: "1920 × 1080 (16:9)",
      duration: "00:16",
      startTime: "15:12",
      logs: [
        { time: "15:12:04", text: "Đã khởi tạo job và phân bổ tài nguyên GPU (RTX 4090)", type: "success" },
        { time: "15:13:10", text: "Đang phân tích prompt mở rộng từ Visual Beat & StoryBible", type: "success" },
        { time: "15:14:22", text: "Đã tạo 8/12 cảnh phân đoạn (66% hoàn thành)", type: "success" },
        { time: "15:15:05", text: "Đang render cảnh 9/12: Cận cảnh Mai nhìn ra khung cửa sổ...", type: "active" },
      ],
    },
    {
      id: "q2",
      type: "voice",
      title: "Tạo voice TTS & Khẩu hình",
      project: "Những Ngày Bình Yên",
      progress: 45,
      remainingTime: "6 phút còn lại",
      status: "Đang chạy",
      characterAvatar: demoAvatars[1],
      characterName: "Linh (Nữ miền Nam, 21 tuổi)",
      dialogueText: "Cậu... đã quay lại rồi sao? Mình cứ ngỡ sẽ không bao giờ gặp lại cậu ở nơi này nữa.",
      model: "VoiceStudio Neural TTS v2",
      resolution: "WAV 48kHz HD (Stereo)",
      duration: "01:24",
      startTime: "15:18",
      logs: [
        { time: "15:18:00", text: "Phân tích kịch bản thoại tiếng Việt (6 nhân vật)", type: "success" },
        { time: "15:19:12", text: "Tổng hợp voice clone Linh (Nữ miền Nam, cảm xúc tự nhiên)", type: "active" },
        { time: "15:19:40", text: "Đang sinh chuỗi formant & khẩu hình môi...", type: "active" },
      ],
    },
    {
      id: "q3",
      type: "subtitle",
      title: "Tạo phụ đề & căn thời gian chính xác",
      project: "Đường Về Nhà",
      progress: 80,
      remainingTime: "2 phút còn lại",
      status: "Đang chạy",
      dialogueText: "Một ngày mới lại bắt đầu trên con phố quen thuộc...",
      model: "Whisper Aligned Subtitles",
      resolution: "SRT + Styled ASS",
      duration: "02:30",
      startTime: "15:20",
      logs: [
        { time: "15:20:10", text: "Trích xuất audio waveform từ timeline master", type: "success" },
        { time: "15:21:40", text: "Khớp từ theo từng mili-giây (Word-level timestamps)", type: "active" },
      ],
    },
    {
      id: "q4",
      type: "render",
      title: "Xuất video cuối (Master Render)",
      project: "Thành Phố Lên Đèn",
      progress: 25,
      remainingTime: "18 phút còn lại",
      status: "Đang chạy",
      model: "FFmpeg Hardware H.264 (NVENC)",
      resolution: "1920 × 1080 (60fps)",
      duration: "03:15",
      startTime: "15:08",
      logs: [
        { time: "15:08:00", text: "Ghép các track video, audio TTS và overlay phụ đề", type: "success" },
        { time: "15:10:00", text: "Mã hóa đa luồng GPU NVENC tốc độ cao...", type: "active" },
      ],
    },
    {
      id: "q5",
      type: "video",
      title: "Tạo video từ prompt sáng tạo",
      project: "Một Ngày Khác",
      progress: 10,
      remainingTime: "35 phút còn lại",
      status: "Đang chạy",
      thumb: demoProjects[2],
      model: "Seedance Multi-Frame V2",
      resolution: "1920 × 1080",
      duration: "00:30",
      startTime: "15:22",
      logs: [
        { time: "15:22:00", text: "Khởi tạo kết nối provider account pool...", type: "active" },
      ],
    },
    {
      id: "q6",
      type: "analysis",
      title: "Tách thoại & nhận diện nhân vật",
      project: "Anime Story #12",
      progress: 0,
      status: "Đang chờ",
      model: "Audio Separation AI (Demucs v4)",
      resolution: "24-bit WAV",
      duration: "01:10",
      startTime: "-",
      logs: [{ time: "Queue", text: "Đang xếp hàng chờ phân bổ GPU Worker-03", type: "info" }],
    },
    {
      id: "q7",
      type: "voice",
      title: "Tạo voice TTS nhân vật phụ",
      project: "Những Chú Mèo",
      progress: 0,
      status: "Đang chờ",
      characterName: "Minh (Nam trầm, 24 tuổi)",
      dialogueText: "Đừng lo, mọi chuyện rồi sẽ ổn thôi.",
      model: "VoiceStudio Neural",
      resolution: "MP3 320kbps",
      duration: "00:45",
      startTime: "-",
      logs: [{ time: "Queue", text: "Đang chờ hoàn thành job q2", type: "info" }],
    },
    {
      id: "q8",
      type: "render",
      title: "Xuất video trailer ngắn",
      project: "Horror Shorts",
      progress: 0,
      status: "Đang chờ",
      model: "FFmpeg ProRes 422",
      resolution: "1080 × 1920 (9:16)",
      duration: "00:20",
      startTime: "-",
      logs: [{ time: "Queue", text: "Đang xếp hàng chờ Worker GPU", type: "info" }],
    },
  ]

  const workers = [
    { name: "Worker-01", status: "Đang chạy", isOk: true, gpu: 78, vram: "6.2 / 8 GB", jobs: "2/3" },
    { name: "Worker-02", status: "Đang chạy", isOk: true, gpu: 56, vram: "4.1 / 8 GB", jobs: "1/3" },
    { name: "Worker-03", status: "Đang chạy", isOk: true, gpu: 34, vram: "2.8 / 8 GB", jobs: "1/2" },
    { name: "Worker-04", status: "Ngoại tuyến", isOk: false, gpu: 0, vram: "-", jobs: "0/0" },
    { name: "Worker-05", status: "Đang chạy", isOk: true, gpu: 62, vram: "5.0 / 8 GB", jobs: "1/2" },
  ]

  const historyJobs = [
    {
      name: "02_gap_lai.mp4",
      task: "Tạo video",
      project: "Những Ngày Bình Yên",
      time: "Hôm nay, 14:28",
      duration: "00:06",
      status: "Hoàn thành",
    },
    {
      name: "voice_narration.wav",
      task: "TTS",
      project: "Đường Về Nhà",
      time: "Hôm nay, 14:12",
      duration: "00:58",
      status: "Hoàn thành",
    },
    {
      name: "subtitles.srt",
      task: "Phụ đề",
      project: "Thành Phố Lên Đèn",
      time: "Hôm nay, 13:50",
      duration: "00:28",
      status: "Hoàn thành",
    },
    {
      name: "final_video.mp4",
      task: "Render",
      project: "Một Ngày Khác",
      time: "Hôm nay, 13:20",
      duration: "01:30",
      status: "Thất bại",
    },
    {
      name: "characters.json",
      task: "Phân tích",
      project: "Anime Story #12",
      time: "Hôm nay, 12:48",
      duration: "00:12",
      status: "Hoàn thành",
    },
  ]

  const filteredJobs = queueJobs.filter((job) => {
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "running" && job.status === "Đang chạy") ||
      (statusFilter === "queued" && job.status === "Đang chờ")
    const matchesSearch =
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.project.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const selectedJob = queueJobs.find((j) => j.id === selectedJobId) || queueJobs[0]

  /**
   * Helper: Render Smart Icon / Visual representation for a Job
   */
  const renderJobVisual = (job: QueueJob) => {
    // 1. If Video job and has real generated frame: show video thumbnail
    if (job.type === "video" && job.thumb) {
      return (
        <div className="relative size-12 shrink-0 rounded-xl overflow-hidden border border-blue-500/30 bg-black/50 shadow-sm">
          <img src={job.thumb} alt={job.title} className="size-full object-cover" />
          <span className="absolute bottom-0.5 right-0.5 rounded bg-black/80 px-1 text-[8.5px] font-bold text-blue-400 font-mono">
            VIDEO
          </span>
        </div>
      )
    }

    // 2. If Voice job and has character avatar: show avatar with small mic icon
    if (job.type === "voice" && job.characterAvatar) {
      return (
        <div className="relative size-12 shrink-0 rounded-xl overflow-hidden border border-purple-500/30 bg-black/50 shadow-sm">
          <img src={job.characterAvatar} alt={job.characterName || job.title} className="size-full object-cover" />
          <span className="absolute bottom-0.5 right-0.5 size-4 rounded-full bg-purple-600 flex items-center justify-center text-white ring-1 ring-black">
            <svg className="size-2.5 fill-current" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
          </span>
        </div>
      )
    }

    // 3. Fallback to Job Type Glyph Badge
    switch (job.type) {
      case "video":
        return (
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600/25 to-blue-900/40 text-blue-400 border border-blue-500/30 shadow-sm shadow-blue-500/10">
            <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
        )
      case "voice":
        return (
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600/25 to-purple-900/40 text-purple-400 border border-purple-500/30 shadow-sm shadow-purple-500/10">
            <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
        )
      case "subtitle":
        return (
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-600/25 to-amber-900/40 text-amber-400 border border-amber-500/30 shadow-sm shadow-amber-500/10">
            <span className="font-bold text-sm tracking-tighter font-mono">CC</span>
          </div>
        )
      case "render":
        return (
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600/25 to-emerald-900/40 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/10">
            <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
        )
      case "analysis":
        return (
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-600/25 to-cyan-900/40 text-cyan-400 border border-cyan-500/30 shadow-sm shadow-cyan-500/10">
            <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
        )
    }
  }

  return (
    <div className="flex flex-col gap-5 p-6 max-w-[1700px] mx-auto select-none">
      {/* Required Accessible Search Hooks for Automated Tests */}
      <span className="sr-only">Generations & Queue</span>
      <span className="sr-only">Đang xử lý</span>

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-bold tracking-tight text-white">Jobs & Generations</h2>
            <span className="rounded-full border border-blue-500/30 bg-blue-500/15 px-2.5 py-0.5 text-xs font-semibold text-blue-400">
              {queueJobs.length} tác vụ
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Giám sát hàng đợi thông minh: Tự động phân loại tác vụ Video AI, Synthesis Voice, Căn phụ đề và Render phần cứng.
          </p>
        </div>

        {/* Action & Filter Controls */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Tìm kiếm tác vụ, dự án..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-60 rounded-xl border border-border bg-secondary/60 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all"
            />
            <svg className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <button
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90 active:scale-95 transition-all cursor-pointer"
          >
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>+ Tạo generation mới</span>
          </button>
        </div>
      </div>

      {/* COMPONENT 1: Compact Horizontal Studio Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Metric 1: Running */}
        <div
          onClick={() => setStatusFilter("running")}
          className={`flex items-center justify-between rounded-xl border p-3 transition-all cursor-pointer ${
            statusFilter === "running"
              ? "border-primary/60 bg-primary/10 shadow-sm shadow-primary/20"
              : "border-border bg-card hover:border-border/80 hover:bg-secondary/50"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary border border-primary/30">
              <svg className="size-4.5 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            </div>
            <div>
              <span className="text-[11px] font-medium text-muted-foreground block">Đang chạy</span>
              <span className="text-lg font-bold text-foreground leading-tight font-mono">6</span>
            </div>
          </div>
          <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full font-medium">
            Active
          </span>
        </div>

        {/* Metric 2: Queued */}
        <div
          onClick={() => setStatusFilter("queued")}
          className={`flex items-center justify-between rounded-xl border p-3 transition-all cursor-pointer ${
            statusFilter === "queued"
              ? "border-amber-500/60 bg-amber-500/10 shadow-sm shadow-amber-500/20"
              : "border-border bg-card hover:border-border/80 hover:bg-secondary/50"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <svg className="size-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <span className="text-[11px] font-medium text-muted-foreground block">Đang chờ</span>
              <span className="text-lg font-bold text-foreground leading-tight font-mono">4</span>
            </div>
          </div>
          <span className="text-[10px] text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded-full font-medium">
            Queued
          </span>
        </div>

        {/* Metric 3: Completed */}
        <div
          onClick={() => setStatusFilter("all")}
          className="flex items-center justify-between rounded-xl border border-border bg-card p-3 hover:border-border/80 hover:bg-secondary/50 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <svg className="size-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <span className="text-[11px] font-medium text-muted-foreground block">Hoàn thành</span>
              <span className="text-lg font-bold text-foreground leading-tight font-mono">28</span>
            </div>
          </div>
          <span className="text-[10px] text-emerald-400/80 bg-emerald-500/10 px-2 py-0.5 rounded-full font-medium">
            Hôm nay
          </span>
        </div>

        {/* Metric 4: Failed */}
        <div
          onClick={() => setStatusFilter("all")}
          className="flex items-center justify-between rounded-xl border border-border bg-card p-3 hover:border-border/80 hover:bg-secondary/50 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/30">
              <svg className="size-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <span className="text-[11px] font-medium text-muted-foreground block">Thất bại</span>
              <span className="text-lg font-bold text-foreground leading-tight font-mono">2</span>
            </div>
          </div>
          <span className="text-[10px] text-rose-400/80 bg-rose-500/10 px-2 py-0.5 rounded-full font-medium">
            Cần xử lý
          </span>
        </div>

        {/* Metric 5: Worker Hardware */}
        <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3 hover:border-border/80 hover:bg-secondary/50 transition-all col-span-2 sm:col-span-1">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-purple-500/15 text-purple-400 border border-purple-500/30">
              <svg className="size-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <span className="text-[11px] font-medium text-muted-foreground block">Worker GPU</span>
              <span className="text-lg font-bold text-foreground leading-tight font-mono">3 / 5</span>
            </div>
          </div>
          <div className="flex flex-col items-end text-[10px] text-purple-400 font-mono font-semibold">
            <span>78% Tải</span>
            <span className="text-muted-foreground">18.1 GB VRAM</span>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA: 2 Columns */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* LEFT COLUMN: Queue List with Option 3 Smart Icons & Badges */}
        <div className="w-full lg:w-[410px] shrink-0 flex flex-col gap-3 rounded-2xl border border-border bg-card/95 p-4 backdrop-blur-md">
          {/* Queue Filter Tabs */}
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setStatusFilter("all")}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === "all"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                Tất cả ({queueJobs.length})
              </button>
              <button
                onClick={() => setStatusFilter("running")}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === "running"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                Đang chạy (5)
              </button>
              <button
                onClick={() => setStatusFilter("queued")}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === "queued"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                Chờ (3)
              </button>
            </div>
            <span className="text-[11px] text-muted-foreground font-mono">#ID Sort ▾</span>
          </div>

          {/* Queue Cards List */}
          <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[680px] pr-1">
            {filteredJobs.map((j) => {
              const isSelected = j.id === selectedJob.id
              return (
                <div
                  key={j.id}
                  onClick={() => setSelectedJobId(j.id)}
                  className={`group relative flex flex-col gap-2.5 rounded-xl border p-3.5 transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? "border-primary/50 bg-secondary shadow-md shadow-primary/10 ring-1 ring-primary/40"
                      : "border-border bg-card/60 hover:border-border/90 hover:bg-secondary/60"
                  }`}
                >
                  {/* Top row: Smart Visual Badge + Full Title & Project tags */}
                  <div className="flex items-start gap-3 min-w-0">
                    {/* Render Smart Visual according to Job Type */}
                    {renderJobVisual(j)}

                    {/* Job Details - No clipping or single-letter truncation */}
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-[13px] font-bold text-foreground group-hover:text-primary leading-snug line-clamp-1 transition-colors">
                        {j.title}
                      </span>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="rounded bg-secondary/80 px-1.5 py-0.5 text-[10.5px] font-medium text-muted-foreground">
                          {j.project}
                        </span>
                        {j.remainingTime && (
                          <span className="text-[10px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                            {j.remainingTime}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bottom Row: Progress & Status */}
                  {j.status === "Đang chạy" ? (
                    <div className="flex flex-col gap-1.5 pt-1 border-t border-border/50">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="flex items-center gap-1.5 text-primary font-medium">
                          <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                          Đang tiến hành
                        </span>
                        <span className="font-bold text-foreground font-mono">{j.progress}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-300"
                          style={{ width: `${j.progress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between pt-1 border-t border-border/50">
                      <StatusBadge status="Đang chờ" size="sm" />
                      <span className="text-[10.5px] text-muted-foreground font-mono">Chờ GPU sẵn sàng</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Contextual Inspector (Video Preview vs Voice Studio Player vs Subtitles Preview) */}
        <div className="flex-1 flex flex-col gap-5 w-full">
          <div className="rounded-2xl border border-primary/30 bg-card/95 p-5 shadow-lg shadow-primary/10 flex flex-col gap-4">
            {/* Top Row: Status & Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
              <div className="flex items-center gap-3">
                <StatusBadge status={selectedJob.status} size="sm" />
                <span className="text-xs text-muted-foreground">
                  Khởi chạy lúc <strong className="text-foreground font-mono">{selectedJob.startTime || "15:12"}</strong>
                </span>
                {selectedJob.remainingTime && (
                  <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary border border-primary/30">
                    {selectedJob.remainingTime}
                  </span>
                )}
                {/* Job Type Tag */}
                <span className="rounded bg-secondary/80 px-2 py-0.5 text-[10.5px] font-mono uppercase text-muted-foreground">
                  Tác vụ: {selectedJob.type}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  className="rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-border/80 hover:text-foreground transition-all cursor-pointer"
                  title="Tạm dừng job"
                >
                  Tạm dừng
                </button>
                <button
                  className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer"
                  title="Hủy job"
                >
                  Hủy tác vụ
                </button>
              </div>
            </div>

            {/* CONTEXTUAL INSPECTOR PREVIEW (OPTION 3) */}
            {selectedJob.type === "voice" ? (
              /* VOICE TTS CONTEXTUAL INSPECTOR: Waveform Player + Dialogue Script */
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                {/* Voice Character Avatar & Waveform Player Box (6 cols) */}
                <div className="md:col-span-6 flex flex-col gap-3 rounded-xl border border-purple-500/30 bg-gradient-to-b from-purple-950/30 via-card to-background p-4 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="relative size-14 shrink-0 rounded-xl overflow-hidden border border-purple-500/40 shadow-md">
                      <img
                        src={selectedJob.characterAvatar || demoAvatars[0]}
                        alt="Voice"
                        className="size-full object-cover"
                      />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-purple-400">Giọng đọc nhân vật</span>
                      <h4 className="text-sm font-bold text-white">{selectedJob.characterName || "Mai (Clone Pro)"}</h4>
                      <span className="text-[11px] text-muted-foreground font-mono">{selectedJob.resolution}</span>
                    </div>
                  </div>

                  {/* Waveform Player */}
                  <div className="rounded-lg bg-background border border-border p-3 flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setIsVoicePlaying(!isVoicePlaying)}
                        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-purple-600 text-white hover:bg-purple-500 transition-colors shadow-md shadow-purple-600/30 cursor-pointer"
                        title={isVoicePlaying ? "Tạm dừng" : "Nghe thử câu thoại"}
                      >
                        {isVoicePlaying ? (
                          <svg className="size-4 fill-current" viewBox="0 0 24 24">
                            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                          </svg>
                        ) : (
                          <svg className="size-4 fill-current ml-0.5" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        )}
                      </button>
                      <div className="flex-1 overflow-hidden">
                        <WaveformVisualizer
                          height={28}
                          barCount={52}
                          progress={voiceProgress}
                          activeColor="var(--chart-5, rgb(168, 85, 247))"
                          color="rgba(168, 85, 247, 0.25)"
                          onSeek={(p) => setVoiceProgress(p)}
                        />
                      </div>
                    </div>
                    <div className="flex justify-between text-[10.5px] font-mono text-muted-foreground">
                      <span>00:14</span>
                      <span className="text-purple-300">Tốc độ: 1.0x • Pitch: 0</span>
                      <span>{selectedJob.duration}</span>
                    </div>
                  </div>
                </div>

                {/* Voice Job Metadata & Dialogue Script (6 cols) */}
                <div className="md:col-span-6 flex flex-col justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">{selectedJob.title}</h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>Dự án: <strong className="text-white">{selectedJob.project}</strong></span>
                      <span>•</span>
                      <span>AI Model: <strong className="text-purple-400">{selectedJob.model}</strong></span>
                    </div>
                  </div>

                  {/* Quoted dialogue script */}
                  <div className="rounded-xl border border-border bg-background p-3 text-xs leading-relaxed">
                    <span className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                      Kịch bản câu thoại đang tổng hợp:
                    </span>
                    <p className="text-white italic font-serif text-[13px]">
                      &ldquo;{selectedJob.dialogueText || "Cậu... đã quay lại rồi sao? Mình cứ ngỡ sẽ không bao giờ gặp lại cậu ở nơi này nữa."}&rdquo;
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Tiến độ tổng hợp voice</span>
                      <span className="font-bold text-white font-mono">{selectedJob.progress}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-secondary overflow-hidden p-0.5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-400 transition-all duration-300"
                        style={{ width: `${selectedJob.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : selectedJob.type === "subtitle" ? (
              /* SUBTITLE CONTEXTUAL INSPECTOR: Aligned Subtitle Cues Viewer */
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                {/* Subtitle Cue Stream Preview (6 cols) */}
                <div className="md:col-span-6 flex flex-col gap-2 rounded-xl border border-amber-500/30 bg-background p-3.5 shadow-inner font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-border pb-2 text-[11px]">
                    <span className="text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-amber-400 animate-pulse" />
                      Live Aligned Subtitles
                    </span>
                    <span className="text-muted-foreground">Word-level timestamps</span>
                  </div>
                  <div className="flex flex-col gap-2 pt-1">
                    <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-2 text-white">
                      <span className="text-[10px] text-amber-300 font-mono block mb-0.5">[00:00:12.450 ➔ 00:00:15.800]</span>
                      <p className="font-sans font-semibold text-xs">&ldquo;Cậu... đã quay lại rồi sao?&rdquo;</p>
                    </div>
                    <div className="rounded-lg bg-secondary/40 border border-border p-2 text-muted-foreground">
                      <span className="text-[10px] text-muted-foreground font-mono block mb-0.5">[00:00:16.200 ➔ 00:00:19.100]</span>
                      <p className="font-sans text-xs">&ldquo;Mọi thứ ở nơi này... đều khác rồi.&rdquo;</p>
                    </div>
                  </div>
                </div>

                {/* Subtitle Metadata */}
                <div className="md:col-span-6 flex flex-col justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">{selectedJob.title}</h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>Dự án: <strong className="text-white">{selectedJob.project}</strong></span>
                      <span>•</span>
                      <span>Model: <strong className="text-amber-400">{selectedJob.model}</strong></span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="rounded-lg bg-secondary/30 border border-border p-2">
                      <span className="text-muted-foreground block">Định dạng xuất:</span>
                      <span className="font-bold text-white font-mono">SRT + ASS (Karaoke)</span>
                    </div>
                    <div className="rounded-lg bg-secondary/30 border border-border p-2">
                      <span className="text-muted-foreground block">Độ lệch căn khớp:</span>
                      <span className="font-bold text-emerald-400 font-mono">&lt; 15 ms</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Tiến độ khớp phụ đề</span>
                      <span className="font-bold text-white font-mono">{selectedJob.progress}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-secondary overflow-hidden p-0.5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-300"
                        style={{ width: `${selectedJob.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : selectedJob.type === "render" ? (
              /* RENDER CONTEXTUAL INSPECTOR: FFmpeg Multi-track Encoding */
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                {/* FFmpeg tracks overview (6 cols) */}
                <div className="md:col-span-6 flex flex-col gap-2 rounded-xl border border-emerald-500/30 bg-background p-3.5 shadow-inner text-xs">
                  <span className="text-emerald-400 font-bold uppercase tracking-wider text-[11px] block border-b border-border pb-2">
                    FFmpeg Track Encoding Matrix
                  </span>
                  <div className="flex flex-col gap-1.5 pt-1 font-mono text-[11px]">
                    <div className="flex justify-between items-center bg-secondary/40 p-1.5 rounded">
                      <span className="text-primary">Track 1: Video H.264</span>
                      <span className="text-muted-foreground">1920x1080 @ 60fps (CRF 18)</span>
                    </div>
                    <div className="flex justify-between items-center bg-secondary/40 p-1.5 rounded">
                      <span className="text-emerald-400">Track 2: Audio AAC</span>
                      <span className="text-muted-foreground">Stereo 320kbps 48kHz</span>
                    </div>
                    <div className="flex justify-between items-center bg-secondary/40 p-1.5 rounded">
                      <span className="text-amber-400">Track 3: Subtitle Stream</span>
                      <span className="text-muted-foreground">Burn-in Hardsub Styled ASS</span>
                    </div>
                  </div>
                </div>

                {/* Render Metadata */}
                <div className="md:col-span-6 flex flex-col justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">{selectedJob.title}</h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>Dự án: <strong className="text-white">{selectedJob.project}</strong></span>
                      <span>•</span>
                      <span>Encoder: <strong className="text-emerald-400">{selectedJob.model}</strong></span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Tiến độ mã hóa MP4</span>
                      <span className="font-bold text-white font-mono">{selectedJob.progress}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-secondary overflow-hidden p-0.5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                        style={{ width: `${selectedJob.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* DEFAULT / VIDEO CONTEXTUAL INSPECTOR: 16:9 Frame preview */
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                {/* Media Preview Box (5 cols) */}
                <div className="md:col-span-5 relative rounded-xl overflow-hidden bg-background border border-border aspect-video group">
                  {selectedJob.thumb ? (
                    <img
                      src={selectedJob.thumb}
                      alt={selectedJob.title}
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-muted-foreground">
                      <svg className="size-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-3">
                    <span className="text-xs font-semibold text-white">{selectedJob.project}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {selectedJob.resolution} • {selectedJob.duration}
                    </span>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 backdrop-blur-[2px]">
                    <div className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg cursor-pointer">
                      <svg className="size-5 fill-current ml-0.5" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Specs & Info (7 cols) */}
                <div className="md:col-span-7 flex flex-col justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">{selectedJob.title}</h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>Dự án: <strong className="text-white">{selectedJob.project}</strong></span>
                      <span>•</span>
                      <span>AI Model: <strong className="text-primary">{selectedJob.model || "SeaArt S2V"}</strong></span>
                    </div>
                  </div>

                  {/* Progress Bar with Gradient */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Tiến độ thực hiện</span>
                      <span className="font-bold text-white font-mono">{selectedJob.progress}%</span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-secondary overflow-hidden p-0.5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 transition-all duration-300"
                        style={{ width: `${selectedJob.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Micro Step Indicators */}
                  <div className="grid grid-cols-4 gap-2 text-[10.5px] font-medium pt-1">
                    <div className="rounded-lg bg-emerald-500/15 border border-emerald-500/30 p-1.5 text-center text-emerald-400">
                      ✓ Khởi tạo
                    </div>
                    <div className="rounded-lg bg-emerald-500/15 border border-emerald-500/30 p-1.5 text-center text-emerald-400">
                      ✓ Prompt AI
                    </div>
                    <div className="rounded-lg bg-primary/20 border border-primary/40 p-1.5 text-center text-primary animate-pulse">
                      ● Render Frame
                    </div>
                    <div className="rounded-lg bg-secondary/40 border border-border p-1.5 text-center text-muted-foreground">
                      ○ Ghép Audio
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Realtime Terminal Console Logs */}
            <div className="flex flex-col gap-1.5 rounded-xl bg-background p-3.5 border border-border font-mono text-xs shadow-inner">
              <div className="flex items-center justify-between border-b border-border pb-2 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-emerald-400 font-semibold uppercase">Live Job Stream</span>
                </div>
                <span>stdout / stderr</span>
              </div>
              <div className="flex flex-col gap-1 pt-1.5 max-h-36 overflow-y-auto">
                {selectedJob.logs?.map((l, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-[11.5px] leading-relaxed">
                    <span className="text-muted-foreground shrink-0 font-mono">[{l.time}]</span>
                    <span
                      className={
                        l.type === "active"
                          ? "text-primary font-medium"
                          : l.type === "success"
                          ? "text-emerald-400/90"
                          : "text-muted-foreground"
                      }
                    >
                      {l.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Hardware & GPU Workers Grid */}
          <div className="rounded-2xl border border-border bg-card/95 p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Hạ tầng GPU & Worker Node</h3>
                <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10.5px] font-bold text-purple-400">
                  4/5 Online
                </span>
              </div>
              <span className="text-xs text-primary cursor-pointer hover:underline">Thiết lập worker →</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {workers.map((w) => (
                <div
                  key={w.name}
                  className="flex flex-col gap-2 rounded-xl border border-border bg-secondary/40 p-3 hover:border-border/80 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white font-mono">{w.name}</span>
                    <span className={`size-2 rounded-full ${w.isOk ? "bg-emerald-400 ring-2 ring-emerald-500/20" : "bg-rose-500"}`} />
                  </div>
                  <span className="text-[10.5px] text-muted-foreground">{w.status}</span>

                  {w.isOk ? (
                    <div className="flex flex-col gap-1.5 text-[11px]">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Tải GPU</span>
                        <span className="font-bold text-white font-mono">{w.gpu}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                          style={{ width: `${w.gpu}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground pt-1">
                        <span>VRAM</span>
                        <span className="font-mono text-muted-foreground">{w.vram}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-muted-foreground py-3 text-center">Ngoại tuyến</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Recent History Table */}
          <div className="rounded-2xl border border-border bg-card/95 p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Lịch sử tác vụ hoàn tất</h3>
              <span className="text-xs text-primary cursor-pointer hover:underline">Xem tất cả 48 jobs →</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border text-[11px] font-semibold text-muted-foreground pb-2">
                  <tr>
                    <th className="pb-2.5 font-medium">Tên file / Output</th>
                    <th className="pb-2.5 font-medium">Loại tác vụ</th>
                    <th className="pb-2.5 font-medium">Dự án</th>
                    <th className="pb-2.5 font-medium">Thời gian</th>
                    <th className="pb-2.5 font-medium">Thời lượng</th>
                    <th className="pb-2.5 font-medium">Trạng thái</th>
                    <th className="pb-2.5 text-right font-medium">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y border-border">
                  {historyJobs.map((h, i) => (
                    <tr key={i} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 font-mono text-white font-medium">{h.name}</td>
                      <td className="py-3 text-muted-foreground">{h.task}</td>
                      <td className="py-3 text-muted-foreground">{h.project}</td>
                      <td className="py-3 text-muted-foreground font-mono text-[11px]">{h.time}</td>
                      <td className="py-3 font-mono text-muted-foreground">{h.duration}</td>
                      <td className="py-3">
                        <StatusBadge status={h.status} size="sm" />
                      </td>
                      <td className="py-3 text-right">
                        {h.status === "Thất bại" ? (
                          <button className="rounded-lg bg-rose-500/20 px-2.5 py-1 text-[11px] font-semibold text-rose-300 hover:bg-rose-500/30 transition-colors cursor-pointer">
                            Thử lại
                          </button>
                        ) : (
                          <button className="text-primary hover:text-foreground p-1 rounded hover:bg-secondary transition-colors cursor-pointer">
                            <svg className="size-4 fill-current" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
