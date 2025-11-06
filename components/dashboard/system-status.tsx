"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { localDB } from "@/lib/local-db"
import { useTranslation } from "@/lib/i18n"

interface SystemStatus {
  database: "connected" | "error" | "checking"
  dataSync: "active" | "inactive" | "checking"
  lastBackup: string | null
}

export function SystemStatus() {
  const { t } = useTranslation()

  const [status, setStatus] = useState<SystemStatus>({
    database: "checking",
    dataSync: "checking",
    lastBackup: null,
  })

  useEffect(() => {
    checkSystemStatus()
  }, [])

  const checkSystemStatus = async () => {
    try {
      // Check database connection
      await localDB.init()
      const testData = await localDB.safeGet("system-test")

      setStatus({
        database: "connected",
        dataSync: "active",
        lastBackup: localStorage.getItem("last-backup") || null,
      })
    } catch (error) {
      setStatus({
        database: "error",
        dataSync: "inactive",
        lastBackup: null,
      })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "connected":
      case "active":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            {t("system_status.online")}
          </Badge>
        )
      case "error":
      case "inactive":
        return <Badge variant="destructive">{t("system_status.offline")}</Badge>
      default:
        return <Badge variant="secondary">{t("system_status.checking")}</Badge>
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("system_status.title")}</CardTitle>
        <CardDescription>{t("system_status.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm">{t("system_status.database")}</span>
          {getStatusBadge(status.database)}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm">{t("system_status.data_sync")}</span>
          {getStatusBadge(status.dataSync)}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm">{t("system_status.last_backup")}</span>
          <span className="text-xs text-gray-500">
            {status.lastBackup ? new Date(status.lastBackup).toLocaleDateString() : t("system_status.never")}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
