import type { Project } from "@/entities/project"

export function createMockProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "proj-1",
    name: "Mock Test Project",
    description: "Sample project for integration tests",
    status: "draft",
    sceneCount: 4,
    durationSeconds: 60,
    thumbnailUrl: null,
    createdAt: "2026-09-17T00:00:00Z",
    updatedAt: "2026-09-17T00:00:00Z",
    ...overrides,
  }
}
