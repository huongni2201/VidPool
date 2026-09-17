import { Badge } from "@/shared/ui/badge"
import type { AccountStatus } from "../model/types"

interface AccountStatusBadgeProps {
  status: AccountStatus
}

export function AccountStatusBadge({ status }: AccountStatusBadgeProps) {
  switch (status) {
    case "active":
      return (
        <Badge variant="success" className="gap-1">
          <span className="size-1.5 rounded-full bg-emerald-400" />
          Active
        </Badge>
      )
    case "cooldown":
      return (
        <Badge variant="warning" className="gap-1">
          <span className="size-1.5 rounded-full bg-amber-400" />
          Cooldown
        </Badge>
      )
    case "disabled":
      return (
        <Badge variant="outline" className="gap-1 text-zinc-500">
          <span className="size-1.5 rounded-full bg-zinc-500" />
          Disabled
        </Badge>
      )
    case "auth_required":
    default:
      return (
        <Badge variant="destructive" className="gap-1">
          <span className="size-1.5 rounded-full bg-rose-400" />
          Auth Required
        </Badge>
      )
  }
}
