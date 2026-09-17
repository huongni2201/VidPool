import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useApiClient } from "@/app/api-client-context"
import {
  deleteAccount,
  disableAccount,
  enableAccount,
  validateAccount,
} from "../accounts-api"

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

  const isPending =
    validateMutation.isPending ||
    enableMutation.isPending ||
    disableMutation.isPending ||
    deleteMutation.isPending

  return {
    validateAccount: (id: string) => validateMutation.mutate(id),
    enableAccount: (id: string) => enableMutation.mutate(id),
    disableAccount: (id: string) => disableMutation.mutate(id),
    deleteAccount: (id: string) => deleteMutation.mutate(id),
    invalidate,
    isPending,
  }
}
