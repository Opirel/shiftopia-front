"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth"
import { useWorkers } from "@/lib/workers"
import { useBranch } from "@/lib/branch"
import { useTranslation } from "@/lib/i18n"
import { toast } from "@/hooks/use-toast"
import { Calendar, Clock, CheckCircle, AlertCircle, Plus, Eye, Plane, RefreshCw } from "lucide-react"
import type { Schedule, ShiftTemplate } from "@/types"
import { localDB } from "@/lib/local-db"
import { AvailabilityForm } from "./availability-form"
import { TimeOffRequestModal } from "./time-off-request-modal"
import { ShiftSwitchingModal } from "./shift-switching-modal"

export function WorkerDashboard() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const { submitAvailability, availabilitySubmissions, requestShiftSwitch } = useWorkers()
  const { branches, loading: branchLoading } = useBranch()
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [showAvailabilityForm, setShowAvailabilityForm] = useState(false)
  const [showTimeOffModal, setShowTimeOffModal] = useState(false)
  const [showShiftSwitchingModal, setShowShiftSwitchingModal] = useState(false)
  const [timeOffRequests, setTimeOffRequests] = useState<any[]>([])
  const [managerShiftTemplates, setManagerShiftTemplates] = useState<ShiftTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const today = new Date()
    const monday = new Date(today)
    const dayOfWeek = today.getDay()
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    monday.setDate(today.getDate() + daysToMonday)
    return monday.toISOString().split("T")[0]
  })
  const [showFullSchedule, setShowFullSchedule] = useState(false)
  const [allWorkers, setAllWorkers] = useState<any[]>([])
  const [fullSchedule, setFullSchedule] = useState<Schedule | null>(null)
  const [scheduleLoading, setScheduleLoading] = useState(true)
  const [activeView, setActiveView] = useState<string>("dashboard") // Added activeView state

  useEffect(() => {
    if (!branchLoading && branches.length >= 0) {
      loadData()
    }
  }, [user?.id, user?.managerId, branches, branchLoading])

  useEffect(() => {
    const loadFullSchedule = async () => {
      setScheduleLoading(true)
      const schedule = await getFullScheduleForWeek(selectedWeek)
      setFullSchedule(schedule)
      setScheduleLoading(false)
    }
    loadFullSchedule()
  }, [selectedWeek])

  const loadData = async () => {
    if (!user?.id) return

    try {
      const allSchedules = (await localDB.safeGet("schedules")) || []
      const allTimeOffRequests = (await localDB.safeGet("timeOffRequests")) || []
      const allUsers = (await localDB.safeGet("users")) || []
      const workers = allUsers.filter((u: any) => u.role === "worker")
      setAllWorkers(workers)

      let managerBranch = null

      managerBranch = branches.find((branch: any) => branch.ownerId === user.managerId)

      if (!managerBranch && user.managerId) {
        const manager = allUsers.find((u: any) => u.id === user.managerId)

        if (manager) {
          managerBranch = branches.find(
            (branch: any) => branch.ownerId === manager.id || branch.ownerEmail === manager.email,
          )
        }
      }

      if (!managerBranch && branches.length > 0) {
        managerBranch = branches[0]
      }

      if (managerBranch) {
        if (managerBranch.settings?.shiftTemplates) {
          setManagerShiftTemplates(managerBranch.settings.shiftTemplates)
        }
      }

      const workerSchedules = allSchedules.filter((schedule: Schedule) =>
        schedule.shifts.some((shift) => shift.assignedWorkers.includes(user.id)),
      )
      setSchedules(workerSchedules)

      const workerTimeOffRequests = allTimeOffRequests.filter((request: any) => request.workerId === user.id)
      setTimeOffRequests(workerTimeOffRequests)
    } catch (error) {
      console.error("Error loading worker data:", error)
      toast({
        title: "Error",
        description: "Failed to load data. Please refresh the page.",
       variant: "default",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitAvailability = async (availability: any, selectedWeekDate: string) => {
    try {
      if (!submitAvailability) {
        throw new Error("Availability submission function not available")
      }

      // Calculate the Monday of the selected week
      const selectedDate = new Date(selectedWeekDate)
      const dayOfWeek = selectedDate.getDay()
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
      const monday = new Date(selectedDate)
      monday.setDate(selectedDate.getDate() + daysToMonday)
      const weekStartDate = monday.toISOString().split("T")[0]

      console.log("Submitting availability for week:", weekStartDate, "Selected date was:", selectedWeekDate)

      const success = await submitAvailability(user, availability, weekStartDate)

      if (success) {
        await loadData()
        setShowAvailabilityForm(false)

        toast({
          title: "Availability Submitted",
          description: `Your availability for the week of ${new Date(weekStartDate).toLocaleDateString()} has been sent to your manager.`,
        })
      } else {
        throw new Error("Failed to submit availability")
      }
    } catch (error) {
      console.error("Error submitting availability:", error)
      toast({
        title: "Error",
        description: "Failed to submit availability. Please try again.",
       variant: "default",
      })
    }
  }

  const handleRequestShiftSwitch = async (shiftId: string, newWorkerId: string) => {
    try {
      if (!requestShiftSwitch) {
        throw new Error("Shift switching function not available")
      }

      const success = await requestShiftSwitch(shiftId, newWorkerId)

      if (success) {
        await loadData()
        setShowShiftSwitchingModal(false)

        toast({
          title: "Shift Switch Requested",
          description: "Your shift switch request has been sent to your manager.",
        })
      } else {
        throw new Error("Failed to request shift switch")
      }
    } catch (error) {
      console.error("Error requesting shift switch:", error)
      toast({
        title: "Error",
        description: "Failed to request shift switch. Please try again.",
       variant: "default",
      })
    }
  }

  const getFullScheduleForWeek = async (weekStartDate: string) => {
    try {
      const allSchedules = (await localDB.safeGet("schedules")) || []
      return allSchedules.find((schedule: Schedule) => schedule.weekStartDate.substring(0, 10) === weekStartDate)
    } catch (error) {
      console.error("Error loading full schedule:", error)
      return null
    }
  }

  const renderFullScheduleTable = () => {
    if (scheduleLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )
    }

    if (!fullSchedule) {
      return (
        <div className="text-center py-12">
          <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">{t("worker.no_schedule_for_week")}</p>
          <p className="text-gray-400 text-sm mt-2">{t("worker.select_different_week")}</p>
        </div>
      )
    }

    const shiftsByDay: { [key: string]: any[] } = {}
    const weekDays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]

    weekDays.forEach((day) => {
      shiftsByDay[day] = []
    })

    fullSchedule.shifts.forEach((shift) => {
      const shiftDate = new Date(shift.date)
      const dayName = shiftDate.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase()
      shiftsByDay[dayName].push(shift)
    })

    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <thead>
            <tr className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <th className="border border-gray-300 dark:border-gray-600 p-3 text-left font-semibold">
                {t("worker.time_shift")}
              </th>
              {weekDays.map((day) => (
                <th key={day} className="border border-gray-300 dark:border-gray-600 p-3 text-center font-semibold">
                  {t(`days.${day}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {managerShiftTemplates.map((template) => (
              <tr key={template.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <td className="border border-gray-300 dark:border-gray-600 p-3 font-medium bg-gray-50 dark:bg-gray-700">
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-gray-200">{template.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {template.startTime} - {template.endTime}
                    </p>
                  </div>
                </td>
                {weekDays.map((day) => {
                  const dayShifts = shiftsByDay[day].filter((shift) => shift.templateId === template.id)
                  return (
                    <td key={day} className="border border-gray-300 dark:border-gray-600 p-2 text-center">
                      {dayShifts.length > 0 ? (
                        <div className="space-y-1">
                          {dayShifts.map((shift) => (
                            <div key={shift.id} className="text-xs">
                              {shift.assignedWorkers.map((workerId: string) => {
                                const worker = allWorkers.find((w) => w.id === workerId)
                                const isCurrentUser = workerId === user?.id
                                return (
                                  <div
                                    key={workerId}
                                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      isCurrentUser
                                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-2 border-blue-300"
                                        : "bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-300"
                                    }`}
                                  >
                                    {worker?.name || "Unknown"}
                                  </div>
                                )
                              })}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">{t("worker.no_assignment")}</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (loading || branchLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const upcomingShifts = schedules
    .flatMap((schedule) =>
      schedule.shifts.filter(
        (shift) => shift.assignedWorkers.includes(user?.id || "") && new Date(shift.date) >= new Date(),
      ),
    )
    .slice(0, 3)

  const mySubmissions = availabilitySubmissions.filter((submission) => submission.workerId === user?.id)
  const pendingSubmissions = mySubmissions.filter((s) => s.status === "pending").length
  const approvedSubmissions = mySubmissions.filter((s) => s.status === "approved").length

  const pendingTimeOffRequests = timeOffRequests.filter((request) => request.status === "pending").length

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-800 dark:to-blue-900 text-white py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/20 rounded-full">
              <Calendar className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">{t("worker.dashboard_title")}</h1>
              <p className="text-blue-100 text-lg">
                {t("worker.welcome_back")}, {user?.name}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-blue-100 mb-2">{t("worker.select_week")}</label>
            <input
              type="date"
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="px-4 py-2 rounded-lg bg-white/20 border border-white/30 text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white/50"
            />
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <div className="flex items-center gap-3">
                <Clock className="h-6 w-6 text-blue-200" />
                <div>
                  <p className="text-2xl font-bold">{upcomingShifts.length}</p>
                  <p className="text-blue-200 text-sm">{t("worker.upcoming_shifts")}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-6 w-6 text-yellow-200" />
                <div>
                  <p className="text-2xl font-bold">{pendingSubmissions + pendingTimeOffRequests}</p>
                  <p className="text-blue-200 text-sm">{t("worker.pending_requests")}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-green-200" />
                <div>
                  <p className="text-2xl font-bold">{approvedSubmissions}</p>
                  <p className="text-blue-200 text-sm">{t("worker.approved_requests")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeView === "shift-switching" ? (
          <div>
            <div className="flex items-center gap-4 mb-6">
              <Button onClick={() => setActiveView("dashboard")} variant="outline" className="flex items-center gap-2">
                ← {t("common.back")}
              </Button>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">{t("worker.switch_shifts")}</h2>
            </div>
            <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
                <CardTitle className="text-xl">{t("worker.request_shift_switch")}</CardTitle>
                <CardDescription className="text-blue-100">{t("worker.select_shift_to_switch")}</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {upcomingShifts.length === 0 ? (
                  <div className="text-center py-12">
                    <RefreshCw className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">{t("worker.no_upcoming_shifts")}</p>
                    <p className="text-gray-400 text-sm mt-2">{t("worker.no_shifts_to_switch")}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingShifts.map((shift) => {
                      const shiftDate = new Date(shift.date)
                      const dayName = shiftDate.toLocaleDateString("en-US", { weekday: "long" })
                      const template = managerShiftTemplates.find((t) => t.id === shift.templateId)

                      return (
                        <div
                          key={shift.id}
                          className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-700 dark:to-gray-600 rounded-lg p-4 border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="text-center">
                                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                  {shiftDate.getDate()}
                                </p>
                                <p className="text-xs text-gray-500 uppercase tracking-wide">{dayName.slice(0, 3)}</p>
                              </div>
                              <div>
                                <p className="font-semibold text-gray-800 dark:text-gray-200">
                                  {template?.name || "Unknown Shift"}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {shift.startTime} - {shift.endTime}
                                </p>
                                <p className="text-xs text-gray-500">{shiftDate.toLocaleDateString()}</p>
                              </div>
                            </div>
                            <Button
                              onClick={() => {
                                toast({
                                  title: "Shift Switch Request",
                                  description: `Request to switch ${template?.name} on ${dayName} has been initiated. Other workers will be notified.`,
                                })
                              }}
                              className="bg-blue-500 hover:bg-blue-600 text-white"
                            >
                              {t("worker.request_switch")}
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <div className="flex gap-2">
                <Button
                  onClick={() => setActiveView("dashboard")}
                  variant={activeView === "dashboard" ? "default" : "outline"}
                  className="flex items-center gap-2"
                >
                  <Calendar className="h-4 w-4" />
                  {t("worker.my_schedule")}
                </Button>
                <Button
                  onClick={() => setActiveView("fullSchedule")}
                  variant={activeView === "fullSchedule" ? "default" : "outline"}
                  className="flex items-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  {t("worker.full_schedule")}
                </Button>
                <Button
                  onClick={() => setActiveView("shift-switching")}
                  variant={activeView === "shift-switching" ? "default" : "outline"}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  {t("worker.switch_shifts")}
                </Button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 hover:scale-105">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-500 rounded-full text-white group-hover:scale-110 transition-transform">
                      <Plus className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-green-800 dark:text-green-200">
                        {t("worker.submit_availability")}
                      </h3>
                      <p className="text-green-600 dark:text-green-300">{t("worker.submit_availability_desc")}</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setShowAvailabilityForm(true)}
                    className="w-full mt-4 bg-green-500 hover:bg-green-600 text-white shadow-lg hover:shadow-xl transition-all"
                  >
                    {t("worker.submit_new_availability")}
                  </Button>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 hover:scale-105">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-orange-500 rounded-full text-white group-hover:scale-110 transition-transform">
                      <Plane className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-orange-800 dark:text-orange-200">
                        {t("worker.request_time_off")}
                      </h3>
                      <p className="text-orange-600 dark:text-orange-300">{t("worker.request_time_off_desc")}</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setShowTimeOffModal(true)}
                    className="w-full mt-4 bg-orange-500 hover:bg-orange-600 text-white shadow-lg hover:shadow-xl transition-all"
                  >
                    {t("worker.view_time_off")}
                  </Button>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 hover:scale-105">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-500 rounded-full text-white group-hover:scale-110 transition-transform">
                      <RefreshCw className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-blue-800 dark:text-blue-200">
                        {t("worker.switch_shifts")}
                      </h3>
                      <p className="text-blue-600 dark:text-blue-300">{t("worker.switch_shifts_desc")}</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setShowShiftSwitchingModal(true)}
                    className="w-full mt-4 bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-xl transition-all"
                  >
                    {t("worker.request_shift_switch")}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Schedules and Availability Grid */}
            <div className="grid gap-8 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                  <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-6 w-6" />
                      <div>
                        <CardTitle className="text-xl">{t("worker.my_schedules")}</CardTitle>
                        <CardDescription className="text-blue-100">{t("worker.upcoming_shifts_desc")}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    {schedules.length === 0 ? (
                      <div className="text-center py-12">
                        <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 text-lg">{t("worker.no_schedules_assigned")}</p>
                        <p className="text-gray-400 text-sm mt-2">{t("worker.submit_availability_first")}</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {schedules.map((schedule) => {
                          const myShifts = schedule.shifts.filter((shift) =>
                            shift.assignedWorkers.includes(user?.id || ""),
                          )

                          return (
                            <div
                              key={schedule.id}
                              className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-xl p-6 border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow"
                            >
                              <h3 className="font-bold text-lg mb-4 text-gray-800 dark:text-gray-200">
                                Week of {new Date(schedule.weekStartDate).toLocaleDateString()}
                              </h3>
                              {myShifts.length > 0 ? (
                                <div className="grid gap-3">
                                  {myShifts.map((shift) => {
                                    const shiftDate = new Date(shift.date)
                                    const dayName = shiftDate.toLocaleDateString("en-US", { weekday: "long" })
                                    const template = managerShiftTemplates.find((t) => t.id === shift.templateId)

                                    return (
                                      <div
                                        key={shift.id}
                                        className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-4">
                                            <div className="text-center">
                                              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                                {shiftDate.getDate()}
                                              </p>
                                              <p className="text-xs text-gray-500 uppercase tracking-wide">
                                                {dayName.slice(0, 3)}
                                              </p>
                                            </div>
                                            <div>
                                              <p className="font-semibold text-gray-800 dark:text-gray-200">
                                                {template?.name || "Unknown Shift"}
                                              </p>
                                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                                {shift.startTime} - {shift.endTime}
                                              </p>
                                            </div>
                                          </div>
                                          <Badge
                                            variant="secondary"
                                            className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                          >
                                            Confirmed
                                          </Badge>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              ) : (
                                <p className="text-gray-500 italic">No shifts assigned for this week</p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div>
                <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                  <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-t-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-6 w-6" />
                      <div>
                        <CardTitle className="text-lg">{t("worker.availability_status")}</CardTitle>
                        <CardDescription className="text-orange-100">{t("worker.track_submissions")}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {mySubmissions.length === 0 ? (
                        <div className="text-center py-8">
                          <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-500">{t("worker.no_submissions")}</p>
                        </div>
                      ) : (
                        mySubmissions.map((submission) => (
                          <div
                            key={submission.submittedAt}
                            className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-700 dark:to-gray-600 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-medium text-gray-800 dark:text-gray-200">
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
                                className={
                                  submission.status === "approved"
                                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                    : submission.status === "pending"
                                      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                      : ""
                                }
                              >
                                {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-500">
                              Submitted: {new Date(submission.submittedAt).toLocaleDateString()}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>

      {showAvailabilityForm && (
        <AvailabilityForm
          onSubmit={(availability, selectedWeekDate) => handleSubmitAvailability(availability, selectedWeekDate)}
          onCancel={() => setShowAvailabilityForm(false)}
          shiftTemplates={managerShiftTemplates}
          branches={branches}
        />
      )}

      {showTimeOffModal && <TimeOffRequestModal onClose={() => setShowTimeOffModal(false)} />}

      {showShiftSwitchingModal && (
        <ShiftSwitchingModal
          onClose={() => setShowShiftSwitchingModal(false)}
          onSwitch={(shiftId, newWorkerId) => handleRequestShiftSwitch(shiftId, newWorkerId)}
          schedules={schedules}
          allWorkers={allWorkers}
        />
      )}
    </div>
  )
}
