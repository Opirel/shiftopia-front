"use client"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ChevronDown } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { useUnsavedChanges } from "@/lib/unsaved-changes"
import { useToast } from "@/hooks/use-toast"
import { useEffect, useState } from "react"
import { localDB } from "@/lib/local-db"
import { GlobalHeader } from "@/components/ui/global-header"
import { useSettings } from "@/lib/settings"
import { useTranslation } from "@/lib/i18n"
import { useAxois } from "@/lib/axois"
import { useWorkers } from "@/lib/workers"

interface TestWorker {
  id: string
  name: string
  email: string
}

export function DashboardHeader() {
  const { user, logout, quickSwitchToTestAccount, login } = useAuth()
  const { showUnsavedWarning } = useUnsavedChanges()
  const { toast } = useToast()
  const [testWorkers, setTestWorkers] = useState<TestWorker[]>([])
  const {workers} = useWorkers()
  const { settings } = useSettings()
  const { t } = useTranslation(settings?.language || "en")
  const { instance } = useAxois()

  useEffect(() => {
    const loadTestWorkers = async () => {
      try {
        //Todo need to be clear if it is pure test or not
        setTestWorkers(
          workers.map((w: any) => ({
            id: w.id,
            name: w.name,
            email: w.email,
          })),
        )
      } catch (error) {
        console.error("Error loading test workers:", error)
      }
    }

    loadTestWorkers()
  }, [user])

  const handleLogout = () => {
    showUnsavedWarning(() => {
      logout()
    })
  }

  const handleQuickSwitch = async (accountType: "admin" | "manager" | "worker") => {
    const success = await quickSwitchToTestAccount(accountType)
    if (success) {
      toast({
        title: "Account Switched",
        description: `Switched to test ${accountType} account`,
      })
    } else {
      toast({
        title: "Switch Failed",
        description: `Test ${accountType} account not found. Create it first using test mode.`,
       variant: "default",
      })
    }
  }

  const handleWorkerSwitch = async (workerEmail: string, workerName: string) => {
    try {
      const result = await login(workerEmail, "testpass123") // All test workers use same password
      if (result.success) {
        toast({
          title: "Account Switched",
          description: `Switched to ${workerName}`,
        })
      } else {
        toast({
          title: "Switch Failed",
          description: `Failed to login as ${workerName}`,
         variant: "default",
        })
      }
    } catch (error) {
      console.error("Error switching to worker:", error)
      toast({
        title: "Switch Failed",
        description: "Error switching accounts",
       variant: "default",
      })
    }
  }

  return (
    <header className="border-b bg-card">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("smart_scheduler")}</h1>
          <p className="text-sm text-muted-foreground">{user?.branchName}</p>
        </div>
        <div className="flex items-center gap-4">
          <GlobalHeader />

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => handleQuickSwitch("admin")} className="text-xs">
              Admin
            </Button>
            {user?.role != "master_admin" ?
            (<>
            <Button variant="ghost" size="sm" onClick={() => handleQuickSwitch("manager")} className="text-xs">
              Manager
            </Button>
            {testWorkers.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-xs">
                    {t("workers")} ({testWorkers.length}) <ChevronDown className="ml-1 h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {testWorkers.map((worker) => (
                    <DropdownMenuItem key={worker.id} onClick={() => handleWorkerSwitch(worker.email, worker.name)}>
                      {worker.name}
                      <span className="ml-2 text-xs text-muted-foreground">({worker.email})</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>           
            ) : (
              <Button variant="ghost" size="sm" onClick={() => handleQuickSwitch("worker")} className="text-xs">
                Worker
              </Button>
            )}</>):null}
          </div>
          <span className="text-sm text-muted-foreground">
            {t("welcome")}, {user?.name}
          </span>
          <Button variant="outline" onClick={handleLogout}>
            {t("sign_out")}
          </Button>
        </div>
      </div>
    </header>
  )
}
