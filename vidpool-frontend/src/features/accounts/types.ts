import { z } from "zod"

export type AccountStatus = "auth_required" | "active" | "cooldown" | "disabled"

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
    status: z.enum(["auth_required", "active", "cooldown", "disabled"]),
    lastUsedAt: z.string().datetime().nullable(),
    lastValidatedAt: z.string().datetime().nullable(),
    cooldownUntil: z.string().datetime().nullable(),
  })
  .strict()

export type AccountSummary = z.infer<typeof accountSummarySchema>

export const startLoginResponseSchema = z
  .object({
    accountId: z.string().uuid(),
    status: z.string(),
  })
  .strict()

export type StartLoginResponse = z.infer<typeof startLoginResponseSchema>
