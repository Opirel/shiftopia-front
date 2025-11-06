"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useSchedules } from "@/lib/schedules"
import { useBranch } from "@/lib/branch"
import { useWorkers } from "@/lib/workers"
import { useToast } from "@/hooks/use-toast"
import { ExportMenu } from "@/components/export/export-menu"
import type { Schedule, ScheduledShift, Worker } from "@/types"

interface ScheduleViewProps {
  schedule: Schedule
  onEdit?: () => void
}

const daysOfWeekTemp = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export function ScheduleView({ schedule, onEdit }: ScheduleViewProps) {
  const { saveSchedule, deleteSchedule } = useSchedules()
  const { currentBranch } = useBranch()
  const { workers } = useWorkers()
  const { toast } = useToast()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [draggedWorker, setDraggedWorker] = useState<{ workerId: string; fromShiftId: string } | null>(null)
  const [editableSchedule, setEditableSchedule] = useState<Schedule>(schedule)

  const getWorkerName = (workerId: string) => {
    const worker = workers.find((w) => w.id === workerId)
    return worker?.name || "Unknown Worker"
  }

  const getShiftTemplateName = (templateId: string) => {
    const template = currentBranch?.settings.shiftTemplates.find((t) => t.id === templateId)
    return template?.name || "Unknown Shift"
  }

  const groupShiftsByDate = () => {
    const grouped: { [date: string]: ScheduledShift[] } = {}
    editableSchedule.shifts.forEach((shift) => {
      const date = shift.date.split("T")[0];
      if (!grouped[date]) {
        grouped[date] = []
      }
      grouped[date].push(shift)
    })
    return grouped
  }

  

  const rotateArray = (arr :string[], index : number) =>{
      // Handle edge cases
      if (!Array.isArray(arr) || arr.length === 0) {
        return arr;
      }
      
      // Normalize index to be within array bounds
      const normalizedIndex = ((index % arr.length) + arr.length) % arr.length;
      
      // Slice at index and concatenate left part to the end
      const leftPart = arr.slice(0, normalizedIndex);
      const rightPart = arr.slice(normalizedIndex);
      
      return rightPart.concat(leftPart);
  }

  const handleSave = async () => {
    setIsSaving(true)
    const success = await saveSchedule(editableSchedule)
    if (success) {
      toast({
        title: "Schedule saved",
        description: "Schedule has been saved successfully.",
      })
    } else {
      toast({
        title: "Save failed",
        description: "Failed to save schedule. Please try again.",
       variant: "default",
      })
    }
    setIsSaving(false)
  }

  const handleDelete = async () => {
    const success = await deleteSchedule(schedule.id)
    if (success) {
      toast({
        title: "Schedule deleted",
        description: "Schedule has been deleted successfully.",
      })
    } else {
      toast({
        title: "Delete failed",
        description: "Failed to delete schedule. Please try again.",
       variant: "default",
      })
    }
    setShowDeleteDialog(false)
  }

  const handleDragStart = (workerId: string, shiftId: string) => {
    setDraggedWorker({ workerId, fromShiftId: shiftId })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, targetShiftId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedWorker) return

    const { workerId, fromShiftId } = draggedWorker

    // Don't allow dropping on the same shift
    if (fromShiftId === targetShiftId) {
      setDraggedWorker(null)
      return
    }

    // Find the target shift and worker
    const targetShift = editableSchedule.shifts.find((s) => s.id === targetShiftId)
    const worker = workers.find((w) => w.id === workerId)

    if (!targetShift || !worker) {
      toast({
        title: "Error",
        description: "Invalid drop target",
       variant: "default",
      })
      setDraggedWorker(null)
      return
    }

    // Check if worker is available for the target shift
    const targetDate = new Date(targetShift.date)
    const dayOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][
      targetDate.getDay()
    ]
    const shiftTemplate = currentBranch?.settings?.shiftTemplates?.find((st) => st.id === targetShift.templateId)

    if (!shiftTemplate) {
      toast({
        title: "Error",
        description: "Shift template not found",
       variant: "default",
      })
      setDraggedWorker(null)
      return
    }

    // Check worker availability
    const isAvailable = checkWorkerAvailability(worker, dayOfWeek, shiftTemplate)

    if (!isAvailable) {
      toast({
        title: "Availability Conflict",
        description: `${worker.name} is not available for this shift`,
        variant: "default",
      })
      setDraggedWorker(null)
      return
    }

    // Update the schedule
    const updatedSchedule = { ...editableSchedule }
    updatedSchedule.shifts = updatedSchedule.shifts.map((shift) => {
      if (shift.id === fromShiftId) {
        // Remove worker from original shift
        return {
          ...shift,
          assignedWorkers: shift.assignedWorkers.filter((id) => id !== workerId),
        }
      } else if (shift.id === targetShiftId) {
        // Add worker to target shift (if not already assigned)
        const alreadyAssigned = shift.assignedWorkers.includes(workerId)
        return {
          ...shift,
          assignedWorkers: alreadyAssigned ? shift.assignedWorkers : [...shift.assignedWorkers, workerId],
        }
      }
      return shift // Keep other shifts unchanged
    })

    setEditableSchedule(updatedSchedule)
    setDraggedWorker(null)

    toast({
      title: "Worker Moved",
      description: `${worker.name} has been moved to the new shift`,
    })
  }

  const checkWorkerAvailability = (worker: Worker, dayOfWeek: string, shiftTemplate: any): boolean => {
    // Check if worker has submitted availability for this specific shift
    const workerAvailabilitySubmissions = worker.availabilitySubmissions || []

    // Find the most recent availability submission
    const latestSubmission = workerAvailabilitySubmissions.sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
    )[0]

    if (latestSubmission && latestSubmission.availability) {
      const dayAvailability = latestSubmission.availability[dayOfWeek.toLowerCase()]
      if (dayAvailability && dayAvailability.shifts) {
        return dayAvailability.shifts.includes(shiftTemplate.id)
      }
    }

    // Fallback to old time-based availability format
    const availability = worker.availability?.[dayOfWeek.toLowerCase()]
    if (!availability?.available) return false

    const workerStart = new Date(`2000-01-01T${availability.start}:00`)
    const workerEnd = new Date(`2000-01-01T${availability.end}:00`)
    const shiftStart = new Date(`2000-01-01T${shiftTemplate.startTime}:00`)
    const shiftEnd = new Date(`2000-01-01T${shiftTemplate.endTime}:00`)

    return shiftStart >= workerStart && shiftEnd <= workerEnd
  }

  const groupedShifts = groupShiftsByDate()
  const weekStart = new Date(editableSchedule.weekStartDate)
  const totalShifts = editableSchedule.shifts.length
  const totalWorkerAssignments = editableSchedule.shifts.reduce((sum, shift) => sum + shift.assignedWorkers.length, 0)

  const workerStats = workers
    .map((worker) => {
      const workerShifts = editableSchedule.shifts.filter((shift) => shift.assignedWorkers.includes(worker.id))
      const totalHours = workerShifts.reduce((hours, shift) => {
        const start = new Date(`2000-01-01T${shift.startTime}:00`)
        const end = new Date(`2000-01-01T${shift.endTime}:00`)
        return hours + (end.getTime() - start.getTime()) / (1000 * 60 * 60)
      }, 0)

      return {
        worker,
        shiftsCount: workerShifts.length,
        totalHours: Math.round(totalHours * 100) / 100,
      }
    })
    .filter((stat) => stat.shiftsCount > 0)

  const allShiftTemplates = currentBranch?.settings?.shiftTemplates || []

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Schedule for Week of {weekStart.toLocaleDateString()}</CardTitle>
              <CardDescription>
                {totalShifts} shifts • {totalWorkerAssignments} worker assignments
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <ExportMenu schedule={schedule} type="schedule" />
              <Button variant="outline" onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Schedule"}
              </Button>
              {onEdit && (
                <Button variant="outline" onClick={onEdit}>
                  Edit
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(true)}
                className="text-red-600 hover:text-red-700"
              >
                Delete
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        { rotateArray(daysOfWeekTemp, (new Date(weekStart)).getDay()).map((dayName, index) => {
          const currentDate = new Date(weekStart)
          currentDate.setDate(weekStart.getDate() + index)
          const dateString = currentDate.toISOString().split("T")[0]
          const dayShifts = groupedShifts[dateString] || []
          const shiftTemplates = allShiftTemplates.filter(x => 
          x.days.some(d => d === dayName.toLowerCase())
        );
          const dayShiftTemplates = shiftTemplates.map((template) => {
            const existingShift = dayShifts.find((shift) => shift.templateId === template.id)
            return (
              existingShift || {
                id: `empty-${template.id}-${dateString}`,
                templateId: template.id,
                date: dateString,
                startTime: template.startTime,
                endTime: template.endTime,
                assignedWorkers: [],
                requiredWorkers: template.requiredWorkers,
              }
            )
          })

          return (
            <Card key={dayName} className="min-h-[200px]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">{dayName}</CardTitle>
                <CardDescription className="text-xs">{currentDate.toLocaleDateString()}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {dayShiftTemplates.length === 0 ? (
                  <p className="text-xs text-gray-500">No shifts</p>
                ) : (
                  dayShiftTemplates.map((shift) => (
                    <div
                      key={shift.id}
                      className="p-2 bg-blue-50 rounded border"
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, shift.id)}
                    >
                      <div className="text-xs font-medium text-blue-900">{getShiftTemplateName(shift.templateId)}</div>
                      <div className="text-xs text-blue-700 mb-1">
                        {shift.startTime} - {shift.endTime}
                      </div>
                      <div className="space-y-1">
                        {shift.assignedWorkers.map((workerId) => (
                          <Badge
                            key={workerId}
                            variant="secondary"
                            className="text-xs cursor-move hover:bg-gray-200"
                            draggable
                            onDragStart={() => handleDragStart(workerId, shift.id)}
                          >
                            {getWorkerName(workerId)}
                          </Badge>
                        ))}
                      </div>
                      {shift.assignedWorkers.length === 0 && (
                        <Badge variant="destructive" className="text-xs text-red-600">
                          No worker
                        </Badge>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Worker Statistics</CardTitle>
          <CardDescription>Hours and shifts for this week</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workerStats.map((stat) => (
              <div key={stat.worker.id} className="p-4 border rounded-lg">
                <div className="font-medium">{stat.worker.name}</div>
                <div className="text-sm text-gray-600 mt-1">
                  <div>{stat.shiftsCount} shifts</div>
                  <div>{stat.totalHours} hours</div>
                </div>
              </div>
            ))}
            {workerStats.length === 0 && (
              <div className="col-span-full text-center text-gray-500 py-4">No workers scheduled this week</div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Schedule Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{totalShifts}</div>
              <div className="text-sm text-gray-600">Total Shifts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{totalWorkerAssignments}</div>
              <div className="text-sm text-gray-600">Worker Assignments</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {new Set(editableSchedule.shifts.flatMap((s) => s.assignedWorkers)).size}
              </div>
              <div className="text-sm text-gray-600">Workers Scheduled</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Schedule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this schedule? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
