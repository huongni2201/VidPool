import { useNavigationStore } from "@/app/store/navigation-store"
import { Sidebar } from "./Sidebar"
import { Topbar } from "./Topbar"
import { DashboardPage } from "@/features/dashboard/DashboardPage"
import { ProjectsPage } from "@/features/projects/ProjectsPage"
import { EditorPage } from "@/features/editor/EditorPage"
import { VisualBeatPage } from "@/features/visual-beat/VisualBeatPage"
import { CharactersPage } from "@/features/characters/CharactersPage"
import { VoicePage } from "@/features/voice/VoicePage"
import { AccountsPage } from "@/features/accounts/accounts-page"
import { JobsPage } from "@/features/jobs/JobsPage"
import { SettingsPage } from "@/features/settings/SettingsPage"

interface AppShellProps {
  backendStatus?: "ok" | "pending" | "error"
}

export function AppShell({ backendStatus = "ok" }: AppShellProps) {
  const { activeScreen } = useNavigationStore()

  const renderScreen = () => {
    switch (activeScreen) {
      case "overview":
        return <DashboardPage />
      case "projects":
        return <ProjectsPage />
      case "editor":
        return <EditorPage />
      case "visual-beat":
        return <VisualBeatPage />
      case "characters":
        return <CharactersPage />
      case "voice":
        return <VoicePage />
      case "accounts":
        return <AccountsPage />
      case "jobs":
        return <JobsPage />
      case "settings":
        return <SettingsPage />
      default:
        return <DashboardPage />
    }
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#07090e] text-[#f3f6fc]">
      {/* Left Sidebar */}
      <Sidebar backendStatus={backendStatus} />

      {/* Main Studio Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <Topbar />

        {/* Dynamic Content Area */}
        <main className="flex-1 overflow-y-auto bg-[#07090e]">
          {renderScreen()}
        </main>
      </div>
    </div>
  )
}
