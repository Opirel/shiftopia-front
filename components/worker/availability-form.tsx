"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useTranslation } from "@/lib/i18n"
import { toast } from "@/hooks/use-toast"
import { Plus, AlertCircle, Calendar } from "lucide-react"
import type { ShiftTemplate } from "@/types"

interface AvailabilityFormProps {
  onSubmit: (availability: any, weekStartDate: string) => void
  onCancel: () => void
  shiftTemplates: ShiftTemplate[]
  branches: any[]
}

export function AvailabilityForm({ onSubmit, onCancel, shiftTemplates, branches }: AvailabilityFormProps) {
  const { t } = useTranslation()

  const getCurrentWeekStart = () => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(today)
    monday.setDate(today.getDate() + mondayOffset)
    return monday.toISOString().split("T")[0]
  }

  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeekStart())

  const [availability, setAvailability] = useState({
    monday: { shifts: [] as string[], available: false },
    tuesday: { shifts: [] as string[], available: false },
    wednesday: { shifts: [] as string[], available: false },
    thursday: { shifts: [] as string[], available: false },
    friday: { shifts: [] as string[], available: false },
    saturday: { shifts: [] as string[], available: false },
    sunday: { shifts: [] as string[], available: false },
  })

  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

  const toggleShiftForDay = (day: string, shiftId: string) => {
    setAvailability((prev) => {
      const dayAvailability = prev[day as keyof typeof prev]
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

  const handleSubmit = () => {
    if (shiftTemplates.length === 0) {
      toast({
        title: "No Templates Available",
        description: "Contact your manager to set up shift templates.",
       variant: "default",
      })
      return
    }

    onSubmit(availability, selectedWeek)
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border-0">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
          <div className="flex items-center gap-3">
            <Plus className="h-6 w-6" />
            <div>
              <CardTitle className="text-xl">{t("worker.submit_availability")}</CardTitle>
              <CardDescription className="text-blue-100">
                Select the shifts you're available to work for each day
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <Label
                htmlFor="week-select"
                className="text-sm font-medium text-blue-800 dark:text-blue-200 flex items-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                {t("availability.select_week")}
              </Label>
              <Input
                id="week-select"
                type="date"
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                className="mt-2 bg-white dark:bg-gray-800 border-blue-300 dark:border-blue-600"
              />
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Select any day in the week you want to submit availability for
              </p>
            </div>

            {shiftTemplates.length > 0 ? (
              <div className="grid gap-6">
                {days.map((day) => {
                  const dayShiftTemplates = getShiftTemplatesForDay(day)
                  return (
                    <div
                      key={day}
                      className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                    >
                      <div className="font-bold text-lg capitalize mb-3 text-gray-800 dark:text-gray-200">
                        {t(`days.${day}`)}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {dayShiftTemplates.length > 0 ? (
                          dayShiftTemplates.map((template) => (
                            <label
                              key={template.id}
                              className="flex items-center space-x-3 cursor-pointer p-3 border-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600"
                            >
                              <input
                                type="checkbox"
                                checked={availability[day as keyof typeof availability].shifts.includes(template.id)}
                                onChange={() => toggleShiftForDay(day, template.id)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <div className="flex-1">
                                <span className="font-medium text-gray-800 dark:text-gray-200">{template.name}</span>
                                <span className="text-gray-500 dark:text-gray-400 ml-2 text-sm">
                                  ({template.startTime} - {template.endTime})
                                </span>
                              </div>
                            </label>
                          ))
                        ) : (
                          <p className="text-gray-500 italic col-span-2">No shifts available for this day</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <AlertCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No shift templates available</p>
                <p className="text-gray-400 text-sm mt-2">Contact your manager to set up shift templates</p>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-600">
              <Button variant="outline" onClick={onCancel} className="flex-1 bg-transparent">
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={false} className="flex-1 bg-blue-600 hover:bg-blue-700">
                {t("worker.submit_availability")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
