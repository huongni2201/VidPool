import { demoProjects, demoAvatars } from "@/assets/demo"

export type DemoJobType = "video" | "voice" | "subtitle" | "render" | "analysis"

export interface DemoQueueJob {
  id: string
  type: DemoJobType
  title: string
  project: string
  progress: number
  remainingTime?: string
  status: "Đang chạy" | "Đang chờ" | "Thành công" | "Lỗi"
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

export interface DemoWorker {
  name: string
  status: string
  isOk: boolean
  gpu: number
  vram: string
  jobs: string
}

export interface DemoRecentJob {
  id: string
  title: string
  project: string
  percent: number
  time: string
  status: string
  thumb: string
}

export interface DemoHistoryJob {
  name: string
  task: string
  project: string
  time: string
  duration: string
  status: string
}

export const demoHistoryJobs: DemoHistoryJob[] = [
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

export const demoRecentJobs: DemoRecentJob[] = [
  {
    id: "j1",
    title: "Tạo video từ kịch bản",
    project: "Thanh Xuân Trở Lại",
    percent: 78,
    time: "2 phút trước",
    status: "Đang chạy",
    thumb: demoProjects[0],
  },
  {
    id: "j2",
    title: "Phân tích Visual Beat",
    project: "Đường Về Nhà",
    percent: 100,
    time: "12 phút trước",
    status: "Hoàn thành",
    thumb: demoProjects[1],
  },
  {
    id: "j3",
    title: "Tạo phụ đề (TTS)",
    project: "Một Ngày Khác",
    percent: 45,
    time: "28 phút trước",
    status: "Đang xử lý",
    thumb: demoProjects[2],
  },
]

export const demoQueueJobs: DemoQueueJob[] = [
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

export const demoWorkers: DemoWorker[] = [
  { name: "Worker-01", status: "Đang chạy", isOk: true, gpu: 78, vram: "6.2 / 8 GB", jobs: "2/3" },
  { name: "Worker-02", status: "Đang chạy", isOk: true, gpu: 56, vram: "4.1 / 8 GB", jobs: "1/3" },
  { name: "Worker-03", status: "Đang chạy", isOk: true, gpu: 34, vram: "2.8 / 8 GB", jobs: "1/2" },
  { name: "Worker-04", status: "Ngoại tuyến", isOk: false, gpu: 0, vram: "-", jobs: "0/0" },
  { name: "Worker-05", status: "Đang chạy", isOk: true, gpu: 62, vram: "5.0 / 8 GB", jobs: "1/2" },
]
