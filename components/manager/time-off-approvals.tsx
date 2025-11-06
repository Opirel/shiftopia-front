"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useTranslation } from "@/lib/i18n"
import { useAuth } from "@/lib/auth"
import { localDB } from "@/lib/local-db"
import { formatDate } from "@/lib/date-utils"
import { Calendar, Clock, User, CheckCircle, XCircle, AlertCircle, MessageSquare } from "lucide-react"

interface TimeOffRequest {
  id: string
  workerId: string
  workerName: string
  managerId: string
  startDate: string
  endDate: string
  reason: string
  status: "pending" | "approved" | "rejected"
  submittedAt: string
  type: "single" | "range"
  reviewedAt?: string
  reviewedBy?: string
}

export function TimeOffApprovals() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [requests, setRequests] = useState<TimeOffRequest[]>([])
  const [loading, setLoading] = useState(true)

  const loadRequests = async () => {
    try {
      const allRequests = (await localDB.safeGet("timeOffRequests")) || []
      console.log("All time-off requests:", allRequests)
      console.log("Current manager ID:", user?.id)

      const managerRequests = allRequests.filter((request: TimeOffRequest) => {
        // Direct manager match
        if (request.managerId === user?.id) return true

        // If user is a manager role, show all requests (fallback)
        if (user?.role === "manager" || user?.role === "admin") return true

        return false
      })

      console.log("Filtered requests for manager:", managerRequests)
      setRequests(managerRequests)
    } catch (error) {
      console.error("Error loading time-off requests:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRequests()
  }, [user?.id])

  const handleApproval = async (requestId: string, status: "approved" | "rejected") => {
    try {
      const allRequests = (await localDB.safeGet("timeOffRequests")) || []
      const updatedRequests = allRequests.map((request: TimeOffRequest) =>
        request.id === requestId
          ? {
              ...request,
              status,
              reviewedAt: new Date().toISOString(),
              reviewedBy: user?.name || "Manager",
            }
          : request,
      )

      await localDB.safeSet("timeOffRequests", updatedRequests)
      await loadRequests()

      // Show success message
      const action = status === "approved" ? "approved" : "rejected"
      alert(`Time-off request ${action} successfully`)
    } catch (error) {
      console.error("Error updating time-off request:", error)
      alert("Error updating request. Please try again.")
    }
  }

  const pendingRequests = requests.filter((req) => req.status === "pending")
  const recentRequests = requests.filter((req) => req.status !== "pending").slice(0, 5)

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t("time_off.approvals_title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-2">Loading requests...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            {t("time_off.pending_requests")} ({pendingRequests.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No pending time-off requests</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="border rounded-lg p-4 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-950/20 dark:to-yellow-950/20 border-orange-200 dark:border-orange-800"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold text-gray-900 dark:text-gray-100">{request.workerName}</span>
                        <Badge variant="outline" className="text-orange-600 border-orange-300 dark:border-orange-600">
                          {request.type === "single" ? t("time_off.single_day") : t("time_off.date_range")}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {request.type === "single" ? (
                          <span>{formatDate(request.startDate)}</span>
                        ) : (
                          <span>
                            {formatDate(request.startDate)} - {formatDate(request.endDate)}
                          </span>
                        )}
                      </div>

                      {request.reason && (
                        <div className="flex items-start gap-2 text-sm">
                          <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <span className="text-muted-foreground">{request.reason}</span>
                        </div>
                      )}

                      <div className="text-xs text-muted-foreground">
                        {t("time_off.submitted_on")} {formatDate(request.submittedAt)}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-600 hover:bg-green-50 dark:hover:bg-green-950/20 bg-transparent"
                        onClick={() => handleApproval(request.id, "approved")}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        {t("time_off.approve")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 bg-transparent"
                        onClick={() => handleApproval(request.id, "rejected")}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        {t("time_off.reject")}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Decisions */}
      {recentRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Recent Decisions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-gray-50 dark:bg-gray-800/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-gray-900 dark:text-gray-100">{request.workerName}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {request.type === "single"
                        ? formatDate(request.startDate)
                        : `${formatDate(request.startDate)} - ${formatDate(request.endDate)}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={request.status === "approved" ? "default" : "destructive"}
                      className={
                        request.status === "approved"
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : ""
                      }
                    >
                      {request.status === "approved" ? (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      ) : (
                        <XCircle className="h-3 w-3 mr-1" />
                      )}
                      {request.status === "approved" ? t("time_off.approved") : t("time_off.rejected")}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(request.reviewedAt || request.submittedAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
