export const ROUTES = {
  DASHBOARD: "/",
  PROJECTS: "/projects",
  EDITOR: "/editor",
  VISUAL_BEAT: "/visual-beat",
  CHARACTERS: "/characters",
  VOICE: "/voice",
  ACCOUNTS: "/accounts",
  JOBS: "/jobs",
  GENERATIONS: "/generations",
  SETTINGS: "/settings",
} as const

export type RouteKey = keyof typeof ROUTES
export type AppRoute = (typeof ROUTES)[RouteKey]
