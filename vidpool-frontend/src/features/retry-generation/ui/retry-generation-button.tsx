import { Button } from "@/shared/ui/button"

export interface RetryGenerationButtonProps {
  generationId: string
  onRetry: (id: string) => void
  disabled?: boolean
}

export function RetryGenerationButton({
  generationId,
  onRetry,
  disabled,
}: RetryGenerationButtonProps) {
  return (
    <Button
      variant="outline"
      size="xs"
      disabled={disabled}
      onClick={() => onRetry(generationId)}
    >
      Retry
    </Button>
  )
}
