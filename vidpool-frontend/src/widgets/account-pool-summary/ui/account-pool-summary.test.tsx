import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { AccountPoolSummary } from "./account-pool-summary"
import type { AccountSummary } from "@/entities/account"

const sampleAccounts: AccountSummary[] = [
  {
    id: "1",
    providerKey: "seedance",
    displayName: "Account 1",
    externalIdentity: "id-1",
    status: "active",
    lastUsedAt: null,
    lastValidatedAt: null,
    cooldownUntil: null,
  },
  {
    id: "2",
    providerKey: "seedance",
    displayName: "Account 2",
    externalIdentity: "id-2",
    status: "active",
    lastUsedAt: null,
    lastValidatedAt: null,
    cooldownUntil: null,
  },
  {
    id: "3",
    providerKey: "seedance",
    displayName: "Account 3",
    externalIdentity: "id-3",
    status: "auth_required",
    lastUsedAt: null,
    lastValidatedAt: null,
    cooldownUntil: null,
  },
  {
    id: "4",
    providerKey: "seedance",
    displayName: "Account 4",
    externalIdentity: "id-4",
    status: "cooldown",
    lastUsedAt: null,
    lastValidatedAt: null,
    cooldownUntil: "2026-09-18T12:00:00Z",
  },
  {
    id: "5",
    providerKey: "seedance",
    displayName: "Account 5",
    externalIdentity: "id-5",
    status: "disabled",
    lastUsedAt: null,
    lastValidatedAt: null,
    cooldownUntil: null,
  },
]

describe("AccountPoolSummary widget", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders detailed metrics with correct derived counts and testids", () => {
    render(<AccountPoolSummary accounts={sampleAccounts} variant="detailed" />)

    expect(screen.getByTestId("metric-total")).toHaveTextContent("5")
    expect(screen.getByTestId("metric-active")).toHaveTextContent("2")
    expect(screen.getByTestId("metric-auth-required")).toHaveTextContent("1")
    expect(screen.getByTestId("metric-cooldown")).toHaveTextContent("1")
    expect(screen.getByTestId("metric-disabled")).toHaveTextContent("1")
  })

  it("renders compact summary with truthful counts for dashboard", () => {
    render(<AccountPoolSummary accounts={sampleAccounts} variant="compact" />)

    expect(screen.getByText("Account Pool")).toBeInTheDocument()
    expect(screen.getByText("5")).toBeInTheDocument()
    expect(screen.getByText("2")).toBeInTheDocument()
  })

  it("handles empty accounts gracefully with zeros", () => {
    render(<AccountPoolSummary accounts={[]} variant="detailed" />)

    expect(screen.getByTestId("metric-total")).toHaveTextContent("0")
    expect(screen.getByTestId("metric-active")).toHaveTextContent("0")
    expect(screen.getByTestId("metric-auth-required")).toHaveTextContent("0")
  })
})
