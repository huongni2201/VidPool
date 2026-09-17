import { cn } from "@/shared/lib/utils"

interface JobProgressBarProps {
  progress: number
  className?: string
}

export function JobProgressBar({ progress, className }: JobProgressBarProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress))

  return (
    <div className={cn("w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden", className)}>
      <div
        className="bg-indigo-500 h-full rounded-full transition-all duration-300"
        style={{ width: `${clampedProgress}%` }}
      />
    </div>
  )
}
