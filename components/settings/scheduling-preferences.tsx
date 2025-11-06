"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { useSettings } from "@/lib/settings"
import { useToast } from "@/hooks/use-toast"

export function SchedulingPreferences() {
  const { schedulingPreferences, updateSchedulingPreferences, loading } = useSettings()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [preferences, setPreferences] = useState(schedulingPreferences)

  const handleSave = async () => {
    setIsLoading(true)
    const success = await updateSchedulingPreferences(preferences)

    if (success) {
      toast({
        title: "Preferences saved",
        description: "Scheduling preferences have been updated successfully.",
      })
    } else {
      toast({
        title: "Error",
        description: "Failed to save preferences. Please try again.",
       variant: "default",
      })
    }
    setIsLoading(false)
  }

  const updatePreference = <K extends keyof typeof preferences>(key: K, value: (typeof preferences)[K]) => {
    setPreferences((prev) => ({ ...prev, [key]: value }))
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
        <h3 className="text-lg font-semibold">Scheduling Preferences</h3>
        <p className="text-sm text-gray-600">Configure how the scheduling algorithm should behave</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Work Hour Limits</CardTitle>
          <CardDescription>Set limits for worker scheduling to ensure compliance and well-being</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxHours">Maximum Hours Per Week</Label>
              <Input
                id="maxHours"
                type="number"
                min="1"
                max="80"
                value={preferences.maxHoursPerWeek}
                onChange={(e) => updatePreference("maxHoursPerWeek", Number.parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxDays">Maximum Consecutive Days</Label>
              <Input
                id="maxDays"
                type="number"
                min="1"
                max="7"
                value={preferences.maxConsecutiveDays}
                onChange={(e) => updatePreference("maxConsecutiveDays", Number.parseInt(e.target.value))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="minRest">Minimum Rest Hours Between Shifts</Label>
            <Input
              id="minRest"
              type="number"
              min="1"
              max="24"
              value={preferences.minRestHours}
              onChange={(e) => updatePreference("minRestHours", Number.parseInt(e.target.value))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Overtime Settings</CardTitle>
          <CardDescription>Configure overtime policies and thresholds</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Allow Overtime</Label>
              <p className="text-sm text-gray-600">Enable workers to be scheduled beyond standard hours</p>
            </div>
            <Switch
              checked={preferences.allowOvertime}
              onCheckedChange={(checked) => updatePreference("allowOvertime", checked)}
            />
          </div>
          {preferences.allowOvertime && (
            <div className="space-y-2">
              <Label htmlFor="overtimeThreshold">Overtime Threshold (hours per week)</Label>
              <Input
                id="overtimeThreshold"
                type="number"
                min="1"
                max="80"
                value={preferences.overtimeThreshold}
                onChange={(e) => updatePreference("overtimeThreshold", Number.parseInt(e.target.value))}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scheduling Algorithm</CardTitle>
          <CardDescription>Configure how the algorithm prioritizes and assigns workers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Prefer Experienced Workers</Label>
              <p className="text-sm text-gray-600">Prioritize workers with higher ratings for important shifts</p>
            </div>
            <Switch
              checked={preferences.preferExperiencedWorkers}
              onCheckedChange={(checked) => updatePreference("preferExperiencedWorkers", checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Balance Workload</Label>
              <p className="text-sm text-gray-600">Distribute hours evenly among available workers</p>
            </div>
            <Switch
              checked={preferences.balanceWorkload}
              onCheckedChange={(checked) => updatePreference("balanceWorkload", checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Prioritize Skill Match</Label>
              <p className="text-sm text-gray-600">Match workers with relevant skills to appropriate shifts</p>
            </div>
            <Switch
              checked={preferences.prioritizeSkillMatch}
              onCheckedChange={(checked) => updatePreference("prioritizeSkillMatch", checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Automation Settings</CardTitle>
          <CardDescription>Configure automatic actions and notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Send Schedule Notifications</Label>
              <p className="text-sm text-gray-600">Notify workers when schedules are published or updated</p>
            </div>
            <Switch
              checked={preferences.sendScheduleNotifications}
              onCheckedChange={(checked) => updatePreference("sendScheduleNotifications", checked)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Preferences"}
        </Button>
      </div>
    </div>
  )
}
