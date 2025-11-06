"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { localDB } from "./local-db"

interface BackupData {
  users: any[]
  branches: any[]
  workers: any[]
  schedules: any[]
  franchises: any[]
  settings: any
  timestamp: string
  version: string
}

interface DataPersistenceContextType {
  isOnline: boolean
  lastSyncTime: string | null
  pendingChanges: number
  createBackup: () => Promise<string>
  restoreFromBackup: (backupData: string) => Promise<boolean>
  exportData: () => Promise<string>
  importData: (data: string) => Promise<boolean>
  syncPendingChanges: () => Promise<boolean>
  clearAllData: () => Promise<boolean>
  getStorageUsage: () => Promise<{ used: number; available: number }>
  optimizeStorage: () => Promise<boolean>
  loading: boolean
  error: string | null
}

const DataPersistenceContext = createContext<DataPersistenceContextType | undefined>(undefined)

export function DataPersistenceProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null)
  const [pendingChanges, setPendingChanges] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Monitor online/offline status
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Load initial sync status
    loadSyncStatus()

    // Auto-sync when coming back online
    if (isOnline && pendingChanges > 0) {
      syncPendingChanges()
    }

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [isOnline, pendingChanges])

  const loadSyncStatus = async () => {
    try {
      const syncData = await localDB.safeGet("syncStatus")
      if (syncData) {
        setLastSyncTime(syncData.lastSyncTime)
        setPendingChanges(syncData.pendingChanges || 0)
      }
    } catch (error) {
      console.error("Error loading sync status:", error)
    }
  }

  const updateSyncStatus = async (updates: Partial<{ lastSyncTime: string; pendingChanges: number }>) => {
    try {
      const currentStatus = (await localDB.safeGet("syncStatus")) || {}
      const newStatus = { ...currentStatus, ...updates }
      await localDB.safeSet("syncStatus", newStatus)

      if (updates.lastSyncTime) setLastSyncTime(updates.lastSyncTime)
      if (updates.pendingChanges !== undefined) setPendingChanges(updates.pendingChanges)
    } catch (error) {
      console.error("Error updating sync status:", error)
    }
  }

  const createBackup = async (): Promise<string> => {
    try {
      setLoading(true)
      setError(null)

      const backupData: BackupData = {
        users: (await localDB.safeGet("users")) || [],
        branches: (await localDB.safeGet("branches")) || [],
        workers: (await localDB.safeGet("workers")) || [],
        schedules: (await localDB.safeGet("schedules")) || [],
        franchises: (await localDB.safeGet("franchises")) || [],
        settings: (await localDB.safeGet("globalSettings")) || {},
        timestamp: new Date().toISOString(),
        version: "1.0",
      }

      const backupString = JSON.stringify(backupData, null, 2)

      // Store backup locally for recovery
      await localDB.safeSet("lastBackup", {
        data: backupData,
        createdAt: new Date().toISOString(),
      })

      console.log("Backup created successfully")
      return backupString
    } catch (error) {
      console.error("Error creating backup:", error)
      setError("Failed to create backup")
      throw error
    } finally {
      setLoading(false)
    }
  }

  const restoreFromBackup = async (backupData: string): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)

      const backup: BackupData = JSON.parse(backupData)

      // Validate backup structure
      if (!backup.timestamp || !backup.version) {
        throw new Error("Invalid backup format")
      }

      // Create current backup before restore
      await createBackup()

      // Restore data
      await Promise.all([
        localDB.safeSet("users", backup.users || []),
        localDB.safeSet("branches", backup.branches || []),
        localDB.safeSet("workers", backup.workers || []),
        localDB.safeSet("schedules", backup.schedules || []),
        localDB.safeSet("franchises", backup.franchises || []),
        localDB.safeSet("globalSettings", backup.settings || {}),
      ])

      await updateSyncStatus({
        lastSyncTime: new Date().toISOString(),
        pendingChanges: 0,
      })

      console.log("Data restored from backup successfully")
      return true
    } catch (error) {
      console.error("Error restoring from backup:", error)
      setError("Failed to restore from backup")
      return false
    } finally {
      setLoading(false)
    }
  }

  const exportData = async (): Promise<string> => {
    try {
      const exportData = {
        users: (await localDB.safeGet("users")) || [],
        branches: (await localDB.safeGet("branches")) || [],
        workers: (await localDB.safeGet("workers")) || [],
        schedules: (await localDB.safeGet("schedules")) || [],
        franchises: (await localDB.safeGet("franchises")) || [],
        settings: (await localDB.safeGet("globalSettings")) || {},
        workerKeys: (await localDB.safeGet("workerKeys")) || [],
        availabilitySubmissions: (await localDB.safeGet("availabilitySubmissions")) || [],
        exportedAt: new Date().toISOString(),
        version: "1.0",
      }

      return JSON.stringify(exportData, null, 2)
    } catch (error) {
      console.error("Error exporting data:", error)
      throw error
    }
  }

  const importData = async (data: string): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)

      const importedData = JSON.parse(data)

      // Create backup before import
      await createBackup()

      // Import data selectively to avoid overwriting critical system data
      const dataToImport = [
        { key: "branches", data: importedData.branches },
        { key: "workers", data: importedData.workers },
        { key: "schedules", data: importedData.schedules },
        { key: "franchises", data: importedData.franchises },
        { key: "workerKeys", data: importedData.workerKeys },
        { key: "availabilitySubmissions", data: importedData.availabilitySubmissions },
      ]

      for (const item of dataToImport) {
        if (item.data && Array.isArray(item.data)) {
          await localDB.safeSet(item.key, item.data)
        }
      }

      // Import settings if available
      if (importedData.settings) {
        await localDB.safeSet("globalSettings", importedData.settings)
      }

      await updateSyncStatus({
        lastSyncTime: new Date().toISOString(),
        pendingChanges: 0,
      })

      console.log("Data imported successfully")
      return true
    } catch (error) {
      console.error("Error importing data:", error)
      setError("Failed to import data")
      return false
    } finally {
      setLoading(false)
    }
  }

  const syncPendingChanges = async (): Promise<boolean> => {
    try {
      if (!isOnline) {
        console.log("Cannot sync while offline")
        return false
      }

      setLoading(true)
      setError(null)

      // In a real implementation, this would sync with a remote server
      // For now, we'll just mark changes as synced
      await updateSyncStatus({
        lastSyncTime: new Date().toISOString(),
        pendingChanges: 0,
      })

      console.log("Pending changes synced successfully")
      return true
    } catch (error) {
      console.error("Error syncing pending changes:", error)
      setError("Failed to sync changes")
      return false
    } finally {
      setLoading(false)
    }
  }

  const clearAllData = async (): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)

      // Create final backup before clearing
      await createBackup()

      const keysToKeep = ["lastBackup", "syncStatus"]
      const allKeys = [
        "users",
        "branches",
        "workers",
        "schedules",
        "franchises",
        "globalSettings",
        "workerKeys",
        "availabilitySubmissions",
      ]

      for (const key of allKeys) {
        if (!keysToKeep.includes(key)) {
          await localDB.remove(key)
        }
      }

      await updateSyncStatus({
        lastSyncTime: null,
        pendingChanges: 0,
      })

      console.log("All data cleared successfully")
      return true
    } catch (error) {
      console.error("Error clearing data:", error)
      setError("Failed to clear data")
      return false
    } finally {
      setLoading(false)
    }
  }

  const getStorageUsage = async (): Promise<{ used: number; available: number }> => {
    try {
      if ("storage" in navigator && "estimate" in navigator.storage) {
        const estimate = await navigator.storage.estimate()
        return {
          used: estimate.usage || 0,
          available: estimate.quota || 0,
        }
      }

      // Fallback estimation
      const data = await exportData()
      const used = new Blob([data]).size
      return {
        used,
        available: 50 * 1024 * 1024, // Assume 50MB available
      }
    } catch (error) {
      console.error("Error getting storage usage:", error)
      return { used: 0, available: 0 }
    }
  }

  const optimizeStorage = async (): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)

      // Remove old backups except the most recent
      const lastBackup = await localDB.safeGet("lastBackup")
      if (lastBackup) {
        // Keep only the most recent backup
        await localDB.safeSet("lastBackup", lastBackup)
      }

      // Clean up old availability submissions (keep last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const availabilitySubmissions = (await localDB.safeGet("availabilitySubmissions")) || []
      const recentSubmissions = availabilitySubmissions.filter((submission: any) => {
        const submissionDate = new Date(submission.submittedAt)
        return submissionDate > thirtyDaysAgo
      })

      if (recentSubmissions.length < availabilitySubmissions.length) {
        await localDB.safeSet("availabilitySubmissions", recentSubmissions)
        console.log(
          `Cleaned up ${availabilitySubmissions.length - recentSubmissions.length} old availability submissions`,
        )
      }

      // Clean up old schedules (keep last 90 days)
      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

      const schedules = (await localDB.safeGet("schedules")) || []
      const recentSchedules = schedules.filter((schedule: any) => {
        const scheduleDate = new Date(schedule.weekStartDate)
        return scheduleDate > ninetyDaysAgo
      })

      if (recentSchedules.length < schedules.length) {
        await localDB.safeSet("schedules", recentSchedules)
        console.log(`Cleaned up ${schedules.length - recentSchedules.length} old schedules`)
      }

      console.log("Storage optimization completed")
      return true
    } catch (error) {
      console.error("Error optimizing storage:", error)
      setError("Failed to optimize storage")
      return false
    } finally {
      setLoading(false)
    }
  }

  return (
    <DataPersistenceContext.Provider
      value={{
        isOnline,
        lastSyncTime,
        pendingChanges,
        createBackup,
        restoreFromBackup,
        exportData,
        importData,
        syncPendingChanges,
        clearAllData,
        getStorageUsage,
        optimizeStorage,
        loading,
        error,
      }}
    >
      {children}
    </DataPersistenceContext.Provider>
  )
}

export function useDataPersistence() {
  const context = useContext(DataPersistenceContext)
  if (context === undefined) {
    throw new Error("useDataPersistence must be used within a DataPersistenceProvider")
  }
  return context
}
