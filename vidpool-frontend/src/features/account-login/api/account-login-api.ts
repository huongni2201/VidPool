import { z } from "zod"
import type { ApiClient } from "@/shared/api"
import {
  type AccountSummary,
  accountSummarySchema,
  type ProviderDefinition,
  providerDefinitionSchema,
  type StartLoginResponse,
  startLoginResponseSchema,
} from "@/entities/account"

export async function listProviders(client: ApiClient): Promise<ProviderDefinition[]> {
  return client.get("/api/providers", z.array(providerDefinitionSchema))
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
): Promise<AccountSummary> {
  return client.post(
    `/api/accounts/${accountId}/login/complete`,
    undefined,
    accountSummarySchema,
  )
}

export async function cancelNewLogin(
  client: ApiClient,
  accountId: string,
): Promise<void> {
  await client.post(`/api/accounts/${accountId}/login/cancel`)
}

export async function cancelRelogin(
  client: ApiClient,
  accountId: string,
): Promise<AccountSummary> {
  return client.post(
    `/api/accounts/${accountId}/relogin/cancel`,
    undefined,
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
