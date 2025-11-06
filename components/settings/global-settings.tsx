"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useSettings } from "@/lib/settings"
import { useToast } from "@/hooks/use-toast"

export function GlobalSettings() {
  const { globalSettings, updateGlobalSettings, resetToDefaults, exportSettings, importSettings, loading } =
    useSettings()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [settings, setSettings] = useState(globalSettings)
  const [importData, setImportData] = useState("")

  const handleSave = async () => {
    setIsLoading(true)
    const success = await updateGlobalSettings(settings)

    if (success) {
      toast({
        title: "Settings saved",
        description: "Global settings have been updated successfully.",
      })
    } else {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
       variant: "default",
      })
    }
    setIsLoading(false)
  }

  const handleReset = async () => {
    const success = await resetToDefaults()
    if (success) {
      setSettings(globalSettings)
      toast({
        title: "Settings reset",
        description: "All settings have been reset to defaults.",
      })
    } else {
      toast({
        title: "Error",
        description: "Failed to reset settings.",
       variant: "default",
      })
    }
  }

  const handleExport = () => {
    const data = exportSettings()
    navigator.clipboard.writeText(data)
    toast({
      title: "Settings exported",
      description: "Settings have been copied to clipboard.",
    })
  }

  const handleImport = async () => {
    if (!importData.trim()) {
      toast({
        title: "Invalid input",
        description: "Please paste settings data to import.",
       variant: "default",
      })
      return
    }

    const success = await importSettings(importData)
    if (success) {
      setImportData("")
      toast({
        title: "Settings imported",
        description: "Settings have been imported successfully.",
      })
    } else {
      toast({
        title: "Import failed",
        description: "Invalid settings data. Please check the format.",
       variant: "default",
      })
    }
  }

  const updateSetting = <K extends keyof typeof settings>(key: K, value: (typeof settings)[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const updateNotificationSetting = <K extends keyof typeof settings.notifications>(
    key: K,
    value: (typeof settings.notifications)[K],
  ) => {
    setSettings((prev) => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: value },
    }))
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Global Settings</h3>
        <p className="text-sm text-gray-600">Configure application-wide preferences and appearance</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Customize the look and feel of the application</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Theme</Label>
            <Select value={settings.theme} onValueChange={(value: any) => updateSetting("theme", value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Date & Time</CardTitle>
          <CardDescription>Configure how dates and times are displayed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Date Format</Label>
            <Select value={settings.dateFormat} onValueChange={(value: any) => updateSetting("dateFormat", value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Time Format</Label>
            <Select value={settings.timeFormat} onValueChange={(value: any) => updateSetting("timeFormat", value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12h">12-hour (2:00 PM)</SelectItem>
                <SelectItem value="24h">24-hour (14:00)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Configure when and how you receive notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Email Notifications</Label>
              <p className="text-sm text-gray-600">Receive notifications via email</p>
            </div>
            <Switch
              checked={settings.notifications.email}
              onCheckedChange={(checked) => updateNotificationSetting("email", checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Push Notifications</Label>
              <p className="text-sm text-gray-600">Receive browser push notifications</p>
            </div>
            <Switch
              checked={settings.notifications.push}
              onCheckedChange={(checked) => updateNotificationSetting("push", checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Schedule Changes</Label>
              <p className="text-sm text-gray-600">Notify when schedules are updated</p>
            </div>
            <Switch
              checked={settings.notifications.scheduleChanges}
              onCheckedChange={(checked) => updateNotificationSetting("scheduleChanges", checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Worker Updates</Label>
              <p className="text-sm text-gray-600">Notify when worker information changes</p>
            </div>
            <Switch
              checked={settings.notifications.workerUpdates}
              onCheckedChange={(checked) => updateNotificationSetting("workerUpdates", checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
          <CardDescription>Export, import, or reset your settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              Export Settings
            </Button>
            <Button variant="outline" onClick={handleReset}>
              Reset to Defaults
            </Button>
          </div>
          <div className="space-y-2">
            <Label>Import Settings</Label>
            <Textarea
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              placeholder="Paste exported settings data here..."
              rows={4}
            />
            <Button onClick={handleImport} disabled={!importData.trim()}>
              Import Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  )
}
