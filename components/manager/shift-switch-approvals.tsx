"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth"
import { useSchedules } from "@/lib/schedules"
import { useWorkers } from "@/lib/workers"
import { useBranch } from "@/lib/branch"
import { useToast } from "@/hooks/use-toast"
import { localDB } from "@/lib/local-db"
import { formatDate } from "@/lib/date-utils"
import { ArrowRightLeft, CheckCircle, XCircle, Clock } from "lucide-react"
import type { ShiftSwitchRequest } from "@/types"

export function ShiftSwitchApprovals() {
  const { user } = useAuth()
  const { schedules, updateSchedule } = useSchedules()
  const { workers } = useWorkers()
  const { currentBranch } = useBranch()
  const { toast } = useToast()
  const [switchRequests, setSwitchRequests] = useState<ShiftSwitchRequest[]>([])
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    loadSwitchRequests()
  }, [user?.id])

  const loadSwitchRequests = async () => {
    try {
      const allRequests = (await localDB.safeGet("shiftSwitchRequests")) || []
      const managerRequests = allRequests.filter((request: ShiftSwitchRequest) => request.managerId === user?.id)
      setSwitchRequests(managerRequests)
    } catch (error) {
      console.error("Error loading switch requests:", error)
    }
  }

  const getWorkerName = (workerId: string) => {
    const worker = workers.find((w) => w.id === workerId)
    return worker?.name || "Unknown Worker"
  }

  const getShiftTemplateName = (templateId: string) => {
    const template = currentBranch?.settings?.shiftTemplates?.find((t) => t.id === templateId)
    return template?.name || "Unknown Shift"
  }

  const approveSwitch = async (request: ShiftSwitchRequest) => {
    setProcessing(request.id)
    try {
      // Update the schedule to swap the workers
      const schedule = schedules.find((s) => s.id === request.scheduleId)
      if (!schedule) {
        throw new Error("Schedule not found")
      }

      const updatedShifts = schedule.shifts.map((shift) => {
        if (shift.id === request.requesterShiftId) {
          // Remove requester, add target worker
          return {
            ...shift,
            assignedWorkers: shift.assignedWorkers
              .filter((id) => id !== request.requesterId)
              .concat(request.targetWorkerId),
          }
        } else if (shift.id === request.targetShiftId) {
          // Remove target worker, add requester
          return {
            ...shift,
            assignedWorkers: shift.assignedWorkers
              .filter((id) => id !== request.targetWorkerId)
              .concat(request.requesterId),
          }
        }
        return shift
      })

      const success = await updateSchedule(request.scheduleId, { shifts: updatedShifts })

      if (!success) {
        throw new Error("Failed to update schedule")
      }

      // Update request status
      const allRequests = (await localDB.safeGet("shiftSwitchRequests")) || []
      const updatedRequests = allRequests.map((req: ShiftSwitchRequest) =>
        req.id === request.id ? { ...req, status: "approved", managerApprovedAt: new Date().toISOString() } : req,
      )

      await localDB.safeSet("shiftSwitchRequests", updatedRequests)
      setSwitchRequests(
        switchRequests.map((req) =>
          req.id === request.id ? { ...req, status: "approved", managerApprovedAt: new Date().toISOString() } : req,
        ),
      )

      toast({
        title: "Switch Approved",
        description: `Shift switch between ${getWorkerName(request.requesterId)} and ${getWorkerName(request.targetWorkerId)} has been approved.`,
      })
    } catch (error) {
      console.error("Error approving switch:", error)
      toast({
        title: "Error",
        description: "Failed to approve shift switch. Please try again.",
       variant: "default",
      })
    } finally {
      setProcessing(null)
    }
  }

  const rejectSwitch = async (request: ShiftSwitchRequest) => {
    setProcessing(request.id)
    try {
      const allRequests = (await localDB.safeGet("shiftSwitchRequests")) || []
      const updatedRequests = allRequests.map((req: ShiftSwitchRequest) =>
        req.id === request.id ? { ...req, status: "rejected", managerApprovedAt: new Date().toISOString() } : req,
      )

      await localDB.safeSet("shiftSwitchRequests", updatedRequests)
      setSwitchRequests(
        switchRequests.map((req) =>
          req.id === request.id ? { ...req, status: "rejected", managerApprovedAt: new Date().toISOString() } : req,
        ),
      )

      toast({
        title: "Switch Rejected",
        description: `Shift switch request has been rejected.`,
      })
    } catch (error) {
      console.error("Error rejecting switch:", error)
      toast({
        title: "Error",
        description: "Failed to reject shift switch. Please try again.",
       variant: "default",
      })
    } finally {
      setProcessing(null)
    }
  }

  const pendingRequests = switchRequests.filter((r) => r.status === "approved" && !r.managerApprovedAt)
  const processedRequests = switchRequests.filter((r) => r.managerApprovedAt)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Shift Switch Approvals</h2>
        <p className="text-muted-foreground">Review and approve worker shift switch requests</p>
      </div>

      {/* Pending Manager Approval */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            Pending Manager Approval ({pendingRequests.length})
          </CardTitle>
          <CardDescription>Shift switches that both workers have agreed to</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-muted-foreground">No shift switches pending your approval</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request) => {
                const schedule = schedules.find((s) => s.id === request.scheduleId)
                const requesterShift = schedule?.shifts.find((s) => s.id === request.requesterShiftId)
                const targetShift = schedule?.shifts.find((s) => s.id === request.targetShiftId)

                return (
                  <div key={request.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <ArrowRightLeft className="h-5 w-5 text-blue-500" />
                        <div>
                          <h4 className="font-semibold">
                            {getWorkerName(request.requesterId)} ↔ {getWorkerName(request.targetWorkerId)}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            Week of {schedule && formatDate(schedule.weekStartDate)}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">Both Workers Agreed</Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="p-3 border rounded">
                        <p className="text-sm font-medium text-blue-800">
                          {getWorkerName(request.requesterId)} gives up:
                        </p>
                        <p className="text-sm">
                          {requesterShift && getShiftTemplateName(requesterShift.templateId)}
                          {requesterShift && ` (${requesterShift.startTime} - ${requesterShift.endTime})`}
                        </p>
                        <p className="text-xs text-muted-foreground">{requesterShift?.date}</p>
                      </div>
                      <div className="p-3 border rounded">
                        <p className="text-sm font-medium text-green-800">
                          {getWorkerName(request.targetWorkerId)} gives up:
                        </p>
                        <p className="text-sm">
                          {targetShift && getShiftTemplateName(targetShift.templateId)}
                          {targetShift && ` (${targetShift.startTime} - ${targetShift.endTime})`}
                        </p>
                        <p className="text-xs text-muted-foreground">{targetShift?.date}</p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="text-sm font-medium mb-1">Reason:</p>
                      <p className="text-sm text-muted-foreground bg-gray-50 p-2 rounded">{request.reason}</p>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        Requested: {formatDate(request.requestedAt)}
                        {request.respondedAt && ` • Agreed: ${formatDate(request.respondedAt)}`}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => approveSwitch(request)}
                          disabled={processing === request.id}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          {processing === request.id ? "Processing..." : "Approve Switch"}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => rejectSwitch(request)}
                          disabled={processing === request.id}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Decisions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Recent Decisions ({processedRequests.length})
          </CardTitle>
          <CardDescription>Recently approved or rejected shift switches</CardDescription>
        </CardHeader>
        <CardContent>
          {processedRequests.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No decisions made yet</p>
          ) : (
            <div className="space-y-3">
              {processedRequests.slice(0, 10).map((request) => {
                const schedule = schedules.find((s) => s.id === request.scheduleId)

                return (
                  <div key={request.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                    <div>
                      <p className="font-medium text-sm">
                        {getWorkerName(request.requesterId)} ↔ {getWorkerName(request.targetWorkerId)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Week of {schedule && formatDate(schedule.weekStartDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={request.status === "approved" ? "default" : "destructive"} className="mb-1">
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        {request.managerApprovedAt && formatDate(request.managerApprovedAt)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
