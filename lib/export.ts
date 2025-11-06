import type { Schedule, Worker } from "@/types"

export interface ExportData {
  schedule: Schedule
  workers: Worker[]
  branchName: string
  shiftTemplates: { [id: string]: string }
}

export function exportScheduleToCSV(data: ExportData, format: "detailed" | "summary" | "worker-hours" = "detailed") {
  let csvContent = ""
  const { schedule, workers, branchName, shiftTemplates } = data

  const getWorkerName = (workerId: string) => {
    const worker = workers.find((w) => w.id === workerId)
    return worker?.name || "Unknown Worker"
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":")
    const hour = Number.parseInt(hours)
    const ampm = hour >= 12 ? "PM" : "AM"
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  if (format === "detailed") {
    // Detailed schedule export
    csvContent = `Schedule Export - ${branchName}\n`
    csvContent += `Week of ${formatDate(schedule.weekStartDate)}\n`
    csvContent += `Generated on ${formatDate(schedule.createdAt)}\n\n`

    csvContent += "Date,Day,Shift Name,Start Time,End Time,Assigned Workers,Worker Count\n"

    const sortedShifts = schedule.shifts.sort((a, b) => {
      const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime()
      if (dateCompare !== 0) return dateCompare
      return a.startTime.localeCompare(b.startTime)
    })

    for (const shift of sortedShifts) {
      const date = formatDate(shift.date)
      const dayName = new Date(shift.date).toLocaleDateString("en-US", { weekday: "long" })
      const shiftName = shiftTemplates[shift.templateId] || "Unknown Shift"
      const startTime = formatTime(shift.startTime)
      const endTime = formatTime(shift.endTime)
      const workerNames = shift.assignedWorkers.map(getWorkerName).join("; ")
      const workerCount = shift.assignedWorkers.length

      csvContent += `"${date}","${dayName}","${shiftName}","${startTime}","${endTime}","${workerNames}",${workerCount}\n`
    }
  } else if (format === "summary") {
    // Summary export
    csvContent = `Schedule Summary - ${branchName}\n`
    csvContent += `Week of ${formatDate(schedule.weekStartDate)}\n\n`

    const dailySummary: { [date: string]: { shifts: number; workers: Set<string> } } = {}

    for (const shift of schedule.shifts) {
      if (!dailySummary[shift.date]) {
        dailySummary[shift.date] = { shifts: 0, workers: new Set() }
      }
      dailySummary[shift.date].shifts++
      shift.assignedWorkers.forEach((workerId) => dailySummary[shift.date].workers.add(workerId))
    }

    csvContent += "Date,Day,Total Shifts,Unique Workers,Total Assignments\n"

    const sortedDates = Object.keys(dailySummary).sort()
    for (const date of sortedDates) {
      const dayName = new Date(date).toLocaleDateString("en-US", { weekday: "long" })
      const summary = dailySummary[date]
      const totalAssignments = schedule.shifts
        .filter((s) => s.date === date)
        .reduce((sum, s) => sum + s.assignedWorkers.length, 0)

      csvContent += `"${formatDate(date)}","${dayName}",${summary.shifts},${summary.workers.size},${totalAssignments}\n`
    }

    csvContent += "\nOverall Summary\n"
    csvContent += `Total Shifts,${schedule.shifts.length}\n`
    csvContent += `Total Assignments,${schedule.shifts.reduce((sum, s) => sum + s.assignedWorkers.length, 0)}\n`
    csvContent += `Unique Workers,${new Set(schedule.shifts.flatMap((s) => s.assignedWorkers)).size}\n`
  } else if (format === "worker-hours") {
    // Worker hours export
    csvContent = `Worker Hours Report - ${branchName}\n`
    csvContent += `Week of ${formatDate(schedule.weekStartDate)}\n\n`

    const workerHours: { [workerId: string]: { name: string; hours: number; shifts: number } } = {}

    for (const shift of schedule.shifts) {
      const shiftDuration =
        (new Date(`2000-01-01T${shift.endTime}:00`).getTime() -
          new Date(`2000-01-01T${shift.startTime}:00`).getTime()) /
        (1000 * 60 * 60)

      for (const workerId of shift.assignedWorkers) {
        if (!workerHours[workerId]) {
          workerHours[workerId] = {
            name: getWorkerName(workerId),
            hours: 0,
            shifts: 0,
          }
        }
        workerHours[workerId].hours += shiftDuration
        workerHours[workerId].shifts++
      }
    }

    csvContent += "Worker Name,Total Hours,Total Shifts,Average Hours per Shift\n"

    const sortedWorkers = Object.entries(workerHours).sort(([, a], [, b]) => b.hours - a.hours)

    for (const [workerId, data] of sortedWorkers) {
      const avgHours = data.shifts > 0 ? (data.hours / data.shifts).toFixed(1) : "0"
      csvContent += `"${data.name}",${data.hours.toFixed(1)},${data.shifts},${avgHours}\n`
    }
  }

  return csvContent
}

export function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", filename)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}

export function exportWorkersToCSV(workers: Worker[], branchName: string) {
  let csvContent = `Workers Export - ${branchName}\n`
  csvContent += `Exported on ${new Date().toLocaleDateString()}\n\n`

  csvContent += "Name,Email,Role,Average Rating,Available Days,Total Criteria Ratings\n"

  for (const worker of workers) {
    const ratings = Object.values(worker.ratings)
    const avgRating = ratings.length > 0 ? (ratings.reduce((sum, r) => sum + r, 0) / ratings.length).toFixed(1) : "0"

    const availableDays = Object.entries(worker.availability)
      .filter(([, schedule]) => schedule.available)
      .map(([day]) => day.charAt(0).toUpperCase() + day.slice(1, 3))
      .join("; ")

    const criteriaCount = Object.keys(worker.ratings).length

    csvContent += `"${worker.name}","${worker.email}","${worker.role}",${avgRating},"${availableDays}",${criteriaCount}\n`
  }

  return csvContent
}
