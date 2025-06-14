import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/theme-provider"
import { flushSync } from "react-dom"

export function ModeToggle() {
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    // Force synchronous update
    flushSync(() => {
      setTheme(theme === "dark" ? "light" : "dark")
    })
  }

  return (
    <Button
      variant="outline"
      onClick={toggleTheme}
      className="h-8 w-8" // Custom size
    >
      <Sun className="h-8 w-8 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-8 w-8 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
