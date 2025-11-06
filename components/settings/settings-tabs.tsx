"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BranchSettingsComponent } from "@/components/branch/branch-settings"
import { ShiftTemplateManager } from "./shift-template-manager"
import { RatingCriteriaManager } from "./rating-criteria-manager"
import { SchedulingPreferences } from "./scheduling-preferences"
import { GlobalSettings } from "./global-settings"
import { RoleManager } from "./role-manager"
import { WorkerRestrictions } from "./worker-restrictions"
import { useTranslation } from "@/lib/i18n"

export function SettingsTabs() {
  const [activeTab, setActiveTab] = useState("general")
  const { t } = useTranslation()

  const settingsTabs = [
    { id: "general", label: t("settings.general") },
    { id: "global", label: t("settings.global") },
    { id: "shifts", label: t("settings.shift_templates") },
    { id: "roles", label: t("settings.roles") },
    { id: "restrictions", label: t("settings.worker_restrictions") },
    { id: "criteria", label: t("settings.rating_criteria") },
    { id: "scheduling", label: t("settings.scheduling") },
  ]

  const renderContent = () => {
    switch (activeTab) {
      case "general":
        return <BranchSettingsComponent />
      case "global":
        return <GlobalSettings />
      case "shifts":
        return <ShiftTemplateManager />
      case "roles":
        return <RoleManager />
      case "restrictions":
        return <WorkerRestrictions />
      case "criteria":
        return <RatingCriteriaManager />
      case "scheduling":
        return <SchedulingPreferences />
      default:
        return <BranchSettingsComponent />
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">{t("settings.title")}</h2>
        <p className="text-muted-foreground">{t("settings.description")}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1">
          <CardContent className="p-4">
            <nav className="space-y-2">
              {settingsTabs.map((tab) => (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </Button>
              ))}
            </nav>
          </CardContent>
        </Card>

        <div className="lg:col-span-3">{renderContent()}</div>
      </div>
    </div>
  )
}
