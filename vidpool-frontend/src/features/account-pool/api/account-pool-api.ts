import { z } from "zod"
import type { ApiClient } from "@/shared/api"
import { type AccountSummary, accountSummarySchema } from "@/entities/account"

export async function listAccounts(
  client: ApiClient,
  providerKey?: string,
): Promise<AccountSummary[]> {
  const path = providerKey
    ? `/api/accounts?provider_key=${encodeURIComponent(providerKey)}`
    : "/api/accounts"
  return client.get(path, z.array(accountSummarySchema))
}

export async function getAccount(
  client: ApiClient,
  accountId: string,
): Promise<AccountSummary> {
  return client.get(`/api/accounts/${accountId}`, accountSummarySchema)
}

export async function validateAccount(
  client: ApiClient,
  accountId: string,
): Promise<AccountSummary> {
  return client.post(
    `/api/accounts/${accountId}/validate`,
    undefined,
    accountSummarySchema,
  )
}

export async function enableAccount(
  client: ApiClient,
  accountId: string,
): Promise<AccountSummary> {
  return client.post(
    `/api/accounts/${accountId}/enable`,
    undefined,
    accountSummarySchema,
  )
}

export async function disableAccount(
  client: ApiClient,
  accountId: string,
): Promise<AccountSummary> {
  return client.post(
    `/api/accounts/${accountId}/disable`,
    undefined,
    accountSummarySchema,
  )
}

export async function deleteAccount(
  client: ApiClient,
  accountId: string,
): Promise<void> {
  await client.delete(`/api/accounts/${accountId}`)
}
