"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { useSchedules } from "@/lib/schedules"
import { useBranch } from "@/lib/branch"
import { useWorkers } from "@/lib/workers"
import { useToast } from "@/hooks/use-toast"
import type { Schedule } from "@/types"

interface ScheduleGeneratorProps {
  onScheduleGenerated: (schedule: Schedule) => void
}

export function ScheduleGenerator({ onScheduleGenerated }: ScheduleGeneratorProps) {
  const { generateSchedule } = useSchedules()
  const { currentBranch } = useBranch()
  const { workers, availabilitySubmissions } = useWorkers()
  const { toast } = useToast()
  const [isGenerating, setIsGenerating] = useState(false)
  const [weekStartDate, setWeekStartDate] = useState(() => {
    const today = new Date()
    const monday = new Date(today)
    monday.setDate(today.getDate() - today.getDay() + 1)
    return monday.toISOString().split("T")[0]
  })
  const [selectedShifts, setSelectedShifts] = useState<string[]>([])

  const getWeeksWithAvailability = () => {
    const weeks = new Set<string>()
    availabilitySubmissions.forEach((submission) => {
      if (submission.weekStartDate) {
        weeks.add(submission.weekStartDate)
      }
    })
    return Array.from(weeks).sort()
  }

  const hasAvailabilityForWeek = (week: string) => {
    return availabilitySubmissions.some(
      (submission) => submission.weekStartDate.substring(0, 10) === week && submission.status === "approved",
    )
  }

  const weeksWithAvailability = getWeeksWithAvailability()
  const currentWeekHasAvailability = hasAvailabilityForWeek(weekStartDate)

  if (!currentBranch) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">No branch data available</p>
        </CardContent>
      </Card>
    )
  }

  if (workers.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Workers Available</h3>
            <p className="text-gray-600">Add workers to your team before generating schedules.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const handleShiftToggle = (shiftId: string, checked: boolean) => {
    setSelectedShifts((prev) => (checked ? [...prev, shiftId] : prev.filter((id) => id !== shiftId)))
  }

  const handleGenerate = async () => {
    if (selectedShifts.length === 0) {
      toast({
        title: "No shifts selected",
        description: "Please select at least one shift template to generate a schedule.",
       variant: "default",
      })
      return
    }

    setIsGenerating(true)
    try {
      const schedule = await generateSchedule(weekStartDate, selectedShifts)
      onScheduleGenerated(schedule)
      toast({
        title: "Schedule generated!",
        description: `Created schedule for week of ${new Date(weekStartDate).toLocaleDateString()} with ${
          schedule.shifts.length
        } shifts.`,
      })
    } catch (error) {
      toast({
        title: "Generation failed",
        description: "Failed to generate schedule. Please try again.",
       variant: "default",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate New Schedule</CardTitle>
        <CardDescription>Create an optimized weekly schedule based on worker availability and ratings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="weekStart">Week Starting Date (Monday)</Label>
          <Input
            id="weekStart"
            type="date"
            value={weekStartDate}
            onChange={(e) => setWeekStartDate(e.target.value)}
            className="max-w-xs"
          />

          {weeksWithAvailability.length > 0 && (
            <div className="mt-2">
              <p className="text-sm text-gray-600 mb-2">Weeks with worker availability submissions:</p>
              <div className="flex flex-wrap gap-2">
                {weeksWithAvailability.map((week) => (
                  <button
                    key={week}
                    onClick={() => setWeekStartDate(week)}
                    className={`px-3 py-1 text-xs rounded-full border ${
                      week === weekStartDate
                        ? "bg-blue-100 border-blue-300 text-blue-800"
                        : "bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {new Date(week).toLocaleDateString()}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!currentWeekHasAvailability && weeksWithAvailability.length > 0 && (
            <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center">
                <svg className="w-4 h-4 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
                <p className="text-sm text-yellow-800">
                  No approved worker availability found for week of {new Date(weekStartDate).toLocaleDateString()}.
                  Click a week above that has approved availability submissions.
                </p>
              </div>
            </div>
          )}

          {weeksWithAvailability.length === 0 && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <svg className="w-4 h-4 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
                <p className="text-sm text-red-800">
                  No approved worker availability submissions found. Workers need to submit their availability and you
                  need to approve them before generating schedules.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Label>Select Shift Templates</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentBranch.settings.shiftTemplates.map((template) => (
              <div key={template.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                <Checkbox
                  id={template.id}
                  checked={selectedShifts.includes(template.id)}
                  onCheckedChange={(checked) => handleShiftToggle(template.id, checked as boolean)}
                />
                <div className="flex-1">
                  <Label htmlFor={template.id} className="font-medium cursor-pointer">
                    {template.name}
                  </Label>
                  <div className="text-sm text-gray-600">
                    {template.startTime} - {template.endTime} • {template.requiredWorkers} worker
                    {template.requiredWorkers !== 1 ? "s" : ""} • Priority {template.priority}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {currentBranch.settings.shiftTemplates.length === 0 && (
            <p className="text-sm text-gray-500">
              No shift templates configured. Add shift templates in Branch Settings to generate schedules.
            </p>
          )}
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Scheduling Algorithm</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Considers worker availability and time constraints</li>
            <li>• Prioritizes workers with higher skill ratings</li>
            <li>• Ensures fair distribution (max 40 hours per worker)</li>
            <li>• Assigns experienced workers to high-priority shifts</li>
          </ul>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={isGenerating || selectedShifts.length === 0 || !currentWeekHasAvailability}
          className="w-full"
        >
          {isGenerating ? "Generating Schedule..." : "Generate Schedule"}
        </Button>
      </CardContent>
    </Card>
  )
}
