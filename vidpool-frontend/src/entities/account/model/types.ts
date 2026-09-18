import { z } from "zod"

export const accountStatusEnum = z.enum(["auth_required", "active", "cooldown", "disabled"])
export type AccountStatus = z.infer<typeof accountStatusEnum>

export const providerDefinitionSchema = z
  .object({
    key: z.string(),
    displayName: z.string(),
    authKind: z.string(),
  })
  .strict()

export type ProviderDefinition = z.infer<typeof providerDefinitionSchema>

export const accountSummarySchema = z
  .object({
    id: z.string().uuid(),
    providerKey: z.string(),
    displayName: z.string().nullable(),
    externalIdentity: z.string().nullable(),
    status: accountStatusEnum,
    lastUsedAt: z.string().datetime().nullable(),
    lastValidatedAt: z.string().datetime().nullable(),
    cooldownUntil: z.string().datetime().nullable(),
    isLeased: z.boolean().default(false),
    leaseExpiresAt: z.string().datetime().nullable().default(null),
    isAvailable: z.boolean().default(false),
  })
  .strict()

export type AccountSummary = z.infer<typeof accountSummarySchema>
export type Account = AccountSummary

export const startLoginResponseSchema = z
  .object({
    accountId: z.string().uuid(),
    status: z.string(),
  })
  .strict()

export type StartLoginResponse = z.infer<typeof startLoginResponseSchema>
