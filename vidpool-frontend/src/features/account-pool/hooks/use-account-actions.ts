import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useApiClient } from "@/shared/api"
import {
  deleteAccount,
  disableAccount,
  enableAccount,
  validateAccount,
} from "../api/account-pool-api"

export interface AccountActionError {
  action: "validate" | "enable" | "disable" | "delete"
  message: string
}

export function useAccountActions() {
  const client = useApiClient()
  const queryClient = useQueryClient()

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["accounts"] })

  const validateMutation = useMutation({
    mutationFn: (id: string) => validateAccount(client, id),
    onSuccess: invalidate,
  })

  const enableMutation = useMutation({
    mutationFn: (id: string) => enableAccount(client, id),
    onSuccess: invalidate,
  })

  const disableMutation = useMutation({
    mutationFn: (id: string) => disableAccount(client, id),
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAccount(client, id),
    onSuccess: invalidate,
  })

  const clearError = () => {
    validateMutation.reset()
    enableMutation.reset()
    disableMutation.reset()
    deleteMutation.reset()
  }

  const error: AccountActionError | null =
    validateMutation.error
      ? { action: "validate", message: validateMutation.error.message }
      : enableMutation.error
      ? { action: "enable", message: enableMutation.error.message }
      : disableMutation.error
      ? { action: "disable", message: disableMutation.error.message }
      : deleteMutation.error
      ? { action: "delete", message: deleteMutation.error.message }
      : null

  const isPending =
    validateMutation.isPending ||
    enableMutation.isPending ||
    disableMutation.isPending ||
    deleteMutation.isPending

  return {
    validateAccount: (id: string) => {
      clearError()
      validateMutation.mutate(id)
    },
    enableAccount: (id: string) => {
      clearError()
      enableMutation.mutate(id)
    },
    disableAccount: (id: string) => {
      clearError()
      disableMutation.mutate(id)
    },
    deleteAccount: (id: string) => {
      clearError()
      deleteMutation.mutate(id)
    },
    invalidate,
    isPending,
    error,
    clearError,
  }
}
