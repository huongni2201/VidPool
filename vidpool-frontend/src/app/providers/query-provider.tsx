import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState, type ReactNode } from "react"

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  })
}

export function QueryProvider({
  children,
  client,
}: {
  children: ReactNode
  client?: QueryClient
}) {
  const [defaultClient] = useState(() => client ?? createQueryClient())

  return (
    <QueryClientProvider client={client ?? defaultClient}>
      {children}
    </QueryClientProvider>
  )
}
