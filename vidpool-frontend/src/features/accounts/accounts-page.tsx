import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useApiClient } from "@/app/api-client-context"
import { Button } from "@/components/ui/button"
import {
  deleteAccount,
  disableAccount,
  enableAccount,
  listAccounts,
  validateAccount,
} from "./accounts-api"
import { AccountRow } from "./account-row"
import { AddAccountDialog } from "./add-account-dialog"
import type { AccountSummary } from "./types"

export function AccountsPage() {
  const client = useApiClient()
  const queryClient = useQueryClient()
  const [isAddOpen, setIsAddOpen] = useState(false)

  const accountsQuery = useQuery<AccountSummary[]>({
    queryKey: ["accounts"],
    queryFn: () => listAccounts(client),
  })

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

  const isMutating =
    validateMutation.isPending ||
    enableMutation.isPending ||
    disableMutation.isPending ||
    deleteMutation.isPending

  const accounts = accountsQuery.data || []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Accounts</h2>
          <p className="text-xs text-muted-foreground">
            Quản lý tài khoản AI provider cho quá trình tạo video
          </p>
        </div>
        <Button onClick={() => setIsAddOpen(true)}>+ Add account</Button>
      </div>

      {accountsQuery.isLoading && (
        <div className="rounded-lg border border-border p-8 text-center text-sm text-muted-foreground">
          Đang tải danh sách tài khoản…
        </div>
      )}

      {accountsQuery.isError && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          Không thể tải danh sách tài khoản.
        </div>
      )}

      {!accountsQuery.isLoading && !accountsQuery.isError && accounts.length === 0 && (
        <div
          data-slot="empty-state"
          className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border p-12 text-center"
        >
          <div className="rounded-full bg-muted p-3 text-muted-foreground">
            <svg
              className="size-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">No accounts yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Thêm tài khoản provider đầu tiên để bắt đầu sinh video tự động.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddOpen(true)}
          >
            + Add account
          </Button>
        </div>
      )}

      {accounts.length > 0 && (
        <div className="flex flex-col gap-3">
          {accounts.map((account) => (
            <AccountRow
              key={account.id}
              account={account}
              isBusy={isMutating}
              onValidate={(id) => validateMutation.mutate(id)}
              onEnable={(id) => enableMutation.mutate(id)}
              onDisable={(id) => disableMutation.mutate(id)}
              onRelogin={() => setIsAddOpen(true)}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          ))}
        </div>
      )}

      <AddAccountDialog
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={invalidate}
      />
    </div>
  )
}
