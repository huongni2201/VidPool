import { Badge } from "@/shared/ui/badge"
import type { JobStatus } from "../model/types"

interface JobStatusBadgeProps {
  status: JobStatus
}

export function JobStatusBadge({ status }: JobStatusBadgeProps) {
  switch (status) {
    case "succeeded":
      return (
        <Badge variant="success">
          <span className="size-1.5 rounded-full bg-emerald-400" />
          Succeeded
        </Badge>
      )
    case "running":
      return (
        <Badge variant="warning">
          <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
          Running
        </Badge>
      )
    case "pending":
      return (
        <Badge variant="secondary">
          <span className="size-1.5 rounded-full bg-indigo-400" />
          Pending
        </Badge>
      )
    case "failed":
      return (
        <Badge variant="destructive">
          <span className="size-1.5 rounded-full bg-rose-400" />
          Failed
        </Badge>
      )
    case "cancelled":
    default:
      return (
        <Badge variant="outline">
          <span className="size-1.5 rounded-full bg-zinc-500" />
          Cancelled
        </Badge>
      )
  }
}
