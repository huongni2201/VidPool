import { useState, useCallback, useRef, useEffect } from "react"
import type {
  AnalysisSettings,
  AnalysisResult,
  AnalysisProgressStep,
  AnalyzedScene,
} from "../model/types"
import {
  DEFAULT_ANALYSIS_SETTINGS,
  DEMO_ANALYZED_SCENES,
  DEMO_ANALYSIS_RESULT,
  DEMO_ANALYSIS_STEPS,
} from "../api/chapter-api"

export function useChapterAnalyzer() {
  const [settings, setSettings] = useState<AnalysisSettings>(DEFAULT_ANALYSIS_SETTINGS)
  const [scenesMap, setScenesMap] = useState<Record<string, AnalyzedScene[]>>(DEMO_ANALYZED_SCENES)
  const [result, setResult] = useState<AnalysisResult | null>(DEMO_ANALYSIS_RESULT)
  const [steps, setSteps] = useState<AnalysisProgressStep[]>(DEMO_ANALYSIS_STEPS)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const timeoutsRef = useRef<number[]>([])

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(clearTimeout)
    }
  }, [])

  const updateSetting = useCallback(<K extends keyof AnalysisSettings>(
    key: K,
    value: AnalysisSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }, [])

  const startAnalysis = useCallback(
    (chapterId: string, onComplete?: (sceneCount: number, beatCount: number) => void) => {
      if (isAnalyzing) return

      setIsAnalyzing(true)
      timeoutsRef.current.forEach(clearTimeout)
      timeoutsRef.current = []

      // Reset step status
      const initialSteps: AnalysisProgressStep[] = [
        { id: "s1", label: "Phân tích cú pháp cốt truyện", duration: "...", status: "running" },
        { id: "s2", label: "Trích xuất nhân vật & thực thể", duration: "...", status: "pending" },
        { id: "s3", label: "Phân đoạn cảnh theo mạch truyện", duration: "...", status: "pending" },
        { id: "s4", label: "Tạo visual beats chi tiết", duration: "...", status: "pending" },
      ]
      setSteps(initialSteps)

      // Timeline of steps
      const t1 = window.setTimeout(() => {
        setSteps((prev) => [
          { ...prev[0], duration: "0.8s", status: "completed" },
          { ...prev[1], status: "running" },
          prev[2],
          prev[3],
        ])
      }, 700)

      const t2 = window.setTimeout(() => {
        setSteps((prev) => [
          prev[0],
          { ...prev[1], duration: "1.2s", status: "completed" },
          { ...prev[2], status: "running" },
          prev[3],
        ])
      }, 1500)

      const t3 = window.setTimeout(() => {
        setSteps((prev) => [
          prev[0],
          prev[1],
          { ...prev[2], duration: "1.9s", status: "completed" },
          { ...prev[3], status: "running" },
        ])
      }, 2300)

      const t4 = window.setTimeout(() => {
        setSteps((prev) => [
          prev[0],
          prev[1],
          prev[2],
          { ...prev[3], duration: "3.2s", status: "completed" },
        ])

        const generatedScenes: AnalyzedScene[] = [
          {
            id: `scene-${chapterId}-1`,
            chapterId,
            sceneNumber: 1,
            title: "Lối vào cổ mộ",
            estimatedDuration: "0:45",
            sceneType: "Ngoại cảnh",
            location: "Cửa cổ mộ",
            promptPreview: "Tiêu Viêm phủi bụi trên phiến đá cổ, ký tự phát sáng lam nhạt giữa rừng sương mù u tịch...",
            visualBeatCount: 3,
          },
          {
            id: `scene-${chapterId}-2`,
            chapterId,
            sceneNumber: 2,
            title: "Khám phá điện thờ",
            estimatedDuration: "1:15",
            sceneType: "Nội cảnh",
            location: "Điện thờ chính",
            promptPreview: "Bên trong lăng mộ u ám, Tiêu Viêm và Dược Lão tìm kiếm Hồn Cốt Quyết bên bàn thờ đá cổ kính...",
            visualBeatCount: 4,
          },
          {
            id: `scene-${chapterId}-3`,
            chapterId,
            sceneNumber: 3,
            title: "Hộ mộ thú thức tỉnh",
            estimatedDuration: "1:30",
            sceneType: "Nội cảnh",
            location: "Vực sâu điện thờ",
            promptPreview: "Mặt đất rung chuyển dữ dội, bóng đen khổng lồ với đôi mắt đỏ rực trồi lên từ vực sâu...",
            visualBeatCount: 3,
          },
          {
            id: `scene-${chapterId}-4`,
            chapterId,
            sceneNumber: 4,
            title: "Màn chắn ngọc bích",
            estimatedDuration: "1:00",
            sceneType: "Nội cảnh",
            location: "Điện thờ chính",
            promptPreview: "Dược Lão vung tay phóng ra màn chắn năng lượng xanh ngọc bích bao bọc lấy cả hai...",
            visualBeatCount: 2,
          },
        ]

        setScenesMap((prev) => ({
          ...prev,
          [chapterId]: generatedScenes,
        }))

        const now = new Date()
        const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`

        setResult({
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
          completedAt: timeStr,
        })

        setIsAnalyzing(false)
        onComplete?.(4, 12)
      }, 3200)

      timeoutsRef.current.push(t1, t2, t3, t4)
    },
    [isAnalyzing]
  )

  const getChapterScenes = useCallback(
    (chapterId: string): AnalyzedScene[] => {
      return scenesMap[chapterId] || []
    },
    [scenesMap]
  )

  return {
    settings,
    updateSetting,
    scenesMap,
    getChapterScenes,
    result,
    steps,
    isAnalyzing,
    startAnalysis,
  }
}
