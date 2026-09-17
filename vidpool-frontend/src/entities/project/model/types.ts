import { z } from "zod"

export const projectStatusEnum = z.enum(["draft", "in_progress", "rendered", "archived"])
export type ProjectStatus = z.infer<typeof projectStatusEnum>

export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  status: projectStatusEnum.default("draft"),
  sceneCount: z.number().default(0),
  durationSeconds: z.number().default(0),
  thumbnailUrl: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Project = z.infer<typeof projectSchema>
