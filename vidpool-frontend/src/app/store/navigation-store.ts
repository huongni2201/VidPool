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

interface NavigationState {
  activeScreen: ScreenId
  projectName: string
  savedTime: string
  setScreen: (screen: ScreenId) => void
  setProjectName: (name: string) => void
}

export const useNavigationStore = create<NavigationState>((set) => ({
  activeScreen: "overview",
  projectName: "Thanh Xuân Trở Lại",
  savedTime: "15:24",
  setScreen: (screen) => set({ activeScreen: screen }),
  setProjectName: (name) => set({ projectName: name }),
}))
