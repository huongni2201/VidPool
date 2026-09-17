import { z } from "zod"

const healthSchema = z.object({
  status: z.string(),
})

export type HealthResponse = z.infer<typeof healthSchema>

export async function getHealth(): Promise<HealthResponse> {
  const response = await fetch("http://127.0.0.1:8000/api/health")

  if (!response.ok) {
    throw new Error(`Health request failed: ${response.status}`)
  }

  return healthSchema.parse(await response.json())
}
