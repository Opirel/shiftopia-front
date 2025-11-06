"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth"
import { useBranch } from "@/lib/branch"
import { useWorkers } from "@/lib/workers"
import { useSchedules } from "@/lib/schedules"
import { useSettings } from "@/lib/settings"
import { useTranslation } from "@/lib/i18n"
import { LoginForm } from "@/components/auth/login-form"
import { SignupForm } from "@/components/auth/signup-form"
import { WorkerSignupForm } from "@/components/auth/worker-signup-form"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { SettingsTabs } from "@/components/settings/settings-tabs"
import { FranchiseSync } from "@/components/branch/franchise-sync"
import { WorkerList } from "@/components/workers/worker-list"
import { ScheduleList } from "@/components/schedules/schedule-list"
import { BulkExport } from "@/components/export/bulk-export"
import { MasterAdminDashboard } from "@/components/admin/master-admin-dashboard"
import { WorkerDashboard } from "@/components/worker/worker-dashboard"
import { WorkerKeyManager } from "@/components/manager/worker-key-manager"
import { ManagerTestMode } from "@/components/manager/manager-test-mode"
import { AvailabilityApprovals } from "@/components/manager/availability-approvals"
import { ManagerAvailability } from "@/components/manager/manager-availability"
import { TimeOffApprovals } from "@/components/manager/time-off-approvals"
import { ShiftSwitchApprovals } from "@/components/manager/shift-switch-approvals"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { DisabledAccountBanner } from "@/components/ui/disabled-account-banner"
import { Toaster } from "@/components/ui/toaster"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ManagerInsights } from "@/components/manager/manager-insights"
import { ArrowRightLeft } from "lucide-react"
import {
  Calendar,
  Users,
  Settings,
  Clock,
  BarChart3,
  FileText,
  CheckCircle,
  AlertCircle,
  Building2,
  Key,
  TestTube,
} from "lucide-react"
import { localDB } from "@/lib/local-db"
import { useAxois } from "@/lib/axois"

export default function HomePage() {
  const { isAuthenticated, isMasterAdmin, isWorker, user } = useAuth()
  const { currentBranch, loading: branchLoading } = useBranch()
  const { workers, loading: workersLoading } = useWorkers()
  const { schedules, loading: schedulesLoading } = useSchedules()
  const settings = useSettings()
  const { t } = useTranslation()
  const [showSignup, setShowSignup] = useState(false)
  const [showWorkerSignup, setShowWorkerSignup] = useState(false)
  const [activeView, setActiveView] = useState("dashboard")
  const [timeOffCount, setTimeOffCount] = useState(0)
  const [availabilityCount, setAvailabilityCount] = useState(0)

  const { instance } = useAxois()
  useEffect(() => {
    if (settings?.globalSettings) {
      // Apply theme
      const root = document.documentElement
      if (settings.globalSettings.theme === "dark") {
        root.classList.add("dark")
      } else {
        root.classList.remove("dark")
      }
    }
  }, [settings?.globalSettings])

  useEffect(() => {
    if (!isAuthenticated) {
      setShowSignup(false)
      setShowWorkerSignup(false)
      setActiveView("dashboard")
    }
  }, [isAuthenticated])

  useEffect(() => {
    const loadTimeOffCount = async () => {
      try {
        const timeOffRequests = (await localDB.safeGet("timeOffRequests")) || []
        const pendingCount = timeOffRequests.filter((request: any) => request.status === "pending").length
        setTimeOffCount(pendingCount)
      } catch (error) {
        console.error("Error loading time-off requests:", error)
      }
    }

    const loadAvailabilityCount = async () => {
      try {
        //todo enum "pending"
        const pendingCount = (await instance({status: "pending", managerId: user?.id}).get("/availabilitySubmissionscount")).data|| []; 
        //const availabilitySubmissions = (await localDB.safeGet("availabilitySubmissions")) || []
        // const pendingCount = availabilitySubmissions.filter(
        //   (submission: any) => submission.status === "pending" && submission.managerId === user?.id,
        // ).length
        setAvailabilityCount(pendingCount)
      } catch (error) {
        console.error("Error loading availability submissions:", error)
      }
    }

    if (isAuthenticated && !isWorker()) {
      loadTimeOffCount()
      loadAvailabilityCount()
      // Set up interval to refresh counts every 30 seconds
      const interval = setInterval(() => {
        loadTimeOffCount()
        loadAvailabilityCount()
      }, 30000)
      return () => clearInterval(interval)
    }
  }, [isAuthenticated, isWorker, user?.id])

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {showWorkerSignup ? (
            <WorkerSignupForm onBack={() => setShowWorkerSignup(false)} />
          ) : showSignup ? (
            <SignupForm onSwitchToLogin={() => setShowSignup(false)} />
          ) : (
            <LoginForm
              onSwitchToSignup={() => setShowSignup(true)}
              onSwitchToWorkerSignup={() => setShowWorkerSignup(true)}
            />
          )}
        </div>
        <Toaster />
      </div>
    )
  }

  if (isMasterAdmin()) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <div className="container mx-auto px-4 py-8">
          <DisabledAccountBanner />
          <MasterAdminDashboard />
        </div>
        <Toaster />
      </div>
    )
  }

  if (isWorker()) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <div className="container mx-auto px-4 py-8">
          <DisabledAccountBanner />
          <WorkerDashboard />
        </div>
        <Toaster />
      </div>
    )
  }

  if (branchLoading || workersLoading || schedulesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-muted-foreground">{t("loading_dashboard")}</p>
        </div>
      </div>
    )
  }

  const quickActions = [
    {
      id: "schedules",
      title: t("schedules"),
      description: t("view_and_manage_schedules"),
      icon: Calendar,
      color: "bg-blue-500",
      count: schedules.length,
      action: () => setActiveView("schedules"),
    },
    {
      id: "workers",
      title: t("workers"),
      description: t("manage_team_members"),
      icon: Users,
      color: "bg-green-500",
      count: workers.length,
      action: () => setActiveView("workers"),
    },
    {
      id: "availability",
      title: t("availability"),
      description: t("review_worker_availability"),
      icon: Clock,
      color: "bg-orange-500",
      count: availabilityCount,
      action: () => setActiveView("availability"),
    },
    {
      id: "time-off",
      title: t("time_off.title"),
      description: t("time_off.manage_requests"),
      icon: Calendar,
      color: "bg-purple-500",
      count: timeOffCount,
      action: () => setActiveView("time-off"),
    },
    {
      id: "shift-switch",
      title: "Shift Switches",
      description: "Approve worker shift switch requests",
      icon: ArrowRightLeft,
      color: "bg-indigo-500",
      count: 0, // TODO: Add pending switch count
      action: () => setActiveView("shift-switch"),
    },
    {
      id: "settings",
      title: t("settings"),
      description: t("configure_branch_settings"),
      icon: Settings,
      color: "bg-gray-500",
      action: () => setActiveView("settings"),
    },
  ]

  const adminActions = [
    {
      id: "worker-keys",
      title: t("worker_keys"),
      description: t("manage_worker_access"),
      icon: Key,
      color: "bg-indigo-500",
      action: () => setActiveView("worker-keys"),
    },
    {
      id: "franchise",
      title: t("franchise"),
      description: t("franchise_management"),
      icon: Building2,
      color: "bg-cyan-500",
      action: () => setActiveView("franchise"),
    },
    {
      id: "test-mode",
      title: t("test_mode"),
      description: t("testing_and_debugging"),
      icon: TestTube,
      color: "bg-pink-500",
      action: () => setActiveView("test-mode"),
    },
    {
      id: "insights",
      title: t("insights"),
      description: t("manager_insights"),
      icon: BarChart3,
      color: "bg-teal-500",
      action: () => setActiveView("insights"),
    },
  ]

  const renderContent = () => {
    switch (activeView) {
      case "settings":
        return <SettingsTabs />
      case "franchise":
        return <FranchiseSync />
      case "workers":
        return <WorkerList />
      case "schedules":
        return <ScheduleList />
      case "worker-keys":
        return <WorkerKeyManager />
      case "test-mode":
        return <ManagerTestMode />
      case "availability":
        return (
          <div className="space-y-6">
            <AvailabilityApprovals />
            <ManagerAvailability />
          </div>
        )
      case "time-off":
        return <TimeOffApprovals />
      case "shift-switch":
        return <ShiftSwitchApprovals />
      case "insights":
        return <ManagerInsights />
      default:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-bold text-foreground">{t("welcome_to_smart_scheduler")}</h1>
              <p className="text-xl text-muted-foreground">{t("intelligent_scheduling_solution")}</p>
              {currentBranch && (
                <div className="flex items-center justify-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  <span className="text-lg font-semibold text-blue-600">{currentBranch.name}</span>
                  <Badge variant="secondary">
                    {t("active_since")} {new Date(currentBranch.createdAt).toLocaleDateString()}
                  </Badge>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {quickActions.map((action) => (
                <Card
                  key={action.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={action.action}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className={`p-2 rounded-lg ${action.color} text-white`}>
                        <action.icon className="h-6 w-6" />
                      </div>
                      {action.count !== undefined && (
                        <Badge variant="outline" className="text-lg font-bold">
                          {action.count}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg">{action.title}</CardTitle>
                    <CardDescription>{action.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">{t("admin_tools")}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {adminActions.map((action) => (
                  <Card
                    key={action.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={action.action}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${action.color} text-white`}>
                          <action.icon className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{action.title}</CardTitle>
                          <CardDescription className="text-sm">{action.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    {t("quick_stats")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">{t("total_workers")}</span>
                    <span className="font-semibold">{workers.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">{t("total_schedules")}</span>
                    <span className="font-semibold">{schedules.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">{t("branch_status")}</span>
                    <Badge variant="outline" className="text-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {t("active")}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    {t("recent_activity")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      {t("system_online_and_ready")}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      {workers.length} {t("workers_registered")}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      {schedules.length} {t("schedules_generated")}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {schedules.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {t("export_data")}
                  </CardTitle>
                  <CardDescription>{t("export_schedules_and_reports")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <BulkExport />
                </CardContent>
              </Card>
            )}
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <div className="container mx-auto px-4 py-8">
        <DisabledAccountBanner />

        {activeView !== "dashboard" && (
          <div className="mb-6">
            <Button variant="ghost" onClick={() => setActiveView("dashboard")} className="mb-4">
              ← {t("back_to_dashboard")}
            </Button>
          </div>
        )}

        {renderContent()}
      </div>
      <Toaster />
    </div>
  )
}
