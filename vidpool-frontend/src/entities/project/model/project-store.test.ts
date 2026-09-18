import { beforeEach, describe, expect, it } from "vitest"
import { useProjectStore } from "./project-store"

describe("useProjectStore", () => {
  beforeEach(() => {
    useProjectStore.getState().closeProject()
  })

  it("starts in a truthful closed state with no active project", () => {
    const state = useProjectStore.getState()
    expect(state.activeProject).toBeNull()
    expect(state.projectName).toBe("")
    expect(state.savedTime).toBe("")
    expect(state.isProjectOpen).toBe(false)
  })

  it("opens a project from string name", () => {
    useProjectStore.getState().openProject("Test Project")
    const state = useProjectStore.getState()
    expect(state.isProjectOpen).toBe(true)
    expect(state.projectName).toBe("Test Project")
    expect(state.activeProject?.name).toBe("Test Project")
  })

  it("opens a project from structured object and closes it cleanly", () => {
    useProjectStore.getState().openProject({
      id: "p99",
      name: "Complex Project",
      aspectRatio: "9:16",
    })
    expect(useProjectStore.getState().isProjectOpen).toBe(true)
    expect(useProjectStore.getState().activeProject?.id).toBe("p99")

    useProjectStore.getState().closeProject()
    expect(useProjectStore.getState().isProjectOpen).toBe(false)
    expect(useProjectStore.getState().activeProject).toBeNull()
  })
})
