"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useBranch } from "@/lib/branch"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "@/lib/i18n"
import type { BranchSettings } from "@/types"

export function BranchSettingsComponent() {
  const { currentBranch, updateBranchSettings } = useBranch()
  const { toast } = useToast()
  const { t } = useTranslation()
  const [settings, setSettings] = useState<BranchSettings>(
    currentBranch?.settings || {
      openingHours: {},
      weekStartDay: "monday",
      shiftTemplates: [],
      ratingCriteria: [],
    },
  )
  const [isLoading, setIsLoading] = useState(false)

  const daysOfWeek = [
    { key: "monday", label: t("days.monday") },
    { key: "tuesday", label: t("days.tuesday") },
    { key: "wednesday", label: t("days.wednesday") },
    { key: "thursday", label: t("days.thursday") },
    { key: "friday", label: t("days.friday") },
    { key: "saturday", label: t("days.saturday") },
    { key: "sunday", label: t("days.sunday") },
  ]

  if (!currentBranch) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">{t("branch.no_data")}</p>
        </CardContent>
      </Card>
    )
  }

  const handleOpeningHoursChange = (day: string, field: string, value: string | boolean) => {
    setSettings((prev) => ({
      ...prev,
      openingHours: {
        ...prev.openingHours,
        [day]: {
          ...prev.openingHours[day],
          [field]: value,
        },
      },
    }))
  }

  const handleSave = async () => {
    setIsLoading(true)
    const success = await updateBranchSettings(currentBranch.id, settings)

    if (success) {
      toast({
        title: "Settings saved",
        description: "Branch settings have been updated successfully.",
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("branch.information")}</CardTitle>
          <CardDescription>{t("branch.information_desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t("branch.name")}</Label>
              <p className="text-sm font-medium">{currentBranch.name}</p>
            </div>
            <div>
              <Label>{t("branch.id")}</Label>
              <p className="text-sm font-mono text-gray-600">{currentBranch.id}</p>
            </div>
          </div>
          {currentBranch.franchiseKey && (
            <div>
              <Label>{t("branch.franchise_key")}</Label>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{currentBranch.franchiseKey}</Badge>
                <span className="text-sm text-gray-500">{t("branch.synced_with_franchise")}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("branch.opening_hours")}</CardTitle>
          <CardDescription>{t("branch.opening_hours_desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {daysOfWeek.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-4">
              <div className="w-20">
                <Label className="text-sm font-medium">{label}</Label>
              </div>
              <Switch
                checked={settings.openingHours[key]?.isOpen || false}
                onCheckedChange={(checked) => handleOpeningHoursChange(key, "isOpen", checked)}
              />
              {settings.openingHours[key]?.isOpen && (
                <>
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={settings.openingHours[key]?.start || "09:00"}
                      onChange={(e) => handleOpeningHoursChange(key, "start", e.target.value)}
                      className="w-32"
                    />
                    <span className="text-sm text-gray-500">{t("time.to")}</span>
                    <Input
                      type="time"
                      value={settings.openingHours[key]?.end || "17:00"}
                      onChange={(e) => handleOpeningHoursChange(key, "end", e.target.value)}
                      className="w-32"
                    />
                  </div>
                </>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("branch.rating_criteria")}</CardTitle>
          <CardDescription>{t("branch.rating_criteria_desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {settings.ratingCriteria.map((criteria, index) => (
              <Badge key={index} variant="outline">
                {criteria}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("branch.schedule_settings")}</CardTitle>
          <CardDescription>{t("branch.schedule_settings_desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="week-start-day">{t("branch.week_start_day")}</Label>
            <Select
              value={settings.weekStartDay}
              onValueChange={(value) => setSettings((prev) => ({ ...prev, weekStartDay: value as any }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select week start day" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sunday">{t("days.sunday")}</SelectItem>
                <SelectItem value="monday">{t("days.monday")}</SelectItem>
                <SelectItem value="tuesday">{t("days.tuesday")}</SelectItem>
                <SelectItem value="wednesday">{t("days.wednesday")}</SelectItem>
                <SelectItem value="thursday">{t("days.thursday")}</SelectItem>
                <SelectItem value="friday">{t("days.friday")}</SelectItem>
                <SelectItem value="saturday">{t("days.saturday")}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">{t("branch.week_start_desc")}</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? t("branch.saving") : t("branch.save_settings")}
        </Button>
      </div>
    </div>
  )
}
