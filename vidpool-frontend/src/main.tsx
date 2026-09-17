import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'

import { queryClient } from './lib/query-client'
import { Bootstrap } from './app/bootstrap'
import App from './App'
import './app/styles/globals.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Bootstrap>
        <App />
      </Bootstrap>
    </QueryClientProvider>
  </StrictMode>,
)
