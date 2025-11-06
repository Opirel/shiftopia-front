"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/lib/auth"
import { useSchedules } from "@/lib/schedules"
import { useWorkers } from "@/lib/workers"
import { useBranch } from "@/lib/branch"
import { useToast } from "@/hooks/use-toast"
import { localDB } from "@/lib/local-db"
import { formatDate } from "@/lib/date-utils"
import { ArrowRightLeft, User, CheckCircle, XCircle, AlertCircle, Plus } from "lucide-react"
import type { ShiftSwitchRequest, Schedule, ScheduledShift } from "@/types"

export function ShiftSwitchRequests() {
  const { user } = useAuth()
  const { schedules } = useSchedules()
  const { workers } = useWorkers()
  const { currentBranch } = useBranch()
  const { toast } = useToast()
  const [switchRequests, setSwitchRequests] = useState<ShiftSwitchRequest[]>([])
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState<string>("")
  const [selectedShift, setSelectedShift] = useState<string>("")
  const [targetWorker, setTargetWorker] = useState<string>("")
  const [targetShift, setTargetShift] = useState<string>("")
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    loadSwitchRequests()
  }, [user?.id])

  const loadSwitchRequests = async () => {
    try {
      const allRequests = (await localDB.safeGet("shiftSwitchRequests")) || []
      const userRequests = allRequests.filter(
        (request: ShiftSwitchRequest) => request.requesterId === user?.id || request.targetWorkerId === user?.id,
      )
      setSwitchRequests(userRequests)
    } catch (error) {
      console.error("Error loading switch requests:", error)
    }
  }

  const getMyShifts = () => {
    const myShifts: Array<{ schedule: Schedule; shift: ScheduledShift }> = []

    schedules.forEach((schedule) => {
      schedule.shifts.forEach((shift) => {
        if (shift.assignedWorkers.includes(user?.id || "")) {
          myShifts.push({ schedule, shift })
        }
      })
    })

    return myShifts.filter(({ schedule }) => {
      const scheduleDate = new Date(schedule.weekStartDate)
      const now = new Date()
      return scheduleDate >= now // Only future schedules
    })
  }

  const getOtherWorkersShifts = (scheduleId: string, excludeShiftId: string) => {
    const schedule = schedules.find((s) => s.id === scheduleId)
    if (!schedule) return []

    const otherShifts: Array<{ shift: ScheduledShift; workers: string[] }> = []

    schedule.shifts.forEach((shift) => {
      if (shift.id !== excludeShiftId && shift.assignedWorkers.length > 0) {
        const otherWorkers = shift.assignedWorkers.filter((workerId) => workerId !== user?.id)
        if (otherWorkers.length > 0) {
          otherShifts.push({ shift, workers: otherWorkers })
        }
      }
    })

    return otherShifts
  }

  const getWorkerName = (workerId: string) => {
    const worker = workers.find((w) => w.id === workerId)
    return worker?.name || "Unknown Worker"
  }

  const getShiftTemplateName = (templateId: string) => {
    const template = currentBranch?.settings?.shiftTemplates?.find((t) => t.id === templateId)
    return template?.name || "Unknown Shift"
  }

  const submitSwitchRequest = async () => {
    if (!user?.id || !selectedSchedule || !selectedShift || !targetWorker || !targetShift || !reason.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
       variant: "default",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const newRequest: ShiftSwitchRequest = {
        id: crypto.randomUUID(),
        requesterId: user.id,
        requesterShiftId: selectedShift,
        targetWorkerId: targetWorker,
        targetShiftId: targetShift,
        scheduleId: selectedSchedule,
        reason: reason.trim(),
        status: "pending",
        requestedAt: new Date().toISOString(),
        managerId: user.managerId || "",
      }

      const allRequests = (await localDB.safeGet("shiftSwitchRequests")) || []
      allRequests.push(newRequest)
      await localDB.safeSet("shiftSwitchRequests", allRequests)

      setSwitchRequests([...switchRequests, newRequest])

      toast({
        title: "Switch Request Sent",
        description: `Your shift switch request has been sent to ${getWorkerName(targetWorker)}.`,
      })

      // Reset form
      setSelectedSchedule("")
      setSelectedShift("")
      setTargetWorker("")
      setTargetShift("")
      setReason("")
      setShowRequestForm(false)
    } catch (error) {
      console.error("Error submitting switch request:", error)
      toast({
        title: "Error",
        description: "Failed to submit switch request. Please try again.",
       variant: "default",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const respondToRequest = async (requestId: string, response: "approved" | "rejected") => {
    try {
      const allRequests = (await localDB.safeGet("shiftSwitchRequests")) || []
      const updatedRequests = allRequests.map((request: ShiftSwitchRequest) =>
        request.id === requestId ? { ...request, status: response, respondedAt: new Date().toISOString() } : request,
      )

      await localDB.safeSet("shiftSwitchRequests", updatedRequests)
      setSwitchRequests(
        switchRequests.map((request) =>
          request.id === requestId ? { ...request, status: response, respondedAt: new Date().toISOString() } : request,
        ),
      )

      toast({
        title: response === "approved" ? "Request Approved" : "Request Rejected",
        description: `You have ${response} the shift switch request.`,
      })
    } catch (error) {
      console.error("Error responding to request:", error)
      toast({
        title: "Error",
        description: "Failed to respond to request. Please try again.",
       variant: "default",
      })
    }
  }

  const myShifts = getMyShifts()
  const sentRequests = switchRequests.filter((r) => r.requesterId === user?.id)
  const receivedRequests = switchRequests.filter((r) => r.targetWorkerId === user?.id && r.status === "pending")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Shift Switch Requests</h2>
          <p className="text-muted-foreground">Request to switch shifts with other workers</p>
        </div>
        <Button onClick={() => setShowRequestForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Request Switch
        </Button>
      </div>

      {/* Received Requests */}
      {receivedRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Incoming Requests ({receivedRequests.length})
            </CardTitle>
            <CardDescription>Other workers want to switch shifts with you</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {receivedRequests.map((request) => {
              const schedule = schedules.find((s) => s.id === request.scheduleId)
              const requesterShift = schedule?.shifts.find((s) => s.id === request.requesterShiftId)
              const targetShift = schedule?.shifts.find((s) => s.id === request.targetShiftId)

              return (
                <div key={request.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-gray-500" />
                      <div>
                        <h4 className="font-semibold">{getWorkerName(request.requesterId)}</h4>
                        <p className="text-sm text-muted-foreground">
                          Wants to switch shifts for week of {schedule && formatDate(schedule.weekStartDate)}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">Pending</Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="p-3 bg-red-50 rounded border">
                      <p className="text-sm font-medium text-red-800">You give up:</p>
                      <p className="text-sm text-red-700">
                        {targetShift && getShiftTemplateName(targetShift.templateId)}
                        {targetShift && ` (${targetShift.startTime} - ${targetShift.endTime})`}
                      </p>
                      <p className="text-xs text-red-600">{targetShift?.date}</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded border">
                      <p className="text-sm font-medium text-green-800">You receive:</p>
                      <p className="text-sm text-green-700">
                        {requesterShift && getShiftTemplateName(requesterShift.templateId)}
                        {requesterShift && ` (${requesterShift.startTime} - ${requesterShift.endTime})`}
                      </p>
                      <p className="text-xs text-green-600">{requesterShift?.date}</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm font-medium mb-1">Reason:</p>
                    <p className="text-sm text-muted-foreground bg-gray-50 p-2 rounded">{request.reason}</p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => respondToRequest(request.id, "approved")}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Accept
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => respondToRequest(request.id, "rejected")}>
                      <XCircle className="h-4 w-4 mr-1" />
                      Decline
                    </Button>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Sent Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-blue-500" />
            My Requests ({sentRequests.length})
          </CardTitle>
          <CardDescription>Shift switch requests you've sent</CardDescription>
        </CardHeader>
        <CardContent>
          {sentRequests.length === 0 ? (
            <div className="text-center py-8">
              <ArrowRightLeft className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-muted-foreground">No shift switch requests sent yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sentRequests.map((request) => {
                const schedule = schedules.find((s) => s.id === request.scheduleId)
                const requesterShift = schedule?.shifts.find((s) => s.id === request.requesterShiftId)
                const targetShift = schedule?.shifts.find((s) => s.id === request.targetShiftId)

                return (
                  <div key={request.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold">Switch with {getWorkerName(request.targetWorkerId)}</h4>
                        <p className="text-sm text-muted-foreground">
                          Week of {schedule && formatDate(schedule.weekStartDate)}
                        </p>
                      </div>
                      <Badge
                        variant={
                          request.status === "approved"
                            ? "default"
                            : request.status === "rejected"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      <div className="p-3 bg-red-50 rounded border">
                        <p className="text-sm font-medium text-red-800">You give up:</p>
                        <p className="text-sm text-red-700">
                          {requesterShift && getShiftTemplateName(requesterShift.templateId)}
                          {requesterShift && ` (${requesterShift.startTime} - ${requesterShift.endTime})`}
                        </p>
                      </div>
                      <div className="p-3 bg-green-50 rounded border">
                        <p className="text-sm font-medium text-green-800">You receive:</p>
                        <p className="text-sm text-green-700">
                          {targetShift && getShiftTemplateName(targetShift.templateId)}
                          {targetShift && ` (${targetShift.startTime} - ${targetShift.endTime})`}
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Requested: {formatDate(request.requestedAt)}
                      {request.respondedAt && ` • Responded: ${formatDate(request.respondedAt)}`}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Form Dialog */}
      <Dialog open={showRequestForm} onOpenChange={setShowRequestForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              Request Shift Switch
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Your Shift to Switch</Label>
              <Select
                value={selectedSchedule}
                onValueChange={(value) => {
                  setSelectedSchedule(value)
                  setSelectedShift("")
                  setTargetWorker("")
                  setTargetShift("")
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a schedule" />
                </SelectTrigger>
                <SelectContent>
                  {schedules
                    .filter((schedule) => {
                      const scheduleDate = new Date(schedule.weekStartDate)
                      const now = new Date()
                      return (
                        scheduleDate >= now &&
                        schedule.shifts.some((shift) => shift.assignedWorkers.includes(user?.id || ""))
                      )
                    })
                    .map((schedule) => (
                      <SelectItem key={schedule.id} value={schedule.id}>
                        Week of {formatDate(schedule.weekStartDate)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {selectedSchedule && (
              <div className="space-y-2">
                <Label>Your Shift</Label>
                <Select
                  value={selectedShift}
                  onValueChange={(value) => {
                    setSelectedShift(value)
                    setTargetWorker("")
                    setTargetShift("")
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your shift" />
                  </SelectTrigger>
                  <SelectContent>
                    {myShifts
                      .filter(({ schedule }) => schedule.id === selectedSchedule)
                      .map(({ shift }) => (
                        <SelectItem key={shift.id} value={shift.id}>
                          {getShiftTemplateName(shift.templateId)} ({shift.startTime} - {shift.endTime}) - {shift.date}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedShift && (
              <div className="space-y-2">
                <Label>Worker to Switch With</Label>
                <Select
                  value={targetWorker}
                  onValueChange={(value) => {
                    setTargetWorker(value)
                    setTargetShift("")
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select worker" />
                  </SelectTrigger>
                  <SelectContent>
                    {getOtherWorkersShifts(selectedSchedule, selectedShift)
                      .flatMap(({ workers }) => workers)
                      .filter((workerId, index, array) => array.indexOf(workerId) === index)
                      .map((workerId) => (
                        <SelectItem key={workerId} value={workerId}>
                          {getWorkerName(workerId)}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {targetWorker && (
              <div className="space-y-2">
                <Label>Their Shift You Want</Label>
                <Select value={targetShift} onValueChange={setTargetShift}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select their shift" />
                  </SelectTrigger>
                  <SelectContent>
                    {getOtherWorkersShifts(selectedSchedule, selectedShift)
                      .filter(({ workers }) => workers.includes(targetWorker))
                      .map(({ shift }) => (
                        <SelectItem key={shift.id} value={shift.id}>
                          {getShiftTemplateName(shift.templateId)} ({shift.startTime} - {shift.endTime}) - {shift.date}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Switch</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why you need to switch shifts..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowRequestForm(false)}>
                Cancel
              </Button>
              <Button
                onClick={submitSwitchRequest}
                disabled={isSubmitting || !selectedShift || !targetShift || !reason.trim()}
              >
                {isSubmitting ? "Sending..." : "Send Request"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
