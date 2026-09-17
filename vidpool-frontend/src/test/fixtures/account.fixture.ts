import type { AccountSummary, ProviderDefinition } from "@/entities/account"

export function createMockAccount(overrides: Partial<AccountSummary> = {}): AccountSummary {
  return {
    id: "123e4567-e89b-12d3-a456-426614174000",
    providerKey: "dreamina",
    displayName: "Dreamina Test Account",
    externalIdentity: "user_test_01",
    status: "active",
    lastUsedAt: null,
    lastValidatedAt: "2026-09-17T12:00:00Z",
    cooldownUntil: null,
    ...overrides,
  }
}

export function createMockProvider(overrides: Partial<ProviderDefinition> = {}): ProviderDefinition {
  return {
    key: "dreamina",
    displayName: "Dreamina (Seedance)",
    authKind: "browser_session",
    ...overrides,
  }
}
