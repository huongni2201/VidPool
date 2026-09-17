import { useState } from "react"
import { Button } from "@/shared/ui/button"

export interface CreateGenerationDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: { prompt: string; providerKey: string; type: "video" | "image" }) => void
}

export function CreateGenerationDialog({
  open,
  onClose,
  onSubmit,
}: CreateGenerationDialogProps) {
  const [prompt, setPrompt] = useState("")
  const [providerKey, setProviderKey] = useState("dreamina")
  const [type, setType] = useState<"video" | "image">("video")

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return
    onSubmit({ prompt, providerKey, type })
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
        className="w-full max-w-lg rounded-xl border border-white/10 bg-zinc-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-4"
      >
        <h2 className="text-lg font-semibold text-zinc-100">Create New Generation</h2>
        
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-zinc-400">Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder="Describe the visual or action to generate..."
            className="w-full rounded-md border border-white/10 bg-white/[0.04] p-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-400">Media Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "video" | "image")}
              className="h-9 rounded-md border border-white/10 bg-zinc-800 px-3 text-sm text-zinc-100 focus:outline-none"
            >
              <option value="video">Video</option>
              <option value="image">Image</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-400">Provider</label>
            <select
              value={providerKey}
              onChange={(e) => setProviderKey(e.target.value)}
              className="h-9 rounded-md border border-white/10 bg-zinc-800 px-3 text-sm text-zinc-100 focus:outline-none"
            >
              <option value="dreamina">Dreamina (Seedance)</option>
              <option value="gemini">Gemini</option>
            </select>
          </div>
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <Button variant="outline" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" type="submit" disabled={!prompt.trim()}>
            Start Generation
          </Button>
        </div>
      </form>
    </div>
  )
}
