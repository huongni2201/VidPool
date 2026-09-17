import { Button } from "@/shared/ui/button"

export interface CancelGenerationButtonProps {
  generationId: string
  onCancel: (id: string) => void
  disabled?: boolean
}

export function CancelGenerationButton({
  generationId,
  onCancel,
  disabled,
}: CancelGenerationButtonProps) {
  return (
    <Button
      variant="ghost"
      size="xs"
      className="text-rose-400 hover:text-rose-300"
      disabled={disabled}
      onClick={() => onCancel(generationId)}
    >
      Cancel
    </Button>
  )
}
