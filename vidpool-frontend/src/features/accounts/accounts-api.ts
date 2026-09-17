import { z } from "zod"
import type { ApiClient } from "@/lib/api-client"
import {
  type AccountSummary,
  accountSummarySchema,
  type ProviderDefinition,
  providerDefinitionSchema,
  type StartLoginResponse,
  startLoginResponseSchema,
} from "./types"

export async function listProviders(client: ApiClient): Promise<ProviderDefinition[]> {
  return client.get("/api/providers", z.array(providerDefinitionSchema))
}

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

export async function startLogin(
  client: ApiClient,
  providerKey: string,
): Promise<StartLoginResponse> {
  return client.post(
    `/api/providers/${providerKey}/accounts/login/start`,
    undefined,
    startLoginResponseSchema,
  )
}

export async function completeLogin(
  client: ApiClient,
  accountId: string,
  browserSessionId: string,
): Promise<AccountSummary> {
  return client.post(
    `/api/accounts/${accountId}/login/complete`,
    { browserSessionId },
    accountSummarySchema,
  )
}

export async function cancelLogin(
  client: ApiClient,
  accountId: string,
  browserSessionId: string,
): Promise<AccountSummary> {
  return client.post(
    `/api/accounts/${accountId}/login/cancel`,
    { browserSessionId },
    accountSummarySchema,
  )
}

export async function startRelogin(
  client: ApiClient,
  accountId: string,
): Promise<StartLoginResponse> {
  return client.post(
    `/api/accounts/${accountId}/relogin/start`,
    undefined,
    startLoginResponseSchema,
  )
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
