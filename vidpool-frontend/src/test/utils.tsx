import { render, type RenderOptions } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter } from "react-router-dom"
import type { ReactElement, ReactNode } from "react"
import { ApiClientProvider } from "@/shared/api"
import type { ApiClient } from "@/shared/api"
import { createMockApiClient } from "./mocks"

export interface ExtendedRenderOptions extends Omit<RenderOptions, "queries"> {
  client?: ApiClient
  initialEntries?: string[]
}

export function renderWithProviders(
  ui: ReactElement,
  {
    client = createMockApiClient(),
    initialEntries = ["/"],
    ...renderOptions
  }: ExtendedRenderOptions = {}
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ApiClientProvider client={client}>
          <MemoryRouter initialEntries={initialEntries}>
            {children}
          </MemoryRouter>
        </ApiClientProvider>
      </QueryClientProvider>
    )
  }

  return { ...render(ui, { wrapper: Wrapper, ...renderOptions }), queryClient, client }
}
