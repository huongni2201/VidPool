import { AppRouter } from "@/app/router/router"
import { ThemeProvider } from "@/app/providers/theme-provider"

export function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <AppRouter />
    </ThemeProvider>
  )
}
