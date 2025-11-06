"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useSchedules } from "@/lib/schedules"
import { useWorkers } from "@/lib/workers"
import { useBranch } from "@/lib/branch"
import { useToast } from "@/hooks/use-toast"
import { exportScheduleToCSV, downloadCSV } from "@/lib/export"

export function BulkExport() {
  const { schedules } = useSchedules()
  const { workers } = useWorkers()
  const { currentBranch } = useBranch()
  const { toast } = useToast()
  const [selectedSchedules, setSelectedSchedules] = useState<string[]>([])
  const [exportFormat, setExportFormat] = useState<"detailed" | "summary" | "worker-hours">("detailed")
  const [isExporting, setIsExporting] = useState(false)

  if (!currentBranch) return null

  const handleScheduleToggle = (scheduleId: string, checked: boolean) => {
    setSelectedSchedules((prev) => (checked ? [...prev, scheduleId] : prev.filter((id) => id !== scheduleId)))
  }

  const handleBulkExport = async () => {
    if (selectedSchedules.length === 0) {
      toast({
        title: "No schedules selected",
        description: "Please select at least one schedule to export.",
       variant: "default",
      })
      return
    }

    setIsExporting(true)

    try {
      const shiftTemplates: { [id: string]: string } = {}
      currentBranch.settings.shiftTemplates.forEach((template) => {
        shiftTemplates[template.id] = template.name
      })

      let combinedContent = `Bulk Schedule Export - ${currentBranch.name}\n`
      combinedContent += `Exported on ${new Date().toLocaleDateString()}\n`
      combinedContent += `Format: ${exportFormat}\n`
      combinedContent += `Schedules: ${selectedSchedules.length}\n\n`

      for (const scheduleId of selectedSchedules) {
        const schedule = schedules.find((s) => s.id === scheduleId)
        if (!schedule) continue

        const exportData = {
          schedule,
          workers,
          branchName: currentBranch.name,
          shiftTemplates,
        }

        const scheduleContent = exportScheduleToCSV(exportData, exportFormat)
        combinedContent += `\n${"=".repeat(50)}\n`
        combinedContent += scheduleContent
        combinedContent += `\n${"=".repeat(50)}\n`
      }

      const filename = `bulk-schedules-${exportFormat}-${new Date().toLocaleDateString().replace(/\//g, "-")}.csv`
      downloadCSV(combinedContent, filename)

      toast({
        title: "Bulk export successful",
        description: `${selectedSchedules.length} schedules exported to ${filename}`,
      })
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export schedules. Please try again.",
       variant: "default",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const sortedSchedules = [...schedules].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
            />
          </svg>
          Bulk Export
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Export Schedules</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Export Format</CardTitle>
              <CardDescription>Choose the format for all selected schedules</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { value: "detailed", label: "Detailed Schedule", desc: "Complete shift and worker details" },
                  { value: "summary", label: "Schedule Summary", desc: "Daily totals and overview" },
                  { value: "worker-hours", label: "Worker Hours Report", desc: "Hours breakdown by worker" },
                ].map((format) => (
                  <div key={format.value} className="flex items-center space-x-3">
                    <Checkbox
                      id={format.value}
                      checked={exportFormat === format.value}
                      onCheckedChange={(checked) => {
                        if (checked) setExportFormat(format.value as typeof exportFormat)
                      }}
                    />
                    <div>
                      <label htmlFor={format.value} className="font-medium cursor-pointer">
                        {format.label}
                      </label>
                      <p className="text-sm text-gray-600">{format.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Select Schedules</CardTitle>
              <CardDescription>Choose which schedules to include in the export</CardDescription>
            </CardHeader>
            <CardContent>
              {sortedSchedules.length === 0 ? (
                <p className="text-center text-gray-500 py-4">No schedules available for export</p>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {sortedSchedules.map((schedule) => {
                    const weekStart = new Date(schedule.weekStartDate)
                    const totalShifts = schedule.shifts.length

                    return (
                      <div key={schedule.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                        <Checkbox
                          id={schedule.id}
                          checked={selectedSchedules.includes(schedule.id)}
                          onCheckedChange={(checked) => handleScheduleToggle(schedule.id, checked as boolean)}
                        />
                        <div className="flex-1">
                          <label htmlFor={schedule.id} className="font-medium cursor-pointer">
                            Week of {weekStart.toLocaleDateString()}
                          </label>
                          <p className="text-sm text-gray-600">
                            {totalShifts} shifts • Created {new Date(schedule.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button
              onClick={handleBulkExport}
              disabled={isExporting || selectedSchedules.length === 0}
              className="w-full"
            >
              {isExporting ? "Exporting..." : `Export ${selectedSchedules.length} Schedule(s)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
