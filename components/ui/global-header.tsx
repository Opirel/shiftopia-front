"use client"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { useSettings } from "@/lib/settings"
import { Moon, Sun, Monitor } from "lucide-react"

export function GlobalHeader() {
  const { globalSettings, updateGlobalSettings } = useSettings()

  const handleThemeChange = async (theme: "light" | "dark" | "system") => {
    await updateGlobalSettings({ theme })
  }

  const getThemeIcon = () => {
    switch (globalSettings.theme) {
      case "light":
        return <Sun className="h-4 w-4" />
      case "dark":
        return <Moon className="h-4 w-4" />
      default:
        return <Monitor className="h-4 w-4" />
    }
  }

  return (
    <div className="flex items-center gap-2 ml-auto">
      {/* Theme Selector */}
      <Select value={globalSettings.theme} onValueChange={handleThemeChange}>
        <SelectTrigger className="w-auto border-none shadow-none">
          <div className="flex items-center gap-2">
            {getThemeIcon()}
            <span className="sr-only">Theme</span>
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="light">
            <div className="flex items-center gap-2">
              <Sun className="h-4 w-4" />
              Light
            </div>
          </SelectItem>
          <SelectItem value="dark">
            <div className="flex items-center gap-2">
              <Moon className="h-4 w-4" />
              Dark
            </div>
          </SelectItem>
          <SelectItem value="system">
            <div className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              System
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
