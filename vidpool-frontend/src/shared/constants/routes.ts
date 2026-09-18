export const ROUTES = {
  PROJECTS: "/",
  EDITOR: "/editor",
  CHAPTERS: "/chapters",
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
