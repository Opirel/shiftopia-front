"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "@/lib/i18n"

export function QuickActions() {
  const { user, isMasterAdmin } = useAuth()
  const { toast } = useToast()
  const { t } = useTranslation()

  const quickActions = [
    {
      title: t("quick_actions.generate_schedule"),
      description: t("quick_actions.generate_schedule_desc"),
      action: () => {
        toast({ title: t("toast.schedule_generation_started") })
      },
      show: !isMasterAdmin(),
    },
    {
      title: t("quick_actions.add_worker"),
      description: t("quick_actions.add_worker_desc"),
      action: () => {
        toast({ title: t("toast.worker_key_generated") })
      },
      show: !isMasterAdmin(),
    },
    {
      title: t("quick_actions.view_reports"),
      description: t("quick_actions.view_reports_desc"),
      action: () => {
        toast({ title: t("toast.reports_opened") })
      },
      show: !isMasterAdmin(),
    },
    {
      title: t("quick_actions.create_franchise"),
      description: t("quick_actions.create_franchise_desc"),
      action: () => {
        toast({ title: t("toast.franchise_creation_started") })
      },
      show: isMasterAdmin(),
    },
  ]

  const visibleActions = quickActions.filter((action) => action.show)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("quick_actions.title")}</CardTitle>
        <CardDescription>{t("quick_actions.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2">
          {visibleActions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              className="justify-start h-auto p-4 bg-transparent"
              onClick={action.action}
            >
              <div className="text-left">
                <div className="font-medium">{action.title}</div>
                <div className="text-sm text-gray-500">{action.description}</div>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
