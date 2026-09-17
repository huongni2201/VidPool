import { Button } from "@/shared/ui/button"

export interface DeleteProjectDialogProps {
  open: boolean
  projectName: string
  onClose: () => void
  onConfirm: () => void
}

export function DeleteProjectDialog({
  open,
  projectName,
  onClose,
  onConfirm,
}: DeleteProjectDialogProps) {
  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-md rounded-xl border border-rose-500/20 bg-zinc-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-rose-400">Delete Project</h2>
        <p className="text-sm text-zinc-300">
          Are you sure you want to delete <strong>{projectName}</strong>? All generated scenes, assets, and timeline data will be permanently removed.
        </p>

        <div className="mt-2 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            Delete Project
          </Button>
        </div>
      </div>
    </div>
  )
}
