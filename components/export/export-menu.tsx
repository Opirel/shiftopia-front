"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useBranch } from "@/lib/branch"
import { useWorkers } from "@/lib/workers"
import { exportScheduleToCSV, downloadCSV, exportWorkersToCSV } from "@/lib/export"
import type { Schedule } from "@/types"

interface ExportMenuProps {
  schedule?: Schedule
  type: "schedule" | "workers"
}

export function ExportMenu({ schedule, type }: ExportMenuProps) {
  const { currentBranch } = useBranch()
  const { workers } = useWorkers()
  const { toast } = useToast()
  const [showPreview, setShowPreview] = useState(false)
  const [previewContent, setPreviewContent] = useState("")
  const [previewFormat, setPreviewFormat] = useState("")

  if (!currentBranch) return null

  const handleExport = (format: "detailed" | "summary" | "worker-hours" | "workers") => {
    try {
      let content = ""
      let filename = ""

      if (type === "schedule" && schedule) {
        const shiftTemplates: { [id: string]: string } = {}
        currentBranch.settings.shiftTemplates.forEach((template) => {
          shiftTemplates[template.id] = template.name
        })

        const exportData = {
          schedule,
          workers,
          branchName: currentBranch.name,
          shiftTemplates,
        }

        content = exportScheduleToCSV(exportData, format as "detailed" | "summary" | "worker-hours")
        const weekStart = new Date(schedule.weekStartDate).toLocaleDateString().replace(/\//g, "-")
        filename = `schedule-${format}-${weekStart}.csv`
      } else if (type === "workers") {
        content = exportWorkersToCSV(workers, currentBranch.name)
        filename = `workers-${new Date().toLocaleDateString().replace(/\//g, "-")}.csv`
      }

      downloadCSV(content, filename)

      toast({
        title: "Export successful",
        description: `${filename} has been downloaded.`,
      })
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export data. Please try again.",
       variant: "default",
      })
    }
  }

  const handlePreview = (format: "detailed" | "summary" | "worker-hours" | "workers") => {
    try {
      let content = ""

      if (type === "schedule" && schedule) {
        const shiftTemplates: { [id: string]: string } = {}
        currentBranch.settings.shiftTemplates.forEach((template) => {
          shiftTemplates[template.id] = template.name
        })

        const exportData = {
          schedule,
          workers,
          branchName: currentBranch.name,
          shiftTemplates,
        }

        content = exportScheduleToCSV(exportData, format as "detailed" | "summary" | "worker-hours")
      } else if (type === "workers") {
        content = exportWorkersToCSV(workers, currentBranch.name)
      }

      setPreviewContent(content)
      setPreviewFormat(format)
      setShowPreview(true)
    } catch (error) {
      toast({
        title: "Preview failed",
        description: "Failed to generate preview. Please try again.",
       variant: "default",
      })
    }
  }

  if (type === "schedule" && !schedule) {
    return null
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {type === "schedule" && (
            <>
              <DropdownMenuItem onClick={() => handleExport("detailed")}>
                <div className="flex flex-col">
                  <span className="font-medium">Detailed Schedule</span>
                  <span className="text-xs text-gray-500">Complete shift and worker details</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("summary")}>
                <div className="flex flex-col">
                  <span className="font-medium">Schedule Summary</span>
                  <span className="text-xs text-gray-500">Daily totals and overview</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("worker-hours")}>
                <div className="flex flex-col">
                  <span className="font-medium">Worker Hours Report</span>
                  <span className="text-xs text-gray-500">Hours breakdown by worker</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handlePreview("detailed")}>Preview Detailed</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handlePreview("summary")}>Preview Summary</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handlePreview("worker-hours")}>Preview Hours</DropdownMenuItem>
            </>
          )}
          {type === "workers" && (
            <>
              <DropdownMenuItem onClick={() => handleExport("workers")}>
                <div className="flex flex-col">
                  <span className="font-medium">Worker List</span>
                  <span className="text-xs text-gray-500">Complete worker profiles and ratings</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handlePreview("workers")}>Preview Export</DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Export Preview</DialogTitle>
            <DialogDescription>Preview of {previewFormat} export format</DialogDescription>
          </DialogHeader>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">CSV Content Preview</CardTitle>
                  <CardDescription>First 20 lines of the export file</CardDescription>
                </div>
                <Badge variant="secondary">{previewFormat}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-96">
                <pre className="text-sm font-mono whitespace-pre-wrap">
                  {previewContent.split("\n").slice(0, 20).join("\n")}
                  {previewContent.split("\n").length > 20 && "\n... (truncated)"}
                </pre>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowPreview(false)}>
                  Close
                </Button>
                <Button
                  onClick={() => {
                    if (type === "schedule") {
                      handleExport(previewFormat as "detailed" | "summary" | "worker-hours")
                    } else {
                      handleExport("workers")
                    }
                    setShowPreview(false)
                  }}
                >
                  Download CSV
                </Button>
              </div>
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>
    </>
  )
}
