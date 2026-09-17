import { z } from "zod"

export const generationStatusEnum = z.enum(["queued", "processing", "completed", "failed", "cancelled"])
export type GenerationStatus = z.infer<typeof generationStatusEnum>

export const generationTypeEnum = z.enum(["video", "image", "tts", "timeline"])
export type GenerationType = z.infer<typeof generationTypeEnum>

export const generationSchema = z.object({
  id: z.string(),
  projectId: z.string().optional(),
  type: generationTypeEnum,
  status: generationStatusEnum,
  prompt: z.string(),
  providerKey: z.string(),
  progressPercent: z.number().min(0).max(100).default(0),
  outputUrl: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  createdAt: z.string(),
  completedAt: z.string().nullable().optional(),
})

export type Generation = z.infer<typeof generationSchema>
