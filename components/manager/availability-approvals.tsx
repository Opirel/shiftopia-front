"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useWorkers } from "@/lib/workers"
import { useAuth } from "@/lib/auth"
import { useBranch } from "@/lib/branch"
import { toast } from "@/hooks/use-toast"
import {
  CheckCircle,
  XCircle,
  Clock,
  User,
  Calendar,
  AlertTriangle,
  TrendingUp,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import type { WorkerAvailabilitySubmission } from "@/types"
import { localDB } from "@/lib/local-db"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAxois } from "@/lib/axois"

export function AvailabilityApprovals() {
  const { availabilitySubmissions, workers, refreshWorkers } = useWorkers()
  const { user } = useAuth()
  const { currentBranch } = useBranch()
  const [processing, setProcessing] = useState<string | null>(null)
  const [selectedWeek, setSelectedWeek] = useState("")
  const [expandedShortfalls, setExpandedShortfalls] = useState<Record<string, boolean>>({})
  const [expandedAvailability, setExpandedAvailability] = useState<Record<string, boolean>>({})

  const { instance } = useAxois()
  useEffect(() => {
    const today = new Date()
    const monday = new Date(today)
    monday.setDate(today.getDate() - today.getDay() + 1)
    setSelectedWeek(monday.toISOString().split("T")[0])
  }, [])

  const pendingSubmissions = availabilitySubmissions.filter(
    (submission) => submission.managerId === user?.id && submission.status.toLowerCase() === "pending",
  )

  const approvedSubmissions = availabilitySubmissions.filter(
    (submission) => submission.managerId === user?.id && submission.status.toLowerCase() === "approved",
  )

  const rejectedSubmissions = availabilitySubmissions.filter(
    (submission) => submission.managerId === user?.id && submission.status.toLowerCase() === "rejected",
  )

  const handleApproval = async (submissionId: string, status: "approved" | "rejected") => {
    setProcessing(submissionId)

    try {
      //todo solve filter
      const allSubmissions = (await instance({}).get("/availabilitySubmissions")).data|| []; 
      //const allSubmissions = (await localDB.safeGet("availabilitySubmissions")) || []
      const updatedSubmissions = allSubmissions.map((submission: WorkerAvailabilitySubmission) =>
        submission.id === submissionId ? { ...submission, status, processedAt: new Date().toISOString() } : submission,
      )

      await localDB.safeSet("availabilitySubmissions", updatedSubmissions)
      await instance({submissionId, status}).put("/availabilitySubmissions"); 
      const allWorkers = (await localDB.safeGet("workers")) || []
      const updatedWorkers = allWorkers.map((worker: any) => {
        if (worker.availabilitySubmissions) {
          worker.availabilitySubmissions = worker.availabilitySubmissions.map(
            (submission: WorkerAvailabilitySubmission) =>
              submission.id === submissionId
                ? { ...submission, status, processedAt: new Date().toISOString() }
                : submission,
          )
        }
        return worker
      })

      await localDB.safeSet("workers", updatedWorkers)

      await refreshWorkers()

      toast({
        title: status === "approved" ? "Availability Approved" : "Availability Rejected",
        description: `Worker availability has been ${status}.`,
      })
    } catch (error) {
      console.error("Error processing availability:", error)
      toast({
        title: "Error",
        description: "Failed to process availability. Please try again.",
       variant: "default",
      })
    } finally {
      setProcessing(null)
    }
  }

  const getWorkerName = (workerId: string) => {
    const worker = workers.find((w) => w.id === workerId)
    return worker?.name || "Unknown Worker"
  }

  const formatAvailability = (availability: any) => {
    const days = Object.keys(availability).filter((day) => availability[day].available)
    return days.length > 0 ? `${days.length} days available` : "No availability"
  }

  const analyzeCoverage = (weekStartDate: string) => {
    if (!currentBranch?.settings?.shiftTemplates) return null

    const selectedDate = new Date(weekStartDate)
    const monday = new Date(selectedDate)
    const dayOfWeek = selectedDate.getDay()
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    monday.setDate(selectedDate.getDate() + daysToMonday)
    const mondayString = monday.toISOString().split("T")[0]

    const weekSubmissions = availabilitySubmissions.filter(
      (submission) =>
        submission.managerId === user?.id &&
        submission.status === "approved" &&
        submission.weekStartDate.substring(0, 10) === mondayString,
    )

    const shiftTemplates = currentBranch.settings.shiftTemplates
    const daysOfWeek = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    const openingHours = currentBranch.settings.openingHours || {}

    const coverage = {
      totalRequired: 0,
      totalAvailable: 0,
      shortfalls: [] as Array<{ day: string; shift: string; required: number; available: number }>,
      weekStartDate: mondayString,
    }

    daysOfWeek.forEach((day) => {
      if (!openingHours[day]?.isOpen) return

      shiftTemplates.forEach((template) => {
        const availableWorkers = weekSubmissions.filter((submission) => {
          const dayAvailability = submission.availability[day]
          return dayAvailability?.available && dayAvailability?.shifts?.includes(template.id)
        }).length

        coverage.totalRequired += template.requiredWorkers
        coverage.totalAvailable += Math.min(availableWorkers, template.requiredWorkers)

        if (availableWorkers < template.requiredWorkers) {
          coverage.shortfalls.push({
            day: day.charAt(0).toUpperCase() + day.slice(1),
            shift: template.name,
            required: template.requiredWorkers,
            available: availableWorkers,
          })
        }
      })
    })

    return coverage
  }

  const toggleShortfalls = (weekStartDate: string) => {
    setExpandedShortfalls((prev) => ({
      ...prev,
      [weekStartDate]: !prev[weekStartDate],
    }))
  }

  const handleWeekSelection = (dateString: string) => {
    const selectedDate = new Date(dateString)
    const monday = new Date(selectedDate)
    const dayOfWeek = selectedDate.getDay()
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    monday.setDate(selectedDate.getDate() + daysToMonday)
    setSelectedWeek(monday.toISOString().split("T")[0])
  }

  const getDetailedAvailability = (availability: any) => {
    const daysOfWeek = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    const shiftTemplates = currentBranch?.settings?.shiftTemplates || []

    return daysOfWeek
      .map((day) => {
        const dayAvailability = availability[day]
        if (!dayAvailability?.available) return null

        const availableShifts =
          dayAvailability.shifts?.map((shiftId: string) => {
            const template = shiftTemplates.find((t) => t.id === shiftId)
            return template ? `${template.name} (${template.startTime} - ${template.endTime})` : shiftId
          }) || []

        return {
          day: day.charAt(0).toUpperCase() + day.slice(1),
          shifts: availableShifts,
        }
      })
      .filter(Boolean)
  }

  const toggleAvailabilityDetails = (submissionId: string) => {
    setExpandedAvailability((prev) => ({
      ...prev,
      [submissionId]: !prev[submissionId],
    }))
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Availability Approvals</h2>
        <p className="text-muted-foreground">Review and approve worker availability submissions</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            Coverage Analysis
          </CardTitle>
          <CardDescription>Schedule coverage analysis for any week</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="week-select">Select Week</Label>
            <Input
              id="week-select"
              type="date"
              value={selectedWeek}
              onChange={(e) => handleWeekSelection(e.target.value)}
              className="w-full max-w-xs"
            />
          </div>

          {selectedWeek &&
            (() => {
              const coverage = analyzeCoverage(selectedWeek)
              if (!coverage) return <p className="text-muted-foreground">No shift templates configured</p>

              const coveragePercentage =
                coverage.totalRequired > 0 ? Math.round((coverage.totalAvailable / coverage.totalRequired) * 100) : 100

              return (
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Week of {new Date(coverage.weekStartDate).toLocaleDateString()}</h3>
                    <Badge
                      variant={
                        coveragePercentage >= 100 ? "default" : coveragePercentage >= 80 ? "secondary" : "destructive"
                      }
                    >
                      {coveragePercentage}% Coverage
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Required Workers:</span>
                      <span className="ml-2 font-medium">{coverage.totalRequired}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Available Workers:</span>
                      <span className="ml-2 font-medium">{coverage.totalAvailable}</span>
                    </div>
                  </div>

                  {coverage.shortfalls.length > 0 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Coverage Shortfalls:</strong>
                        <ul className="mt-2 space-y-1">
                          {coverage.shortfalls.slice(0, 5).map((shortfall, index) => (
                            <li key={index} className="text-sm">
                              {shortfall.day} - {shortfall.shift}: Need {shortfall.required}, have {shortfall.available}
                            </li>
                          ))}
                          {coverage.shortfalls.length > 5 && (
                            <>
                              {expandedShortfalls[coverage.weekStartDate] && (
                                <>
                                  {coverage.shortfalls.slice(5).map((shortfall, index) => (
                                    <li key={index + 5} className="text-sm">
                                      {shortfall.day} - {shortfall.shift}: Need {shortfall.required}, have{" "}
                                      {shortfall.available}
                                    </li>
                                  ))}
                                </>
                              )}
                              <li>
                                <button
                                  onClick={() => toggleShortfalls(coverage.weekStartDate)}
                                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-1"
                                >
                                  {expandedShortfalls[coverage.weekStartDate] ? (
                                    <>
                                      <ChevronUp className="h-3 w-3" />
                                      Show less
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="h-3 w-3" />+{coverage.shortfalls.length - 5} more
                                      shortfalls
                                    </>
                                  )}
                                </button>
                              </li>
                            </>
                          )}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )
            })()}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            Pending Approvals ({pendingSubmissions.length})
          </CardTitle>
          <CardDescription>Worker availability submissions awaiting your approval</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingSubmissions.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-muted-foreground">No pending availability submissions</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingSubmissions.map((submission) => (
                <div key={submission.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-gray-500" />
                      <div>
                        <h3 className="font-semibold">{getWorkerName(submission.workerId)}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          Week of {new Date(submission.weekStartDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary">{submission.status}</Badge>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-muted-foreground">Availability Summary:</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleAvailabilityDetails(submission.id)}
                        className="text-xs"
                      >
                        {expandedAvailability[submission.id] ? (
                          <>
                            <ChevronUp className="h-3 w-3 mr-1" />
                            Hide Details
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3 w-3 mr-1" />
                            View Details
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-sm">{formatAvailability(submission.availability)}</p>
                    {expandedAvailability[submission.id] && (
                      <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <h4 className="text-sm font-medium mb-2">Detailed Availability:</h4>
                        <div className="space-y-2">
                          {getDetailedAvailability(submission.availability).map((dayInfo: any, index: number) => (
                            <div key={index} className="text-sm">
                              <span className="font-medium text-blue-600 dark:text-blue-400">{dayInfo.day}:</span>
                              <ul className="ml-4 mt-1">
                                {dayInfo.shifts.map((shift: string, shiftIndex: number) => (
                                  <li key={shiftIndex} className="text-xs text-gray-600 dark:text-gray-300">
                                    • {shift}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                          {getDetailedAvailability(submission.availability).length === 0 && (
                            <p className="text-sm text-gray-500">No availability submitted</p>
                          )}
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Submitted: {new Date(submission.submittedAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleApproval(submission.id, "approved")}
                      disabled={processing === submission.id}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      {processing === submission.id ? "Processing..." : "Approve"}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleApproval(submission.id, "rejected")}
                      disabled={processing === submission.id}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      {processing === submission.id ? "Processing..." : "Reject"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Recently Approved ({approvedSubmissions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {approvedSubmissions.slice(0, 5).map((submission) => (
              <div key={submission.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                <div>
                  <p className="font-medium text-sm">{getWorkerName(submission.workerId)}</p>
                  <p className="text-xs text-muted-foreground">
                    Week of {new Date(submission.weekStartDate).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  Approved
                </Badge>
              </div>
            ))}
            {approvedSubmissions.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No approved submissions yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Recently Rejected ({rejectedSubmissions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {rejectedSubmissions.slice(0, 5).map((submission) => (
              <div key={submission.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                <div>
                  <p className="font-medium text-sm">{getWorkerName(submission.workerId)}</p>
                  <p className="text-xs text-muted-foreground">
                    Week of {new Date(submission.weekStartDate).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant="destructive">Rejected</Badge>
              </div>
            ))}
            {rejectedSubmissions.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No rejected submissions yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
