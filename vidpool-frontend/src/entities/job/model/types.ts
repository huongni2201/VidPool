import { z } from "zod"

export const jobStatusEnum = z.enum(["pending", "running", "succeeded", "failed", "cancelled"])
export type JobStatus = z.infer<typeof jobStatusEnum>

export const jobSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: jobStatusEnum,
  progress: z.number().min(0).max(100).default(0),
  stage: z.string().optional(),
  createdAt: z.string(),
  startedAt: z.string().nullable().optional(),
  finishedAt: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
})

export type Job = z.infer<typeof jobSchema>
