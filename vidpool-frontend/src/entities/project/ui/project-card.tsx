import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card"
import { ProjectStatusBadge } from "./project-status-badge"
import type { Project } from "../model/types"

interface ProjectCardProps {
  project: Project
  onClick?: () => void
}

export function ProjectCard({ project, onClick }: ProjectCardProps) {
  return (
    <Card
      onClick={onClick}
      className="group cursor-pointer border-white/5 bg-zinc-900/40 hover:border-indigo-500/30 hover:bg-zinc-900/80 transition-all duration-300"
    >
      <div className="relative aspect-video w-full overflow-hidden rounded-t-xl bg-zinc-950/80 border-b border-white/5">
        {project.thumbnailUrl ? (
          <img
            src={project.thumbnailUrl}
            alt={project.name}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-zinc-600 font-mono">
            NO PREVIEW
          </div>
        )}
        <div className="absolute top-2 right-2">
          <ProjectStatusBadge status={project.status} />
        </div>
      </div>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-base truncate group-hover:text-indigo-400 transition-colors">
          {project.name}
        </CardTitle>
        <CardDescription className="text-xs line-clamp-1">
          {project.description || "No description"}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-1 flex items-center justify-between text-xs text-zinc-500">
        <span>{project.sceneCount} scenes</span>
        <span>{project.durationSeconds}s</span>
      </CardContent>
    </Card>
  )
}
