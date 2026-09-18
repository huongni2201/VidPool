import { demoProjects } from "@/assets/demo"

export interface DemoProjectItem {
  id: string
  title: string
  status: "Đã hoàn thành" | "Đang xử lý" | "Tạm dừng" | "Có lỗi"
  progressText?: string
  progressPercent?: number
  duration: string
  aspectRatio: "16:9" | "9:16" | "1:1"
  scenes: number
  characters: number
  updated: string
  tags: string[]
  cover: string
}

export const demoProjectsList: DemoProjectItem[] = [
  {
    id: "p1",
    title: "Thanh Xuân Trở Lại",
    status: "Đã hoàn thành",
    duration: "00:02:28",
    aspectRatio: "16:9",
    scenes: 12,
    characters: 3,
    updated: "Cập nhật 2 giờ trước",
    tags: ["Drama", "Thanh xuân", "Cảm xúc"],
    cover: demoProjects[0],
  },
  {
    id: "p2",
    title: "Hồi Ức Mùa Hạ",
    status: "Đang xử lý",
    progressText: "Xuất video...",
    progressPercent: 68,
    duration: "00:03:15",
    aspectRatio: "9:16",
    scenes: 18,
    characters: 2,
    updated: "Cập nhật 1 giờ trước",
    tags: ["Tình cảm", "Mùa hè", "Cinematic"],
    cover: demoProjects[1],
  },
  {
    id: "p3",
    title: "Một Ngày Bình Thường",
    status: "Tạm dừng",
    duration: "00:01:30",
    aspectRatio: "16:9",
    scenes: 10,
    characters: 2,
    updated: "Cập nhật 1 ngày trước",
    tags: ["Đời sống", "Minimal", "Vlog"],
    cover: demoProjects[2],
  },
  {
    id: "p4",
    title: "Những Chú Mèo",
    status: "Đã hoàn thành",
    duration: "00:00:58",
    aspectRatio: "1:1",
    scenes: 6,
    characters: 1,
    updated: "Cập nhật 2 ngày trước",
    tags: ["Động vật", "Đời sống", "Cute"],
    cover: demoProjects[3],
  },
  {
    id: "p5",
    title: "Anime Story #12",
    status: "Đang xử lý",
    progressText: "Tạo cảnh với AI...",
    progressPercent: 33,
    duration: "00:02:06",
    aspectRatio: "16:9",
    scenes: 14,
    characters: 2,
    updated: "Cập nhật 3 giờ trước",
    tags: ["Anime", "Story", "Fantasy"],
    cover: demoProjects[0],
  },
  {
    id: "p6",
    title: "Horror Shorts",
    status: "Có lỗi",
    duration: "00:01:42",
    aspectRatio: "9:16",
    scenes: 8,
    characters: 1,
    updated: "Cập nhật 5 giờ trước",
    tags: ["Horror", "Bí ẩn", "Dark"],
    cover: demoProjects[1],
  },
  {
    id: "p7",
    title: "Thành Phố Lúc Hoàng Hôn",
    status: "Đã hoàn thành",
    duration: "00:03:20",
    aspectRatio: "16:9",
    scenes: 20,
    characters: 3,
    updated: "Cập nhật 1 ngày trước",
    tags: ["Cinematic", "Thành phố", "Tâm trạng"],
    cover: demoProjects[2],
  },
  {
    id: "p8",
    title: "Lofi Chill Mix",
    status: "Tạm dừng",
    duration: "00:01:18",
    aspectRatio: "1:1",
    scenes: 8,
    characters: 1,
    updated: "Cập nhật 2 ngày trước",
    tags: ["Lofi", "Music", "Chill"],
    cover: demoProjects[3],
  },
  {
    id: "p9",
    title: "Dưới Cơn Mưa",
    status: "Đang xử lý",
    progressText: "Phân tích kịch bản...",
    progressPercent: 12,
    duration: "00:02:45",
    aspectRatio: "16:9",
    scenes: 16,
    characters: 2,
    updated: "Cập nhật 4 giờ trước",
    tags: ["Tình cảm", "Mưa", "Tâm trạng"],
    cover: demoProjects[0],
  },
]
