import { create } from "zustand"

export type ScreenId =
  | "overview"
  | "projects"
  | "editor"
  | "visual-beat"
  | "characters"
  | "voice"
  | "accounts"
  | "jobs"
  | "settings"

export interface ActiveProject {
  id: string
  title: string
  duration?: string
  aspectRatio?: string
  cover?: string
}

interface NavigationState {
  activeScreen: ScreenId
  projectName: string
  activeProject: ActiveProject | null
  isProjectOpen: boolean
  savedTime: string
  setScreen: (screen: ScreenId) => void
  setProjectName: (name: string) => void
  openProject: (project: ActiveProject) => void
  closeProject: () => void
}

export const useNavigationStore = create<NavigationState>((set) => ({
  activeScreen: "overview",
  projectName: "Thanh Xuân Trở Lại",
  activeProject: null,
  isProjectOpen: false,
  savedTime: "15:24",
  setScreen: (screen) => set({ activeScreen: screen }),
  setProjectName: (name) =>
    set((state) => ({
      projectName: name,
      activeProject: state.activeProject
        ? { ...state.activeProject, title: name }
        : { id: "p1", title: name, aspectRatio: "16:9", duration: "00:02:28" },
    })),
  openProject: (project) =>
    set({
      activeProject: project,
      projectName: project.title,
      isProjectOpen: true,
      activeScreen: "editor",
    }),
  closeProject: () =>
    set({
      activeProject: null,
      isProjectOpen: false,
      activeScreen: "overview",
    }),
}))
