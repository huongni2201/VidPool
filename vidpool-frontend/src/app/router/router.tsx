import { createBrowserRouter, RouterProvider } from "react-router-dom"
import { AppLayout } from "@/app/layouts/app-layout"
import { ProjectsPage } from "@/pages/projects/ui/projects-page"
import { EditorPage } from "@/pages/editor/ui/editor-page"
import { ChapterPage } from "@/pages/chapters/ui/chapter-page"
import { VisualBeatPage } from "@/pages/visual-beat/ui/visual-beat-page"
import { CharactersPage } from "@/pages/characters/ui/characters-page"
import { VoicePage } from "@/pages/voice/ui/voice-page"
import { AccountsPage } from "@/pages/accounts/ui/accounts-page"
import { JobsPage } from "@/pages/jobs/ui/jobs-page"
import { GenerationsPage } from "@/pages/generations/ui/generations-page"
import { SettingsPage } from "@/pages/settings/ui/settings-page"

export const routes = [
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <ProjectsPage />,
      },
      {
        path: "projects",
        element: <ProjectsPage />,
      },
      {
        path: "editor",
        element: <EditorPage />,
      },
      {
        path: "chapters",
        element: <ChapterPage />,
      },
      {
        path: "chapters/:chapterId",
        element: <ChapterPage />,
      },
      {
        path: "visual-beat",
        element: <VisualBeatPage />,
      },
      {
        path: "characters",
        element: <CharactersPage />,
      },
      {
        path: "voice",
        element: <VoicePage />,
      },
      {
        path: "accounts",
        element: <AccountsPage />,
      },
      {
        path: "jobs",
        element: <JobsPage />,
      },
      {
        path: "generations",
        element: <GenerationsPage />,
      },
      {
        path: "settings",
        element: <SettingsPage />,
      },
      {
        path: "*",
        element: <ProjectsPage />,
      },
    ],
  },
]

export const router = createBrowserRouter(routes)

export function AppRouter() {
  return <RouterProvider router={router} />
}
