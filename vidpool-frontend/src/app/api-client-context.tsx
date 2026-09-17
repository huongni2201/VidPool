import { createContext, useContext, type ReactNode } from "react"
import type { ApiClient } from "@/lib/api-client"

const ApiClientContext = createContext<ApiClient | null>(null)

export function useApiClient(): ApiClient {
  const client = useContext(ApiClientContext)
  if (!client) {
    throw new Error("useApiClient must be used within an ApiClientProvider")
  }
  return client
}

export function ApiClientProvider({
  client,
  children,
}: {
  client: ApiClient
  children: ReactNode
}) {
  return (
    <ApiClientContext.Provider value={client}>
      {children}
    </ApiClientContext.Provider>
  )
}
