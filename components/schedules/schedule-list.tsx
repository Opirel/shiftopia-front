"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
import { Badge } from "@/components/ui/badge"
import { useSchedules } from "@/lib/schedules"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "@/lib/i18n"
import { ScheduleGenerator } from "./schedule-generator"
import { ScheduleView } from "./schedule-view"
import { ExportMenu } from "@/components/export/export-menu"
import { formatDate } from "@/lib/date-utils"
import type { Schedule } from "@/types"
import { Calendar, Archive, Trash2, MoreVertical, Eye, Users, Clock, CheckCircle, AlertTriangle } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ScheduleList() {
  const { schedules, deleteSchedule, updateSchedule } = useSchedules()
  const { toast } = useToast()
  const { t } = useTranslation()
  const [showGenerator, setShowGenerator] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null)
  const [scheduleToDelete, setScheduleToDelete] = useState<Schedule | null>(null)
  const [scheduleToArchive, setScheduleToArchive] = useState<Schedule | null>(null)
  const [showArchived, setShowArchived] = useState(false)

  const handleScheduleGenerated = (schedule: Schedule) => {
    setShowGenerator(false)
    setSelectedSchedule(schedule)
  }

  const handleDeleteSchedule = async (schedule: Schedule) => {
    const success = await deleteSchedule(schedule.id)
    if (success) {
      toast({
        title: "Schedule deleted",
        description: `Schedule for week of ${formatDate(schedule.weekStartDate)} has been deleted.`,
      })
    } else {
      toast({
        title: "Error",
        description: "Failed to delete schedule. Please try again.",
       variant: "default",
      })
    }
    setScheduleToDelete(null)
  }

  const handleArchiveSchedule = async (schedule: Schedule) => {
    try {
      setScheduleToArchive(null) // Close dialog immediately to prevent multiple clicks

      const success = await updateSchedule(schedule.id, { archived: true })
      if (success) {
        toast({
          title: "Schedule archived",
          description: `Schedule for week of ${formatDate(schedule.weekStartDate)} has been archived.`,
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to archive schedule. Please try again.",
         variant: "default",
        })
      }
    } catch (error) {
      console.error("Error archiving schedule:", error)
      toast({
        title: "Error",
        description: "An error occurred while archiving the schedule.",
       variant: "default",
      })
    }
  }

  const handleRestoreSchedule = async (schedule: Schedule) => {
    try {
      const success = await updateSchedule(schedule.id, { archived: false })
      if (success) {
        toast({
          title: "Schedule restored",
          description: `Schedule for week of ${formatDate(schedule.weekStartDate)} has been restored.`,
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to restore schedule. Please try again.",
         variant: "default",
        })
      }
    } catch (error) {
      console.error("Error restoring schedule:", error)
      toast({
        title: "Error",
        description: "An error occurred while restoring the schedule.",
       variant: "default",
      })
    }
  }

  const activeSchedules = schedules.filter((s) => !s.archived)
  const archivedSchedules = schedules.filter((s) => s.archived)
  const displayedSchedules = showArchived ? archivedSchedules : activeSchedules

  const sortedSchedules = [...displayedSchedules].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  const getScheduleStatus = (schedule: Schedule) => {
    const weekStart = new Date(schedule.weekStartDate)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    const now = new Date()

    if (now < weekStart) {
      return { status: "upcoming", label: "Upcoming", color: "bg-blue-500" }
    } else if (now >= weekStart && now <= weekEnd) {
      return { status: "current", label: "Current", color: "bg-green-500" }
    } else {
      return { status: "past", label: "Past", color: "bg-gray-500" }
    }
  }

  if (selectedSchedule) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => setSelectedSchedule(null)}>
          ← Back to Schedules
        </Button>
        <ScheduleView schedule={selectedSchedule} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Schedules</h2>
          <p className="text-muted-foreground">Generate and manage your weekly schedules</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowArchived(!showArchived)} className="flex items-center gap-2">
            <Archive className="h-4 w-4" />
            {showArchived ? "Show Active" : "Show Archived"} (
            {showArchived ? activeSchedules.length : archivedSchedules.length})
          </Button>
          <Button onClick={() => setShowGenerator(true)} className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Generate Schedule
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Schedules</p>
                <p className="text-2xl font-bold">{schedules.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">{activeSchedules.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Archive className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-sm text-muted-foreground">Archived</p>
                <p className="text-2xl font-bold">{archivedSchedules.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">This Week</p>
                <p className="text-2xl font-bold">
                  {schedules.filter((s) => getScheduleStatus(s).status === "current").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {sortedSchedules.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-4">
                {showArchived ? <Archive className="w-12 h-12 mx-auto" /> : <Calendar className="w-12 h-12 mx-auto" />}
              </div>
              <h3 className="text-lg font-medium mb-2">
                {showArchived ? "No archived schedules" : "No schedules yet"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {showArchived
                  ? "Archived schedules will appear here when you archive them."
                  : "Create your first schedule to get started with automated scheduling."}
              </p>
              {!showArchived && (
                <Button onClick={() => setShowGenerator(true)} className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Generate Your First Schedule
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedSchedules.map((schedule) => {
            const weekStart = new Date(schedule.weekStartDate)
            const totalShifts = schedule.shifts.length
            const totalAssignments = schedule.shifts.reduce((sum, shift) => sum + shift.assignedWorkers.length, 0)
            const uniqueWorkers = new Set(schedule.shifts.flatMap((s) => s.assignedWorkers)).size
            const scheduleStatus = getScheduleStatus(schedule)

            return (
              <Card key={schedule.id} className="hover:shadow-lg transition-all duration-200 group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        Week of {formatDate(schedule.weekStartDate)}
                        <Badge variant="outline" className={`${scheduleStatus.color} text-white text-xs`}>
                          {scheduleStatus.label}
                        </Badge>
                      </CardTitle>
                      <CardDescription>Created {formatDate(schedule.createdAt)}</CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedSchedule(schedule)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Schedule
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {schedule.archived ? (
                          <DropdownMenuItem onClick={() => handleRestoreSchedule(schedule)}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Restore
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => setScheduleToArchive(schedule)}>
                            <Archive className="h-4 w-4 mr-2" />
                            Archive
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => setScheduleToDelete(schedule)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Shifts:</span>
                      </div>
                      <span className="font-medium">{totalShifts}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Assignments:</span>
                      </div>
                      <span className="font-medium">{totalAssignments}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Workers:</span>
                      </div>
                      <span className="font-medium">{uniqueWorkers}</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Coverage:</span>
                      </div>
                      <Badge
                        variant={
                          totalAssignments === 0
                            ? "destructive"
                            : totalAssignments < totalShifts
                              ? "secondary"
                              : "default"
                        }
                      >
                        {totalShifts === 0 ? "No shifts" : `${Math.round((totalAssignments / totalShifts) * 100)}%`}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 bg-transparent"
                      onClick={() => setSelectedSchedule(schedule)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <ExportMenu schedule={schedule} type="schedule" />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={showGenerator} onOpenChange={setShowGenerator}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Generate New Schedule
            </DialogTitle>
          </DialogHeader>
          <ScheduleGenerator onScheduleGenerated={handleScheduleGenerated} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!scheduleToDelete} onOpenChange={() => setScheduleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" />
              Delete Schedule
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete the schedule for week of{" "}
              <strong>{scheduleToDelete && formatDate(scheduleToDelete.weekStartDate)}</strong>? This action cannot be
              undone and will remove all shift assignments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => scheduleToDelete && handleDeleteSchedule(scheduleToDelete)}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Schedule
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!scheduleToArchive} onOpenChange={() => setScheduleToArchive(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5 text-blue-500" />
              Archive Schedule
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive the schedule for week of{" "}
              <strong>{scheduleToArchive && formatDate(scheduleToArchive.weekStartDate)}</strong>? Archived schedules
              can be restored later but won't appear in the main schedule list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => scheduleToArchive && handleArchiveSchedule(scheduleToArchive)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Archive className="h-4 w-4 mr-2" />
              Archive Schedule
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
