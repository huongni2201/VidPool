import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { AccountTable } from "./account-table"
import type { AccountSummary } from "@/entities/account"

const sampleAccounts: AccountSummary[] = [
  {
    id: "acc-1",
    providerKey: "seedance",
    displayName: "Seedance Alpha",
    externalIdentity: "user-alpha",
    status: "active",
    lastUsedAt: null,
    lastValidatedAt: null,
    cooldownUntil: null,
  },
  {
    id: "acc-2",
    providerKey: "dreamina",
    displayName: "Dreamina Beta",
    externalIdentity: "user-beta",
    status: "disabled",
    lastUsedAt: null,
    lastValidatedAt: null,
    cooldownUntil: null,
  },
]

describe("AccountTable widget", () => {
  const defaultProps = {
    accounts: sampleAccounts,
    onValidate: vi.fn(),
    onEnable: vi.fn(),
    onDisable: vi.fn(),
    onRelogin: vi.fn(),
    onDelete: vi.fn(),
  }

  it("renders account rows and search filters", () => {
    render(<AccountTable {...defaultProps} />)

    expect(screen.getByText("Seedance Alpha")).toBeInTheDocument()
    expect(screen.getByText("Dreamina Beta")).toBeInTheDocument()

    // Test search filter
    const searchInput = screen.getByPlaceholderText(/Tìm kiếm tài khoản/)
    fireEvent.change(searchInput, { target: { value: "Alpha" } })

    expect(screen.getByText("Seedance Alpha")).toBeInTheDocument()
    expect(screen.queryByText("Dreamina Beta")).not.toBeInTheDocument()
  })

  it("displays loading and error states", () => {
    const { rerender } = render(<AccountTable {...defaultProps} isLoading={true} />)
    expect(screen.getByText("Đang tải danh sách tài khoản…")).toBeInTheDocument()

    rerender(<AccountTable {...defaultProps} isError={true} errorMessage="Custom error message" />)
    expect(screen.getByText("Custom error message")).toBeInTheDocument()
  })

  it("displays empty state when no accounts exist", () => {
    render(<AccountTable {...defaultProps} accounts={[]} />)
    expect(screen.getByText(/Chưa có tài khoản nào trong pool/)).toBeInTheDocument()
  })
})
