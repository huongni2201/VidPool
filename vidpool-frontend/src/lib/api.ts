import { z } from "zod"
import { createApiClient } from "./api-client"
import { getDevRuntimeConfig } from "@/runtime/runtime-config"

export const healthSchema = z.object({
  status: z.literal("ok"),
})

export type HealthResponse = z.infer<typeof healthSchema>

export const sessionProbeSchema = z.object({
  status: z.literal("ok"),
})

export type SessionProbeResponse = z.infer<typeof sessionProbeSchema>

export async function getHealth(): Promise<HealthResponse> {
  const client = createApiClient(getDevRuntimeConfig())
  return client.get("/api/health", healthSchema)
}
