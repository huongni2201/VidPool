import type { Generation } from "@/entities/generation"

export function createMockGeneration(overrides: Partial<Generation> = {}): Generation {
  return {
    id: "gen-1",
    type: "video",
    status: "queued",
    prompt: "Sample generation prompt",
    providerKey: "dreamina",
    progressPercent: 0,
    createdAt: "2026-09-17T00:00:00Z",
    ...overrides,
  }
}
