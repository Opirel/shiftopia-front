"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X } from "lucide-react"
import { useTranslation } from "@/lib/i18n"
import { useAuth } from "@/lib/auth"
import { localDB } from "@/lib/local-db"

interface TimeOffRequestModalProps {
  onClose: () => void
}

export function TimeOffRequestModal({ onClose }: TimeOffRequestModalProps) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [requestType, setRequestType] = useState<"single" | "range">("single")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!startDate || !user) return

    setIsSubmitting(true)

    try {
      // Get existing time off requests
      const existingRequests = (await localDB.safeGet("timeOffRequests")) || []

      // Create new request
      const newRequest = {
        id: crypto.randomUUID(),
        workerId: user.id,
        workerName: user.name,
        managerId: user.managerId,
        startDate,
        endDate: requestType === "range" ? endDate : startDate,
        reason: reason.trim() || "Personal time off",
        status: "pending" as const,
        submittedAt: new Date().toISOString(),
        type: requestType,
      }

      // Save to database
      await localDB.safeSet("timeOffRequests", [...existingRequests, newRequest])

      // Show success message
      alert(t("time_off.request_submitted"))
      onClose()
    } catch (error) {
      console.error("Error submitting time off request:", error)
      alert("Error submitting request. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-white dark:bg-gray-800 shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl font-bold">{t("time_off.title")}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Request Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Request Type</label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={requestType === "single" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRequestType("single")}
                  className="flex-1"
                >
                  {t("time_off.single_day")}
                </Button>
                <Button
                  type="button"
                  variant={requestType === "range" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRequestType("range")}
                  className="flex-1"
                >
                  {t("time_off.date_range")}
                </Button>
              </div>
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <label htmlFor="startDate" className="text-sm font-medium">
                {requestType === "single" ? t("time_off.select_date") : t("time_off.start_date")}
              </label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                min={new Date().toISOString().split("T")[0]}
              />
            </div>

            {/* End Date (for range requests) */}
            {requestType === "range" && (
              <div className="space-y-2">
                <label htmlFor="endDate" className="text-sm font-medium">
                  {t("time_off.end_date")}
                </label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  min={startDate || new Date().toISOString().split("T")[0]}
                />
              </div>
            )}

            {/* Reason */}
            <div className="space-y-2">
              <label htmlFor="reason" className="text-sm font-medium">
                {t("time_off.reason")}
              </label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t("time_off.enter_reason")}
                rows={3}
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting || !startDate || (requestType === "range" && !endDate)}
              className="w-full"
            >
              {isSubmitting ? "Submitting..." : t("time_off.submit_request")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
