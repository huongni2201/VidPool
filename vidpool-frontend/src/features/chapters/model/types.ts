export type ChapterStatus = "draft" | "analyzing" | "analyzed" | "error"

export interface ChapterStats {
  wordCount: number
  sceneCount: number
  visualBeatCount: number
}

export interface Chapter {
  id: string
  projectId: string
  order: number
  title: string
  summary: string
  sourceText: string
  status: ChapterStatus
  stats: ChapterStats
  updatedAt: string
}

export interface AnalyzedScene {
  id: string
  chapterId: string
  sceneNumber: number
  title: string
  estimatedDuration: string
  sceneType: "Ngoại cảnh" | "Nội cảnh"
  location: string
  promptPreview: string
  visualBeatCount: number
}

export type VideoStyle = "donghua" | "cinematic" | "3d_animation" | "realistic"
export type PacingType = "fast" | "medium" | "slow"
export type DetailLevel = "low" | "medium" | "high" | "very_high"

export interface AnalysisSettings {
  videoStyle: VideoStyle
  pacing: PacingType
  targetSceneCount: number
  visualBeatDetailLevel: DetailLevel
  autoDetectCharacters: boolean
  autoExtractLocations: boolean
}

export interface EntityItem {
  id: string
  name: string
  role: string
}

export interface LocationItem {
  id: string
  name: string
  description: string
}

export interface AnalysisResult {
  characterCount: number
  locationCount: number
  sceneCount: number
  visualBeatCount: number
  characters: EntityItem[]
  locations: LocationItem[]
  completedAt?: string
}

export interface AnalysisProgressStep {
  id: string
  label: string
  duration?: string
  status: "pending" | "running" | "completed" | "error"
}
