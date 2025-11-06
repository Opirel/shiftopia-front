"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { useBranch } from "./branch"
import { localDB } from "./local-db"
import { useAxois } from "./axois"

interface GlobalSettings {
  theme: "light" | "dark" | "system"
  language: "en" | "es" | "fr" | "he" // Added Hebrew language support
  notifications: {
    email: boolean
    push: boolean
    scheduleChanges: boolean
    workerUpdates: boolean
  }
  dateFormat: "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD"
  timeFormat: "12h" | "24h"
  timezone: string
}

interface SchedulingPreferences {
  id: string,
  settingsId : string,
  maxHoursPerWeek: number
  maxConsecutiveDays: number
  minRestHours: number
  allowOvertime: boolean
  overtimeThreshold: number
  preferExperiencedWorkers: boolean
  balanceWorkload: boolean
  prioritizeSkillMatch: boolean
  sendScheduleNotifications: boolean
}

interface SettingsContextType {
  globalSettings: GlobalSettings
  schedulingPreferences: SchedulingPreferences
  updateGlobalSettings: (updates: Partial<GlobalSettings>) => Promise<boolean>
  updateSchedulingPreferences: (updates: Partial<SchedulingPreferences>) => Promise<boolean>
  resetToDefaults: () => Promise<boolean>
  exportSettings: () => string
  importSettings: (settingsJson: string) => Promise<boolean>
  loading: boolean
  error: string | null
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  theme: "system",
  language: "en",
  notifications: {
    email: true,
    push: true,
    scheduleChanges: true,
    workerUpdates: true,
  },
  dateFormat: "MM/DD/YYYY",
  timeFormat: "12h",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
}

const DEFAULT_SCHEDULING_PREFERENCES: SchedulingPreferences = {
  maxHoursPerWeek: 40,
  maxConsecutiveDays: 5,
  minRestHours: 8,
  allowOvertime: false,
  overtimeThreshold: 50,
  preferExperiencedWorkers: true,
  balanceWorkload: true,
  prioritizeSkillMatch: true,
  sendScheduleNotifications: true,
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { currentBranch, updateBranchSettings } = useBranch()
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>(DEFAULT_GLOBAL_SETTINGS)
  const [schedulingPreferences, setSchedulingPreferences] =
    useState<SchedulingPreferences>(DEFAULT_SCHEDULING_PREFERENCES)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { instance } = useAxois()
  useEffect(() => {
    if (currentBranch) {
      initializeSettings()
    } else {
      resetSettingsState()
    }
  }, [currentBranch])

  useEffect(() => {
    applyTheme(globalSettings.theme)
  }, [globalSettings.theme])

  useEffect(() => {
    applyLanguage(globalSettings.language)
  }, [globalSettings.language])

  const resetSettingsState = () => {
    setGlobalSettings(DEFAULT_GLOBAL_SETTINGS)
    setSchedulingPreferences(DEFAULT_SCHEDULING_PREFERENCES)
    setLoading(false)
    setError(null)
  }

  const initializeSettings = async () => {
    try {
      setLoading(true)
      setError(null)

      await Promise.all([loadGlobalSettings(), loadSchedulingPreferences()])
    } catch (err) {
      console.error("Error initializing settings:", err)
      setError("Failed to load settings")
    } finally {
      setLoading(false)
    }
  }

  const loadGlobalSettings = async () => {
    try {
      const savedSettings = await localDB.safeGet("globalSettings")
      if (savedSettings) {
        setGlobalSettings({ ...DEFAULT_GLOBAL_SETTINGS, ...savedSettings })
        console.log("Global settings loaded")
      }
    } catch (error) {
      console.error("Error loading global settings:", error)
    }
  }

  const loadSchedulingPreferences = async () => {
    try {
      // First check branch settings
      const branchPreferences = (await instance({settingsId:(currentBranch?.settings as any)?.id}).get("/schedulingPreferences")).data;
      
      if (branchPreferences) {
        setSchedulingPreferences({ ...DEFAULT_SCHEDULING_PREFERENCES, ...branchPreferences })
        console.log("Scheduling preferences loaded from branch")
        return
      }

      // Fallback to global preferences
      const savedPreferences = await localDB.safeGet("schedulingPreferences")
      if (savedPreferences) {
        setSchedulingPreferences({ ...DEFAULT_SCHEDULING_PREFERENCES, ...savedPreferences })
        console.log("Scheduling preferences loaded from global")
      }
    } catch (error) {
      console.error("Error loading scheduling preferences:", error)
    }
  }

  const updateGlobalSettings = async (updates: Partial<GlobalSettings>): Promise<boolean> => {
    try {
      const newSettings = { ...globalSettings, ...updates }
      await localDB.safeSet("globalSettings", newSettings)
      setGlobalSettings(newSettings)
      console.log("Global settings updated")
      return true
    } catch (error) {
      console.error("Error updating global settings:", error)
      return false
    }
  }

  const updateSchedulingPreferences = async (updates: Partial<SchedulingPreferences>): Promise<boolean> => {
    const newPreferences = { ...schedulingPreferences, ...updates }
    try {
      newPreferences.settingsId  = currentBranch.settings.id;
      await instance({id:newPreferences.id}).put('/schedulingPreferences',newPreferences);
      setSchedulingPreferences(newPreferences)
      console.log("Scheduling preferences updated in branch")
      return true
    } catch (error) {
      // Fallback to global storage
      await localDB.safeSet("schedulingPreferences", newPreferences)
      setSchedulingPreferences(newPreferences)
      console.log("Scheduling preferences updated globally")
      console.error("Error updating scheduling preferences:", error)
      return false
    }
  }

  const resetToDefaults = async (): Promise<boolean> => {
    try {
      await Promise.all([
        localDB.safeSet("globalSettings", DEFAULT_GLOBAL_SETTINGS),
        localDB.safeSet("schedulingPreferences", DEFAULT_SCHEDULING_PREFERENCES),
      ])

      setGlobalSettings(DEFAULT_GLOBAL_SETTINGS)
      setSchedulingPreferences(DEFAULT_SCHEDULING_PREFERENCES)

      console.log("Settings reset to defaults")
      return true
    } catch (error) {
      console.error("Error resetting settings:", error)
      return false
    }
  }

  const exportSettings = (): string => {
    const exportData = {
      globalSettings,
      schedulingPreferences,
      exportedAt: new Date().toISOString(),
      version: "1.0",
    }
    return JSON.stringify(exportData, null, 2)
  }

  const importSettings = async (settingsJson: string): Promise<boolean> => {
    try {
      const importData = JSON.parse(settingsJson)

      if (importData.globalSettings) {
        await updateGlobalSettings(importData.globalSettings)
      }

      if (importData.schedulingPreferences) {
        await updateSchedulingPreferences(importData.schedulingPreferences)
      }

      console.log("Settings imported successfully")
      return true
    } catch (error) {
      console.error("Error importing settings:", error)
      return false
    }
  }

  const applyTheme = (theme: GlobalSettings["theme"]) => {
    const root = document.documentElement

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
      root.classList.toggle("dark", systemTheme === "dark")
    } else {
      root.classList.toggle("dark", theme === "dark")
    }
  }

  const applyLanguage = (language: GlobalSettings["language"]) => {
    document.documentElement.lang = language
    document.documentElement.dir = language === "he" ? "rtl" : "ltr"
  }

  return (
    <SettingsContext.Provider
      value={{
        globalSettings,
        schedulingPreferences,
        updateGlobalSettings,
        updateSchedulingPreferences,
        resetToDefaults,
        exportSettings,
        importSettings,
        loading,
        error,
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider")
  }
  return context
}
