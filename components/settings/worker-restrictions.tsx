"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2, Plus, AlertTriangle } from "lucide-react"
import { useWorkers } from "@/lib/workers"
import { useBranch } from "@/lib/branch"
import { useAuth } from "@/lib/auth"
import { useTranslation } from "@/lib/i18n"
import type { WorkerRestriction } from "@/types"
import { localDB } from "@/lib/local-db"

export function WorkerRestrictions() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { workers } = useWorkers()
  const { currentBranch } = useBranch()
  const [restrictions, setRestrictions] = useState<WorkerRestriction[]>([])
  const [newRestriction, setNewRestriction] = useState({
    worker1Id: "",
    worker2Id: "",
    reason: "",
  })

  useEffect(() => {
    loadRestrictions()
  }, [currentBranch?.id])

  const loadRestrictions = async () => {
    if (!currentBranch?.id) return

    const allRestrictions = (await localDB.safeGet("workerRestrictions")) || []
    const branchRestrictions = allRestrictions.filter((r: WorkerRestriction) => r.branchId === currentBranch.id)
    setRestrictions(branchRestrictions)
  }

  const addRestriction = async () => {
    if (!newRestriction.worker1Id || !newRestriction.worker2Id || !newRestriction.reason || !user || !currentBranch) {
      return
    }

    if (newRestriction.worker1Id === newRestriction.worker2Id) {
      alert(t("worker_restrictions.same_worker_error"))
      return
    }

    // Check if restriction already exists
    const exists = restrictions.some(
      (r) =>
        (r.worker1Id === newRestriction.worker1Id && r.worker2Id === newRestriction.worker2Id) ||
        (r.worker1Id === newRestriction.worker2Id && r.worker2Id === newRestriction.worker1Id),
    )

    if (exists) {
      alert(t("worker_restrictions.already_exists"))
      return
    }

    const restriction: WorkerRestriction = {
      id: crypto.randomUUID(),
      branchId: currentBranch.id,
      worker1Id: newRestriction.worker1Id,
      worker2Id: newRestriction.worker2Id,
      reason: newRestriction.reason,
      createdAt: new Date().toISOString(),
      createdBy: user.id,
    }

    const allRestrictions = (await localDB.safeGet("workerRestrictions")) || []
    allRestrictions.push(restriction)
    await localDB.safeSet("workerRestrictions", allRestrictions)

    setRestrictions([...restrictions, restriction])
    setNewRestriction({ worker1Id: "", worker2Id: "", reason: "" })
  }

  const removeRestriction = async (restrictionId: string) => {
    const allRestrictions = (await localDB.safeGet("workerRestrictions")) || []
    const updatedRestrictions = allRestrictions.filter((r: WorkerRestriction) => r.id !== restrictionId)
    await localDB.safeSet("workerRestrictions", updatedRestrictions)

    setRestrictions(restrictions.filter((r) => r.id !== restrictionId))
  }

  const getWorkerName = (workerId: string) => {
    const worker = workers.find((w) => w.id === workerId)
    return worker?.name || t("worker_restrictions.unknown_worker")
  }

  const availableWorkers = workers.filter((w) => w.branchId === currentBranch?.id)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {t("worker_restrictions.title")}
          </CardTitle>
          <CardDescription>{t("worker_restrictions.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="worker1">{t("worker_restrictions.worker_1")}</Label>
              <Select
                value={newRestriction.worker1Id}
                onValueChange={(value) => setNewRestriction((prev) => ({ ...prev, worker1Id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("worker_restrictions.select_worker")} />
                </SelectTrigger>
                <SelectContent>
                  {availableWorkers.map((worker) => (
                    <SelectItem key={worker.id} value={worker.id}>
                      {worker.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="worker2">{t("worker_restrictions.worker_2")}</Label>
              <Select
                value={newRestriction.worker2Id}
                onValueChange={(value) => setNewRestriction((prev) => ({ ...prev, worker2Id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("worker_restrictions.select_worker")} />
                </SelectTrigger>
                <SelectContent>
                  {availableWorkers
                    .filter((worker) => worker.id !== newRestriction.worker1Id)
                    .map((worker) => (
                      <SelectItem key={worker.id} value={worker.id}>
                        {worker.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="reason">{t("worker_restrictions.reason")}</Label>
              <Input
                id="reason"
                value={newRestriction.reason}
                onChange={(e) => setNewRestriction((prev) => ({ ...prev, reason: e.target.value }))}
                placeholder={t("worker_restrictions.reason_placeholder")}
              />
            </div>
          </div>

          <Button
            onClick={addRestriction}
            disabled={!newRestriction.worker1Id || !newRestriction.worker2Id || !newRestriction.reason}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("worker_restrictions.add_restriction")}
          </Button>
        </CardContent>
      </Card>

      {restrictions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("worker_restrictions.current_restrictions")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {restrictions.map((restriction) => (
                <div key={restriction.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">
                      {getWorkerName(restriction.worker1Id)} ↔ {getWorkerName(restriction.worker2Id)}
                    </div>
                    <div className="text-sm text-muted-foreground">{restriction.reason}</div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeRestriction(restriction.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
