import type {
  Chapter,
  AnalyzedScene,
  AnalysisSettings,
  AnalysisResult,
  AnalysisProgressStep,
} from "../model/types"

export const INITIAL_CHAPTERS: Chapter[] = [
  {
    id: "chap-01",
    projectId: "proj-default",
    order: 1,
    title: "Khởi đầu hành trình",
    summary: "Gặp gỡ sư phụ và nhận kiếm cổ tại chân núi...",
    sourceText: "Tiêu Viêm rời khỏi gia tộc, bắt đầu bước chân vào hành trình tu luyện đầy gian nan...",
    status: "analyzed",
    stats: {
      wordCount: 850,
      sceneCount: 3,
      visualBeatCount: 8,
    },
    updatedAt: "2 giờ trước",
  },
  {
    id: "chap-02",
    projectId: "proj-default",
    order: 2,
    title: "Rừng sương mù",
    summary: "Vượt qua cạm bẫy và chạm trán bầy quái...",
    sourceText: "Sương mù dày đặc bao phủ toàn bộ khu rừng bí ẩn, mỗi bước chân đều ẩn chứa nguy hiểm khôn lường...",
    status: "analyzed",
    stats: {
      wordCount: 1620,
      sceneCount: 5,
      visualBeatCount: 15,
    },
    updatedAt: "Hôm qua",
  },
  {
    id: "chap-03",
    projectId: "proj-default",
    order: 3,
    title: "Bí mật cổ mộ",
    summary: "Khám phá lăng mộ ngàn năm và tìm thấy bí kíp thất truyền. Cả nhóm đối mặt với bẫy cơ quan cổ đại.",
    sourceText: `Lối vào cổ mộ bị che phủ bởi lớp rêu phong dày đặc hàng trăm năm. Tiêu Viêm đưa tay phủi nhẹ lớp bụi trên phiến đá, để lộ ra những ký tự cổ đại phát ra ánh sáng lam nhạt.

"Đây chính là nơi phong ấn Hồn Cốt Quyết," Tiêu Viêm thì thầm, ánh mắt sáng lên tia hy vọng. Bên cạnh, Dược Lão vuốt râu trầm ngâm, thần sắc có phần ngưng trọng hơn thường lệ.

Đột nhiên, mặt đất rung chuyển dữ dội. Những cột đá xung quanh bắt đầu sụp đổ. Một bóng đen khổng lồ từ từ trồi lên từ vực sâu phía sau điện thờ. Đôi mắt đỏ rực như hai hòn than cháy nhìn chằm chằm vào những kẻ xâm nhập bất hợp pháp.

"Cẩn thận! Hộ mộ thú đã thức tỉnh!" Dược Lão hét lớn, đồng thời vung tay tạo ra một màn chắn năng lượng màu xanh ngọc bích bao bọc lấy cả hai.`,
    status: "draft",
    stats: {
      wordCount: 1240,
      sceneCount: 4,
      visualBeatCount: 12,
    },
    updatedAt: "Vừa xong",
  },
  {
    id: "chap-04",
    projectId: "proj-default",
    order: 4,
    title: "Trận chiến đỉnh núi",
    summary: "Quyết đấu với Ma Vương bảo vệ phong ấn...",
    sourceText: "Gió rít gào trên đỉnh núi tuyết phủ. Trận chiến quyết định vận mệnh toàn đại lục bắt đầu nổ ra...",
    status: "draft",
    stats: {
      wordCount: 2100,
      sceneCount: 0,
      visualBeatCount: 0,
    },
    updatedAt: "3 ngày trước",
  },
]

export const DEMO_ANALYZED_SCENES: Record<string, AnalyzedScene[]> = {
  "chap-03": [
    {
      id: "scene-3-1",
      chapterId: "chap-03",
      sceneNumber: 1,
      title: "Lối vào cổ mộ",
      estimatedDuration: "0:45",
      sceneType: "Ngoại cảnh",
      location: "Cửa cổ mộ",
      promptPreview: "Tiêu Viêm phủi bụi trên phiến đá cổ, ký tự phát sáng lam nhạt giữa rừng sương mù u tịch...",
      visualBeatCount: 3,
    },
    {
      id: "scene-3-2",
      chapterId: "chap-03",
      sceneNumber: 2,
      title: "Khám phá điện thờ",
      estimatedDuration: "1:15",
      sceneType: "Nội cảnh",
      location: "Điện thờ chính",
      promptPreview: "Bên trong lăng mộ u ám, Tiêu Viêm và Dược Lão tìm kiếm Hồn Cốt Quyết bên bàn thờ đá cổ kính...",
      visualBeatCount: 4,
    },
    {
      id: "scene-3-3",
      chapterId: "chap-03",
      sceneNumber: 3,
      title: "Hộ mộ thú thức tỉnh",
      estimatedDuration: "1:30",
      sceneType: "Nội cảnh",
      location: "Vực sâu điện thờ",
      promptPreview: "Mặt đất rung chuyển dữ dội, bóng đen khổng lồ với đôi mắt đỏ rực trồi lên từ vực sâu...",
      visualBeatCount: 3,
    },
    {
      id: "scene-3-4",
      chapterId: "chap-03",
      sceneNumber: 4,
      title: "Màn chắn ngọc bích",
      estimatedDuration: "1:00",
      sceneType: "Nội cảnh",
      location: "Điện thờ chính",
      promptPreview: "Dược Lão vung tay phóng ra màn chắn năng lượng xanh ngọc bích bao bọc lấy cả hai...",
      visualBeatCount: 2,
    },
  ],
}

export const DEFAULT_ANALYSIS_SETTINGS: AnalysisSettings = {
  videoStyle: "donghua",
  pacing: "medium",
  targetSceneCount: 4,
  visualBeatDetailLevel: "high",
  autoDetectCharacters: true,
  autoExtractLocations: true,
}

export const DEMO_ANALYSIS_RESULT: AnalysisResult = {
  characterCount: 2,
  locationCount: 2,
  sceneCount: 4,
  visualBeatCount: 12,
  characters: [
    { id: "c1", name: "Tiêu Viêm", role: "Nhân vật chính" },
    { id: "c2", name: "Dược Lão", role: "Sư phụ / Hỗ trợ" },
  ],
  locations: [
    { id: "l1", name: "Cửa cổ mộ", description: "Rừng u ám" },
    { id: "l2", name: "Điện thờ chính", description: "Cổ mộ ngàn năm" },
  ],
  completedAt: "14:32",
}

export const DEMO_ANALYSIS_STEPS: AnalysisProgressStep[] = [
  { id: "s1", label: "Phân tích cú pháp cốt truyện", duration: "0.8s", status: "completed" },
  { id: "s2", label: "Trích xuất nhân vật & thực thể", duration: "1.2s", status: "completed" },
  { id: "s3", label: "Phân đoạn cảnh theo mạch truyện", duration: "2.1s", status: "completed" },
  { id: "s4", label: "Tạo visual beats chi tiết", duration: "3.4s", status: "completed" },
]
