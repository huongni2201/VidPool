import { createBrowserRouter, RouterProvider } from "react-router-dom"
import { AppLayout } from "@/app/layouts/app-layout"
import { DashboardPage } from "@/pages/dashboard/dashboard-page"
import { ProjectsPage } from "@/pages/projects/projects-page"
import { EditorPage } from "@/pages/editor/editor-page"
import { VisualBeatPage } from "@/pages/visual-beat/visual-beat-page"
import { CharactersPage } from "@/pages/characters/characters-page"
import { VoicePage } from "@/pages/voice/voice-page"
import { AccountsPage } from "@/pages/accounts/accounts-page"
import { JobsPage } from "@/pages/jobs/jobs-page"
import { GenerationsPage } from "@/pages/generations/generations-page"
import { SettingsPage } from "@/pages/settings/settings-page"

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
