"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSchedules } from "@/lib/schedules"
import { useWorkers } from "@/lib/workers"
import { useBranch } from "@/lib/branch"
import { useAuth } from "@/lib/auth"
import { useTranslation } from "@/lib/i18n"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts"
import {
  TrendingUp,
  Users,
  Clock,
  Calendar,
  Award,
  Target,
  Activity,
  Star,
  BarChart3,
  PieChartIcon,
} from "lucide-react"

interface WorkerPerformance {
  id: string
  name: string
  totalShifts: number
  totalHours: number
  averageRating: number
  reliability: number
  preferredShifts: string[]
  weeklyTrend: number[]
}

interface ShiftAnalytics {
  templateId: string
  templateName: string
  totalAssignments: number
  averageFillRate: number
  mostAssignedWorker: string
  peakDays: string[]
}

export function ManagerInsights() {
  const { schedules } = useSchedules()
  const { workers, availabilitySubmissions } = useWorkers()
  const { currentBranch } = useBranch()
  const { user } = useAuth()
  const { t } = useTranslation()
  const [selectedPeriod, setSelectedPeriod] = useState("last-4-weeks")
  const [selectedMetric, setSelectedMetric] = useState("hours")

  const activeSchedules = schedules.filter((s) => !s.archived)

  const periodOptions = [
    { value: "last-week", label: "Last Week" },
    { value: "last-4-weeks", label: "Last 4 Weeks" },
    { value: "last-8-weeks", label: "Last 8 Weeks" },
    { value: "last-12-weeks", label: "Last 12 Weeks" },
  ]

  const calculateShiftDuration = (startTime: string, endTime: string): number => {
    const start = new Date(`2000-01-01T${startTime}:00`)
    const end = new Date(`2000-01-01T${endTime}:00`)
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60)
  }

  const getDateRange = (period: string) => {
    const now = new Date()
    const weeks = period === "last-week" ? 1 : period === "last-4-weeks" ? 4 : period === "last-8-weeks" ? 8 : 12
    const startDate = new Date(now.getTime() - weeks * 7 * 24 * 60 * 60 * 1000)
    return { startDate, endDate: now }
  }

  const filteredSchedules = useMemo(() => {
    const { startDate, endDate } = getDateRange(selectedPeriod)
    return activeSchedules.filter((schedule) => {
      const scheduleDate = new Date(schedule.weekStartDate)
      return scheduleDate >= startDate && scheduleDate <= endDate
    })
  }, [activeSchedules, selectedPeriod])

  const workerPerformanceData = useMemo(() => {
    const performanceMap = new Map<string, WorkerPerformance>()

    workers.forEach((worker) => {
      performanceMap.set(worker.id, {
        id: worker.id,
        name: worker.name,
        totalShifts: 0,
        totalHours: 0,
        averageRating:
          Object.values(worker.ratings || {}).reduce((sum, rating) => sum + rating, 0) /
          Math.max(Object.keys(worker.ratings || {}).length, 1),
        reliability: 0,
        preferredShifts: [],
        weeklyTrend: [],
      })
    })

    filteredSchedules.forEach((schedule) => {
      schedule.shifts.forEach((shift) => {
        const shiftDuration = calculateShiftDuration(shift.startTime, shift.endTime)

        shift.assignedWorkers.forEach((workerId) => {
          const performance = performanceMap.get(workerId)
          if (performance) {
            performance.totalShifts += 1
            performance.totalHours += shiftDuration
          }
        })
      })
    })

    // Calculate reliability based on availability submissions vs actual assignments
    availabilitySubmissions.forEach((submission) => {
      if (submission.status === "approved") {
        const performance = performanceMap.get(submission.workerId)
        if (performance) {
          const availableDays = Object.values(submission.availability).filter((day) => day.available).length
          const assignedShifts = filteredSchedules.reduce((count, schedule) => {
            if (schedule.weekStartDate.substring(0, 10) === submission.weekStartDate) {
              return (
                count + schedule.shifts.filter((shift) => shift.assignedWorkers.includes(submission.workerId)).length
              )
            }
            return count
          }, 0)

          performance.reliability = availableDays > 0 ? Math.min(100, (assignedShifts / availableDays) * 100) : 0
        }
      }
    })

    return Array.from(performanceMap.values()).filter((p) => p.totalShifts > 0)
  }, [workers, filteredSchedules, availabilitySubmissions])

  const shiftAnalytics = useMemo(() => {
    const shiftMap = new Map<string, ShiftAnalytics>()
    const shiftTemplates = currentBranch?.settings?.shiftTemplates || []

    shiftTemplates.forEach((template) => {
      shiftMap.set(template.id, {
        templateId: template.id,
        templateName: template.name,
        totalAssignments: 0,
        averageFillRate: 0,
        mostAssignedWorker: "",
        peakDays: [],
      })
    })

    const workerAssignmentCounts = new Map<string, Map<string, number>>()

    filteredSchedules.forEach((schedule) => {
      schedule.shifts.forEach((shift) => {
        const analytics = shiftMap.get(shift.templateId)
        if (analytics) {
          analytics.totalAssignments += shift.assignedWorkers.length

          shift.assignedWorkers.forEach((workerId) => {
            if (!workerAssignmentCounts.has(shift.templateId)) {
              workerAssignmentCounts.set(shift.templateId, new Map())
            }
            const templateCounts = workerAssignmentCounts.get(shift.templateId)!
            templateCounts.set(workerId, (templateCounts.get(workerId) || 0) + 1)
          })
        }
      })
    })

    // Calculate most assigned worker for each shift type
    workerAssignmentCounts.forEach((counts, templateId) => {
      const analytics = shiftMap.get(templateId)
      if (analytics) {
        let maxCount = 0
        let mostAssignedWorkerId = ""

        counts.forEach((count, workerId) => {
          if (count > maxCount) {
            maxCount = count
            mostAssignedWorkerId = workerId
          }
        })

        const worker = workers.find((w) => w.id === mostAssignedWorkerId)
        analytics.mostAssignedWorker = worker?.name || "Unknown"
      }
    })

    return Array.from(shiftMap.values()).filter((a) => a.totalAssignments > 0)
  }, [filteredSchedules, currentBranch, workers])

  const totalHours = workerPerformanceData.reduce((sum, worker) => sum + worker.totalHours, 0)
  const totalShifts = workerPerformanceData.reduce((sum, worker) => sum + worker.totalShifts, 0)
  const averageRating =
    workerPerformanceData.length > 0
      ? workerPerformanceData.reduce((sum, worker) => sum + worker.averageRating, 0) / workerPerformanceData.length
      : 0

  const topPerformers = [...workerPerformanceData].sort((a, b) => b.averageRating - a.averageRating).slice(0, 5)

  const chartData = workerPerformanceData.map((worker) => ({
    name: worker.name.split(" ")[0], // First name only for chart
    hours: Math.round(worker.totalHours * 10) / 10,
    shifts: worker.totalShifts,
    rating: Math.round(worker.averageRating * 10) / 10,
    reliability: Math.round(worker.reliability),
  }))

  const shiftDistributionData = shiftAnalytics.map((shift) => ({
    name: shift.templateName,
    value: shift.totalAssignments,
  }))

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#84cc16", "#f97316"]

  const weeklyTrendData = useMemo(() => {
    const weeks = []
    const { startDate } = getDateRange(selectedPeriod)
    const weekCount =
      selectedPeriod === "last-week"
        ? 1
        : selectedPeriod === "last-4-weeks"
          ? 4
          : selectedPeriod === "last-8-weeks"
            ? 8
            : 12

    for (let i = 0; i < weekCount; i++) {
      const weekStart = new Date(startDate.getTime() + i * 7 * 24 * 60 * 60 * 1000)
      const weekString = weekStart.toISOString().split("T")[0]

      const weekSchedule = filteredSchedules.find((s) => s.weekStartDate.substring(0, 10) === weekString)
      const weekHours = weekSchedule
        ? weekSchedule.shifts.reduce((sum, shift) => {
            return sum + shift.assignedWorkers.length * calculateShiftDuration(shift.startTime, shift.endTime)
          }, 0)
        : 0

      weeks.push({
        week: `Week ${i + 1}`,
        hours: Math.round(weekHours * 10) / 10,
        shifts: weekSchedule ? weekSchedule.shifts.length : 0,
      })
    }

    return weeks
  }, [filteredSchedules, selectedPeriod])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Manager Insights</h2>
          <p className="text-muted-foreground">Analytics and performance metrics for your team</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Hours</p>
                <p className="text-2xl font-bold">{Math.round(totalHours)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Shifts</p>
                <p className="text-2xl font-bold">{totalShifts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Active Workers</p>
                <p className="text-2xl font-bold">{workerPerformanceData.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Rating</p>
                <p className="text-2xl font-bold">{Math.round(averageRating * 10) / 10}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Worker Performance
            </CardTitle>
            <CardDescription>Hours, shifts, and ratings by worker</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hours">Hours</SelectItem>
                  <SelectItem value="shifts">Shifts</SelectItem>
                  <SelectItem value="rating">Rating</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey={selectedMetric} fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              Shift Distribution
            </CardTitle>
            <CardDescription>Assignment distribution by shift type</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={shiftDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {shiftDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Weekly Trends
          </CardTitle>
          <CardDescription>Hours and shifts over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weeklyTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="hours" stroke="#3b82f6" strokeWidth={2} name="Hours" />
              <Line type="monotone" dataKey="shifts" stroke="#10b981" strokeWidth={2} name="Shifts" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Performance Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-500" />
              Top Performers
            </CardTitle>
            <CardDescription>Highest rated workers in selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topPerformers.map((worker, index) => (
                <div key={worker.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
                      {index + 1}
                    </Badge>
                    <div>
                      <p className="font-medium">{worker.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {worker.totalShifts} shifts • {Math.round(worker.totalHours)}h
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="font-medium">{Math.round(worker.averageRating * 10) / 10}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{Math.round(worker.reliability)}% reliable</p>
                  </div>
                </div>
              ))}
              {topPerformers.length === 0 && (
                <p className="text-center text-muted-foreground py-4">No performance data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              Shift Analytics
            </CardTitle>
            <CardDescription>Performance by shift type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {shiftAnalytics.map((shift) => (
                <div key={shift.templateId} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{shift.templateName}</h4>
                    <Badge variant="secondary">{shift.totalAssignments} assignments</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>Most assigned: {shift.mostAssignedWorker}</p>
                  </div>
                </div>
              ))}
              {shiftAnalytics.length === 0 && (
                <p className="text-center text-muted-foreground py-4">No shift data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Worker Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Detailed Worker Performance
          </CardTitle>
          <CardDescription>Complete performance breakdown for all workers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Worker</th>
                  <th className="text-right p-2">Shifts</th>
                  <th className="text-right p-2">Hours</th>
                  <th className="text-right p-2">Avg Rating</th>
                  <th className="text-right p-2">Reliability</th>
                  <th className="text-right p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {workerPerformanceData.map((worker) => (
                  <tr key={worker.id} className="border-b hover:bg-muted/50">
                    <td className="p-2">
                      <div>
                        <p className="font-medium">{worker.name}</p>
                      </div>
                    </td>
                    <td className="text-right p-2">{worker.totalShifts}</td>
                    <td className="text-right p-2">{Math.round(worker.totalHours * 10) / 10}</td>
                    <td className="text-right p-2">
                      <div className="flex items-center justify-end gap-1">
                        <Star className="h-3 w-3 text-yellow-500" />
                        {Math.round(worker.averageRating * 10) / 10}
                      </div>
                    </td>
                    <td className="text-right p-2">{Math.round(worker.reliability)}%</td>
                    <td className="text-right p-2">
                      <Badge
                        variant={
                          worker.averageRating >= 4
                            ? "default"
                            : worker.averageRating >= 3
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {worker.averageRating >= 4
                          ? "Excellent"
                          : worker.averageRating >= 3
                            ? "Good"
                            : "Needs Improvement"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {workerPerformanceData.length === 0 && (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No worker performance data available for the selected period</p>
                <p className="text-sm text-muted-foreground mt-1">Generate some schedules to see insights here</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
