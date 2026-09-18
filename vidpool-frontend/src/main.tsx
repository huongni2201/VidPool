import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { QueryProvider } from "./app/providers"
import { Bootstrap } from "./app/bootstrap"
import { App } from "./app/App"
import "./index.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryProvider>
      <Bootstrap>
        <App />
      </Bootstrap>
    </QueryProvider>
  </StrictMode>,
)
