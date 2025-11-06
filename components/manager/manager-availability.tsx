"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth"
import { useBranch } from "@/lib/branch"
import { useWorkers } from "@/lib/workers"
import { toast } from "@/hooks/use-toast"
import { useTranslation } from "@/lib/i18n"
import { localDB } from "@/lib/local-db"
import { useAxois } from "@/lib/axois"

interface DayAvailability {
  shifts: string[]
  available: boolean
}

interface WeeklyAvailability {
  monday: DayAvailability
  tuesday: DayAvailability
  wednesday: DayAvailability
  thursday: DayAvailability
  friday: DayAvailability
  saturday: DayAvailability
  sunday: DayAvailability
}

export function ManagerAvailability() {
  const { user } = useAuth()
  const { currentBranch } = useBranch()
  const { availabilitySubmissions, refreshWorkers } = useWorkers()
  const { t } = useTranslation()
  const { instance } = useAxois()
  const [availability, setAvailability] = useState<WeeklyAvailability>({
    monday: { shifts: [], available: false },
    tuesday: { shifts: [], available: false },
    wednesday: { shifts: [], available: false },
    thursday: { shifts: [], available: false },
    friday: { shifts: [], available: false },
    saturday: { shifts: [], available: false },
    sunday: { shifts: [], available: false },
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showAvailabilityForm, setShowAvailabilityForm] = useState(false)

  const shiftTemplates = currentBranch?.settings?.shiftTemplates || []

  const getCurrentWeekMonday = () => {
    const today = new Date()
    const monday = new Date(today)
    const dayOfWeek = today.getDay()
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    monday.setDate(today.getDate() + daysToMonday)
    return monday.toISOString().split("T")[0]
  }

  const submitManagerAvailability = async (
    managerId: string,
    availability: WeeklyAvailability,
    weekStartDate: string,
  ) => {
    try {
      const submission = {
        id: crypto.randomUUID(),
        workerId: managerId, // Use manager ID as worker ID for consistency
        managerId: managerId, // Manager is their own manager
        weekStartDate,
        availability,
        submittedAt: new Date().toISOString(),
        status: "approved", // Managers auto-approve their own availability
      }

      const allSubmissions = (await localDB.safeGet("availabilitySubmissions")) || []
      
      // Remove any existing submission for this manager and week
      const filteredSubmissions = allSubmissions.filter(
        (s: any) => !(s.workerId === managerId && s.weekStartDate.substring(0, 10) === weekStartDate),
      )

      filteredSubmissions.push(submission)
      await localDB.safeSet("availabilitySubmissions", filteredSubmissions)

      return true
    } catch (error) {
      console.error("Error submitting manager availability:", error)
      return false
    }
  }

  const handleSubmit = async () => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "Missing required information. Please try again.",
       variant: "default",
      })
      return
    }

    if (shiftTemplates.length === 0) {
      toast({
        title: "No shift templates available",
        description: "Please set up shift templates before submitting availability.",
       variant: "default",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const weekStartDate = getCurrentWeekMonday()
      const success = await submitManagerAvailability(user.id, availability, weekStartDate)

      if (success) {
        toast({
          title: "Availability Submitted",
          description: `Your availability for the current week has been submitted.`,
        })

        await refreshWorkers()

        setAvailability({
          monday: { shifts: [], available: false },
          tuesday: { shifts: [], available: false },
          wednesday: { shifts: [], available: false },
          thursday: { shifts: [], available: false },
          friday: { shifts: [], available: false },
          saturday: { shifts: [], available: false },
          sunday: { shifts: [], available: false },
        })
        setShowAvailabilityForm(false)
      } else {
        throw new Error("Submission failed")
      }
    } catch (error) {
      console.error("Error submitting availability:", error)
      toast({
        title: "Submission Failed",
        description: "Failed to submit availability. Please try again.",
       variant: "default",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

  const toggleShiftForDay = (day: keyof WeeklyAvailability, shiftId: string) => {
    setAvailability((prev) => {
      const dayAvailability = prev[day]
      const shifts = dayAvailability.shifts.includes(shiftId)
        ? dayAvailability.shifts.filter((id) => id !== shiftId)
        : [...dayAvailability.shifts, shiftId]

      return {
        ...prev,
        [day]: {
          shifts,
          available: shifts.length > 0,
        },
      }
    })
  }

  const getShiftTemplatesForDay = (day: string) => {
    return shiftTemplates.filter((template) => {
      // Backward compatibility: if no days specified, apply to all days
      const templateDays = template.days || [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
      ]
      return templateDays.includes(day)
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">My Availability</h2>
        <p className="text-muted-foreground">Submit your availability to be included in schedule generation</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>My Schedules</CardTitle>
            <CardDescription>View your upcoming shifts</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">No schedules assigned yet</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Availability Submissions</CardTitle>
            <CardDescription>Manage your availability</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button onClick={() => setShowAvailabilityForm(true)} className="w-full">
                Submit New Availability
              </Button>

              {availabilitySubmissions
                .filter((submission) => submission.workerId === user?.id)
                .map((submission) => (
                  <div key={submission.submittedAt} className="border rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">
                        Week of {new Date(submission.weekStartDate).toLocaleDateString()}
                      </span>
                      <Badge
                        variant={
                          submission.status === "approved"
                            ? "default"
                            : submission.status === "rejected"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {submission.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Submitted: {new Date(submission.submittedAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {showAvailabilityForm && (
        <Card>
          <CardHeader>
            <CardTitle>Submit Availability</CardTitle>
            <CardDescription>Select which shifts you're available for each day</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {shiftTemplates.length > 0 ? (
                <div className="space-y-4">
                  {days.map((day) => {
                    const dayShiftTemplates = getShiftTemplatesForDay(day)
                    return (
                      <div key={day} className="space-y-2">
                        <div className="font-medium capitalize">{t(`days.${day}`)}</div>
                        <div className="grid grid-cols-1 gap-2">
                          {dayShiftTemplates.length > 0 ? (
                            dayShiftTemplates.map((template) => (
                              <label
                                key={template.id}
                                className="flex items-center space-x-2 cursor-pointer p-2 border rounded hover:bg-muted"
                              >
                                <input
                                  type="checkbox"
                                  checked={availability[day as keyof typeof availability].shifts.includes(template.id)}
                                  onChange={() => toggleShiftForDay(day as keyof WeeklyAvailability, template.id)}
                                  className="rounded"
                                />
                                <span className="text-sm">
                                  <span className="font-medium">{template.name}</span>
                                  <span className="text-muted-foreground ml-2">
                                    ({template.startTime} - {template.endTime})
                                  </span>
                                </span>
                              </label>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground italic">No shifts available for this day</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No shift templates available.</p>
                  <p className="text-sm text-muted-foreground mt-1">Please set up shift templates in Settings first.</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowAvailabilityForm(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting || shiftTemplates.length === 0}>
                  {isSubmitting ? "Submitting..." : "Submit Availability"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
