import { createBrowserRouter, RouterProvider } from "react-router-dom"
import { AppLayout } from "@/app/layouts/app-layout"
import { DashboardPage } from "@/pages/dashboard/ui/dashboard-page"
import { ProjectsPage } from "@/pages/projects/ui/projects-page"
import { EditorPage } from "@/pages/editor/ui/editor-page"
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
        element: <DashboardPage />,
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
        element: <DashboardPage />,
      },
    ],
  },
]

export const router = createBrowserRouter(routes)

export function AppRouter() {
  return <RouterProvider router={router} />
}
