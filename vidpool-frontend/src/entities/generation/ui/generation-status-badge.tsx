import { Badge } from "@/shared/ui/badge"
import type { GenerationStatus } from "../model/types"

interface GenerationStatusBadgeProps {
  status: GenerationStatus
}

export function GenerationStatusBadge({ status }: GenerationStatusBadgeProps) {
  switch (status) {
    case "completed":
      return (
        <Badge variant="success">
          <span className="size-1.5 rounded-full bg-emerald-400" />
          Completed
        </Badge>
      )
    case "processing":
      return (
        <Badge variant="warning">
          <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
          Processing
        </Badge>
      )
    case "queued":
      return (
        <Badge variant="secondary">
          <span className="size-1.5 rounded-full bg-indigo-400" />
          Queued
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
