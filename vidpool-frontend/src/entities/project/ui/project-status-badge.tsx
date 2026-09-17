import { Badge } from "@/shared/ui/badge"
import type { ProjectStatus } from "../model/types"

interface ProjectStatusBadgeProps {
  status: ProjectStatus
}

export function ProjectStatusBadge({ status }: ProjectStatusBadgeProps) {
  switch (status) {
    case "rendered":
      return (
        <Badge variant="success">
          <span className="size-1.5 rounded-full bg-emerald-400" />
          Rendered
        </Badge>
      )
    case "in_progress":
      return (
        <Badge variant="warning">
          <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
          In Progress
        </Badge>
      )
    case "archived":
      return (
        <Badge variant="outline">
          <span className="size-1.5 rounded-full bg-zinc-400" />
          Archived
        </Badge>
      )
    case "draft":
    default:
      return (
        <Badge variant="secondary">
          <span className="size-1.5 rounded-full bg-zinc-400" />
          Draft
        </Badge>
      )
  }
}
