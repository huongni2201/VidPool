import { GenerationStatusBadge } from "@/entities/generation"
import { JobProgressBar } from "@/entities/job"
import { RetryGenerationButton } from "@/features/retry-generation"
import { CancelGenerationButton } from "@/features/cancel-generation"
import type { Generation } from "@/entities/generation"

export interface GenerationQueueProps {
  generations: Generation[]
  onRetry?: (id: string) => void
  onCancel?: (id: string) => void
}

export function GenerationQueue({
  generations,
  onRetry,
  onCancel,
}: GenerationQueueProps) {
  if (generations.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-10 text-center text-sm text-zinc-400">
        No active or pending generations in queue.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {generations.map((gen) => (
        <div
          key={gen.id}
          className="flex flex-col gap-2.5 rounded-xl border border-white/10 bg-zinc-900/60 p-4 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-semibold text-indigo-400">
                {gen.type}
              </span>
              <span className="text-xs text-zinc-500">•</span>
              <span className="text-xs text-zinc-400">{gen.providerKey}</span>
            </div>
            <GenerationStatusBadge status={gen.status} />
          </div>

          <p className="text-sm font-medium text-zinc-200 line-clamp-2">
            {gen.prompt}
          </p>

          {gen.status === "processing" && (
            <div className="flex flex-col gap-1 mt-1">
              <div className="flex justify-between text-xs text-zinc-400">
                <span>Rendering video frame-by-frame…</span>
                <span>{gen.progressPercent}%</span>
              </div>
              <JobProgressBar progress={gen.progressPercent} />
            </div>
          )}

          {gen.errorMessage && (
            <p className="text-xs text-rose-400 bg-rose-500/10 p-2 rounded border border-rose-500/20">
              {gen.errorMessage}
            </p>
          )}

          <div className="flex items-center justify-between pt-1 border-t border-white/5 text-xs text-zinc-500">
            <span>{new Date(gen.createdAt).toLocaleTimeString()}</span>
            <div className="flex items-center gap-2">
              {gen.status === "failed" && onRetry && (
                <RetryGenerationButton generationId={gen.id} onRetry={onRetry} />
              )}
              {(gen.status === "queued" || gen.status === "processing") && onCancel && (
                <CancelGenerationButton generationId={gen.id} onCancel={onCancel} />
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
