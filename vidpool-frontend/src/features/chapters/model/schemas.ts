import { z } from "zod"

export const chapterStatusSchema = z.enum(["draft", "analyzing", "analyzed", "error"])

export const chapterStatsSchema = z.object({
  wordCount: z.number().int().nonnegative(),
  sceneCount: z.number().int().nonnegative(),
  visualBeatCount: z.number().int().nonnegative(),
})

export const chapterSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  order: z.number().int().positive(),
  title: z.string().min(1),
  summary: z.string(),
  sourceText: z.string(),
  status: chapterStatusSchema,
  stats: chapterStatsSchema,
  updatedAt: z.string(),
})

export const analyzedSceneSchema = z.object({
  id: z.string(),
  chapterId: z.string(),
  sceneNumber: z.number().int().positive(),
  title: z.string(),
  estimatedDuration: z.string(),
  sceneType: z.enum(["Ngoại cảnh", "Nội cảnh"]),
  location: z.string(),
  promptPreview: z.string(),
  visualBeatCount: z.number().int().nonnegative(),
})

export const analysisSettingsSchema = z.object({
  videoStyle: z.enum(["donghua", "cinematic", "3d_animation", "realistic"]),
  pacing: z.enum(["fast", "medium", "slow"]),
  targetSceneCount: z.number().int().min(1).max(20),
  visualBeatDetailLevel: z.enum(["low", "medium", "high", "very_high"]),
  autoDetectCharacters: z.boolean(),
  autoExtractLocations: z.boolean(),
})

export const entityItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
})

export const locationItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
})

export const analysisResultSchema = z.object({
  characterCount: z.number().int().nonnegative(),
  locationCount: z.number().int().nonnegative(),
  sceneCount: z.number().int().nonnegative(),
  visualBeatCount: z.number().int().nonnegative(),
  characters: z.array(entityItemSchema),
  locations: z.array(locationItemSchema),
  completedAt: z.string().optional(),
})

export const analysisProgressStepSchema = z.object({
  id: z.string(),
  label: z.string(),
  duration: z.string().optional(),
  status: z.enum(["pending", "running", "completed", "error"]),
})
