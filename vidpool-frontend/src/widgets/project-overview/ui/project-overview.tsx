import { ProjectCard } from "@/entities/project"
import type { Project } from "@/entities/project"

export interface ProjectOverviewProps {
  projects: Project[]
  onSelectProject?: (project: Project) => void
  onCreateProject?: () => void
}

export function ProjectOverview({
  projects,
  onSelectProject,
  onCreateProject,
}: ProjectOverviewProps) {
  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-zinc-900/30 p-12 text-center">
        <h3 className="text-base font-semibold text-zinc-300">No Projects Found</h3>
        <p className="mt-1 text-xs text-zinc-500 max-w-sm">
          Create your first AI video project to begin generating scenes, characters, and timelines.
        </p>
        {onCreateProject && (
          <button
            onClick={onCreateProject}
            className="mt-4 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
          >
            Create New Project
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onClick={() => onSelectProject?.(project)}
        />
      ))}
    </div>
  )
}
