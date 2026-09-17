import { useState } from "react"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"

export interface CreateProjectDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: { name: string; description: string }) => void
}

export function CreateProjectDialog({
  open,
  onClose,
  onSubmit,
}: CreateProjectDialogProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit({ name: name.trim(), description: description.trim() })
    onClose()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-xl border border-white/10 bg-zinc-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-4"
      >
        <h2 className="text-lg font-semibold text-zinc-100">Create New Project</h2>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-zinc-400">Project Name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Cyberpunk Teaser Episode 1"
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-zinc-400">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Brief plot or visual style guidelines..."
            className="w-full rounded-md border border-white/10 bg-white/[0.04] p-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
          />
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <Button variant="outline" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" type="submit" disabled={!name.trim()}>
            Create Project
          </Button>
        </div>
      </form>
    </div>
  )
}
