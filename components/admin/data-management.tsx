"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { useDataPersistence } from "@/lib/data-persistence"
import { useDataSync } from "@/lib/data-sync"
import { useToast } from "@/hooks/use-toast"

export function DataManagement() {
  const {
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
  } = useDataPersistence()

  const { validateDataIntegrity } = useDataSync()
  const { toast } = useToast()

  const [backupData, setBackupData] = useState("")
  const [importText, setImportText] = useState("")
  const [storageInfo, setStorageInfo] = useState<{ used: number; available: number } | null>(null)
  const [validationResult, setValidationResult] = useState<{ isValid: boolean; errors: string[] } | null>(null)

  const handleCreateBackup = async () => {
    try {
      const backup = await createBackup()
      setBackupData(backup)

      // Copy to clipboard
      await navigator.clipboard.writeText(backup)

      toast({
        title: "Backup created",
        description: "Backup has been created and copied to clipboard.",
      })
    } catch (error) {
      toast({
        title: "Backup failed",
        description: "Failed to create backup. Please try again.",
       variant: "default",
      })
    }
  }

  const handleRestoreBackup = async () => {
    if (!importText.trim()) {
      toast({
        title: "No backup data",
        description: "Please paste backup data to restore.",
       variant: "default",
      })
      return
    }

    const success = await restoreFromBackup(importText)
    if (success) {
      toast({
        title: "Restore successful",
        description: "Data has been restored from backup.",
      })
      setImportText("")
    } else {
      toast({
        title: "Restore failed",
        description: "Failed to restore from backup. Please check the data format.",
       variant: "default",
      })
    }
  }

  const handleExportData = async () => {
    try {
      const data = await exportData()
      await navigator.clipboard.writeText(data)

      toast({
        title: "Data exported",
        description: "All data has been exported and copied to clipboard.",
      })
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export data. Please try again.",
       variant: "default",
      })
    }
  }

  const handleGetStorageInfo = async () => {
    try {
      const info = await getStorageUsage()
      setStorageInfo(info)
    } catch (error) {
      toast({
        title: "Storage info failed",
        description: "Failed to get storage information.",
       variant: "default",
      })
    }
  }

  const handleOptimizeStorage = async () => {
    const success = await optimizeStorage()
    if (success) {
      toast({
        title: "Storage optimized",
        description: "Storage has been optimized and old data cleaned up.",
      })
      handleGetStorageInfo() // Refresh storage info
    } else {
      toast({
        title: "Optimization failed",
        description: "Failed to optimize storage. Please try again.",
       variant: "default",
      })
    }
  }

  const handleValidateData = async () => {
    try {
      const result = await validateDataIntegrity()
      setValidationResult(result)

      if (result.isValid) {
        toast({
          title: "Data validation passed",
          description: "All data is valid and consistent.",
        })
      } else {
        toast({
          title: "Data validation issues found",
          description: `Found ${result.errors.length} issues. Check the details below.`,
         variant: "default",
        })
      }
    } catch (error) {
      toast({
        title: "Validation failed",
        description: "Failed to validate data integrity.",
       variant: "default",
      })
    }
  }

  const handleClearAllData = async () => {
    if (!confirm("Are you sure you want to clear all data? This action cannot be undone.")) {
      return
    }

    const success = await clearAllData()
    if (success) {
      toast({
        title: "Data cleared",
        description: "All data has been cleared. A backup was created before clearing.",
      })
    } else {
      toast({
        title: "Clear failed",
        description: "Failed to clear data. Please try again.",
       variant: "default",
      })
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Data Management</h2>
        <p className="text-gray-600">Manage your application data, backups, and storage</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isOnline ? "bg-green-500" : "bg-red-500"}`} />
              <span className="font-medium">{isOnline ? "Online" : "Offline"}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold">{pendingChanges}</div>
              <div className="text-sm text-gray-600">Pending Changes</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-sm font-medium">Last Sync</div>
              <div className="text-xs text-gray-600">
                {lastSyncTime ? new Date(lastSyncTime).toLocaleString() : "Never"}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Backup & Restore</CardTitle>
          <CardDescription>Create backups and restore your data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={handleCreateBackup} disabled={loading}>
              Create Backup
            </Button>
            <Button onClick={handleExportData} variant="outline" disabled={loading}>
              Export All Data
            </Button>
            {pendingChanges > 0 && (
              <Button onClick={syncPendingChanges} variant="outline" disabled={loading || !isOnline}>
                Sync Changes
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Restore from Backup</label>
            <Textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Paste backup data here..."
              rows={4}
            />
            <Button onClick={handleRestoreBackup} disabled={loading || !importText.trim()}>
              Restore Backup
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Storage Management</CardTitle>
          <CardDescription>Monitor and optimize your storage usage</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={handleGetStorageInfo} variant="outline" disabled={loading}>
              Check Storage
            </Button>
            <Button onClick={handleOptimizeStorage} variant="outline" disabled={loading}>
              Optimize Storage
            </Button>
          </div>

          {storageInfo && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Storage Used</span>
                <span>
                  {formatBytes(storageInfo.used)} / {formatBytes(storageInfo.available)}
                </span>
              </div>
              <Progress value={(storageInfo.used / storageInfo.available) * 100} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Validation</CardTitle>
          <CardDescription>Check data integrity and consistency</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleValidateData} variant="outline" disabled={loading}>
            Validate Data
          </Button>

          {validationResult && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant={validationResult.isValid ? "default" : "destructive"}>
                  {validationResult.isValid ? "Valid" : "Issues Found"}
                </Badge>
              </div>

              {validationResult.errors.length > 0 && (
                <div className="space-y-1">
                  <div className="text-sm font-medium">Issues:</div>
                  {validationResult.errors.map((error, index) => (
                    <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                      {error}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
          <CardDescription>Irreversible actions that affect all your data</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleClearAllData} variant="destructive" disabled={loading}>
            Clear All Data
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
