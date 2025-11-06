"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/lib/auth"
import { useTranslation } from "@/lib/i18n"

interface DashboardNavProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export function DashboardNav({ activeTab, onTabChange }: DashboardNavProps) {
  const { isWorker } = useAuth()
  const { t } = useTranslation()

  const navItems = isWorker()
    ? [
        { id: "overview", label: t("nav.overview") },
        { id: "schedules", label: t("nav.my_schedules") },
        { id: "availability", label: t("nav.availability") },
      ]
    : [
        { id: "overview", label: t("nav.overview") },
        { id: "branch", label: t("nav.settings") },
        { id: "workers", label: t("nav.workers") },
        { id: "worker-keys", label: t("nav.worker_keys") },
        { id: "availability-approvals", label: t("nav.availability_approvals") },
        { id: "manager-availability", label: t("nav.manager_availability") },
        { id: "schedules", label: t("nav.schedules") },
        { id: "insights", label: "Insights" },
        { id: "franchise", label: t("nav.franchise") },
        { id: "test-mode", label: t("nav.test_mode") },
      ]

  return (
    <Card>
      <CardContent className="p-4">
        <nav className="space-y-2">
          {navItems.map((item) => (
            <Button
              key={item.id}
              variant={activeTab === item.id ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => onTabChange(item.id)}
            >
              {item.label}
            </Button>
          ))}
        </nav>
      </CardContent>
    </Card>
  )
}
