import { create } from "zustand"

export interface ActiveProjectInfo {
  id: string
  name: string
  title?: string
  aspectRatio?: "16:9" | "9:16" | "1:1" | string
  duration?: string
  scenes?: number
  characters?: number
  cover?: string
}

export interface ProjectStoreState {
  activeProject: ActiveProjectInfo | null
  projectName: string
  savedTime: string
  isProjectOpen: boolean
  openProject: (project: ActiveProjectInfo | string) => void
  closeProject: () => void
  setProjectName: (name: string) => void
}

export const useProjectStore = create<ProjectStoreState>((set) => ({
  activeProject: null,
  projectName: "",
  savedTime: "",
  isProjectOpen: false,
  openProject: (project) => {
    const proj: ActiveProjectInfo =
      typeof project === "string"
        ? { id: "p1", name: project, title: project, aspectRatio: "16:9", duration: "00:02:28" }
        : { ...project, name: project.name || project.title || "Dự án mới" }
    set({
      activeProject: proj,
      projectName: proj.name,
      isProjectOpen: true,
    })
  },
  closeProject: () =>
    set({
      activeProject: null,
      isProjectOpen: false,
    }),
  setProjectName: (name) =>
    set((state) => ({
      projectName: name,
      activeProject: state.activeProject ? { ...state.activeProject, name, title: name } : null,
    })),
}))
