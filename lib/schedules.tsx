"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import type { Schedule, ScheduledShift, Worker, ShiftTemplate, WorkerRestriction } from "@/types"
import { useBranch } from "./branch"
import { useWorkers } from "./workers"
import { localDB } from "./local-db"
import { useAxois } from "./axois"

interface SchedulingPreferences {
  maxHoursPerWeek: number
  balanceWorkload: boolean
  preferExperiencedWorkers: boolean
  allowOvertime: boolean
  overtimeThreshold: number
  prioritizeSkillMatch: boolean
}

interface ScheduleContextType {
  schedules: Schedule[]
  generateSchedule: (
    weekStartDate: string,
    selectedShifts: string[],
    preferences?: Partial<SchedulingPreferences>,
  ) => Promise<Schedule>
  saveSchedule: (schedule: Schedule) => Promise<boolean>
  updateSchedule: (scheduleId: string, updates: Partial<Schedule>) => Promise<boolean>
  deleteSchedule: (scheduleId: string) => Promise<boolean>
  archiveSchedule: (scheduleId: string) => Promise<boolean>
  restoreSchedule: (scheduleId: string) => Promise<boolean>
  getScheduleById: (scheduleId: string) => Schedule | undefined
  getScheduleForWeek: (weekStartDate: string) => Schedule | undefined
  moveWorkerToShift: (scheduleId: string, workerId: string, fromShiftId: string, toShiftId: string) => Promise<boolean>
  refreshSchedules: () => Promise<void>
  loading: boolean
  error: string | null
}

const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined)

const DEFAULT_PREFERENCES: SchedulingPreferences = {
  maxHoursPerWeek: 40,
  balanceWorkload: true,
  preferExperiencedWorkers: true,
  allowOvertime: false,
  overtimeThreshold: 50,
  prioritizeSkillMatch: true,
}

export function ScheduleProvider({ children }: { children: React.ReactNode }) {
  const { currentBranch } = useBranch()
  const { workers, getWorkerAvailability } = useWorkers()
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
 const { instance } = useAxois()
  useEffect(() => {
    if (currentBranch) {
      initializeSchedules()
    } else {
      resetScheduleState()
    }
  }, [currentBranch])

  const resetScheduleState = () => {
    setSchedules([])
    setLoading(false)
    setError(null)
  }

  const initializeSchedules = async () => {
    try {
      setLoading(true)
      setError(null)
      await loadSchedules()
    } catch (err) {
      console.error("Error initializing schedules:", err)
      setError("Failed to load schedule data")
    } finally {
      setLoading(false)
    }
  }

  const loadSchedules = async () => {
    try {
      //todo specific
      const allSchedules = (await instance({branchId:currentBranch?.id}).get("/schedules")).data|| []
      //todo fix the hack
      if(allSchedules.length > 0){
        allSchedules[0].weekStartDate = allSchedules[0].weekStartDate.substring(0, 10);
    allSchedules[0].shifts.forEach((x: any) => {
    x.date  =  x.date.substring(0, 10);
  })};

      //const allSchedules = (await localDB.safeGet("schedules")) || []
      const branchSchedules = allSchedules.filter((schedule: Schedule) => schedule.branchId === currentBranch?.id)
      setSchedules(branchSchedules)
      console.log("Schedules loaded:", branchSchedules.length)
    } catch (error) {
      console.error("Error loading schedules:", error)
      await handleScheduleLoadingFallback()
    }
  }

  const handleScheduleLoadingFallback = async () => {
    try {
      const fallbackSchedules = JSON.parse(localStorage.getItem("smart-scheduler-schedules") || "[]")
      if (fallbackSchedules.length > 0) {
        await localDB.safeSet("schedules", fallbackSchedules)
        const branchSchedules = fallbackSchedules.filter(
          (schedule: Schedule) => schedule.branchId === currentBranch?.id,
        )
        setSchedules(branchSchedules)
        console.log("Fallback schedules loaded:", branchSchedules.length)
      }
    } catch (fallbackError) {
      console.error("Schedule fallback loading failed:", fallbackError)
    }
  }

  const hasApprovedTimeOff = async (workerId: string, date: string): Promise<boolean> => {
    try {
      const allTimeOffRequests = (await localDB.safeGet("timeOffRequests")) || []
      const workerRequests = allTimeOffRequests.filter(
        (request: any) => request.workerId === workerId && request.status === "approved",
      )

      const checkDate = new Date(date)

      return workerRequests.some((request: any) => {
        const startDate = new Date(request.startDate)
        const endDate = new Date(request.endDate)
        return checkDate >= startDate && checkDate <= endDate
      })
    } catch (error) {
      console.error("Error checking time off:", error)
      return false
    }
  }

  const isWorkerAvailableForShift = async (
    worker: Worker,
    dayOfWeek: string,
    shiftTemplate: ShiftTemplate,
    weekStartDate: string,
    date: string,
  ): Promise<boolean> => {
    console.log(`🔍 Checking availability: ${worker.name} on ${dayOfWeek} for ${shiftTemplate.name}`)
    console.log(`📋 Worker ID: ${worker.id}, Week: ${weekStartDate}, Date: ${date}`)

    const hasTimeOff = await hasApprovedTimeOff(worker.id, date)
    if (hasTimeOff) {
      console.log(`🏖️ ${worker.name} has approved time off on ${date}`)
      return false
    }

    const availabilitySubmission = getWorkerAvailability(worker.id, weekStartDate)
    console.log(`📊 Availability submission found:`, availabilitySubmission ? "YES" : "NO")

    if (availabilitySubmission) {
      console.log(`📋 Submission details:`, {
        id: availabilitySubmission.id,
        workerId: availabilitySubmission.workerId,
        weekStartDate: availabilitySubmission.weekStartDate,
        status: availabilitySubmission.status,
        hasAvailability: !!availabilitySubmission.availability,
      })

      if (availabilitySubmission.availability) {
        console.log(`📅 Available days:`, Object.keys(availabilitySubmission.availability))
        console.log(`📅 ${dayOfWeek} availability:`, availabilitySubmission.availability[dayOfWeek.toLowerCase()])
      }
    }

    if (!availabilitySubmission?.availability || availabilitySubmission.status !== "approved") {
      console.log(`❌ No approved availability submission found for ${worker.name} for week ${weekStartDate}`)
      console.log(`📋 Status: ${availabilitySubmission?.status || "none"}`)
      return false
    }

    const dayAvailability = availabilitySubmission.availability[dayOfWeek.toLowerCase()]
    console.log(`📅 Day availability for ${dayOfWeek}:`, dayAvailability)

    if (!dayAvailability || !Array.isArray(dayAvailability.shifts)) {
      console.log(`❌ No availability for ${worker.name} on ${dayOfWeek}`)
      console.log(`📋 Day availability structure:`, dayAvailability)
      return false
    }

    console.log(`📋 Available shifts for ${dayOfWeek}:`, dayAvailability.shifts)
    console.log(`🎯 Looking for shift template ID:`, shiftTemplate.id)

    const isAvailable = dayAvailability.shifts.includes(shiftTemplate.id)
    console.log(`${isAvailable ? "✅" : "❌"} Worker-submitted availability: ${isAvailable}`)
    return isAvailable
  }

  const calculateWorkerScore = (
    worker: Worker,
    shiftTemplate: ShiftTemplate,
    preferences: SchedulingPreferences,
  ): number => {
    let score = 0

    // Base score from ratings
    const ratings = Object.values(worker.ratings || {})
    const averageRating = ratings.length > 0 ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : 0
    score += averageRating * 20 // 0-100 scale

    if (shiftTemplate.jobTitleRequirements && worker.jobTitle) {
      if (shiftTemplate.jobTitleRequirements[worker.jobTitle]) {
        score += 25 // Strong bonus for exact job title match
      }
    }

    // Experience bonus
    if (preferences.preferExperiencedWorkers && averageRating >= 4) {
      score += 15
    }

    // Role-based bonuses
    const seniorRoles = ["Manager", "Supervisor", "Team Lead", "Senior"]
    if (seniorRoles.some((role) => worker.role.includes(role))) {
      score += 10

      // Extra bonus for high-priority shifts
      if (shiftTemplate.priority > 1) {
        score += 10
      }
    }

    // Skill matching bonus
    if (preferences.prioritizeSkillMatch) {
      // Check if worker has high ratings in relevant skills
      const relevantSkills = ["Customer Service", "Technical Skills", "Leadership"]
      const skillBonus = relevantSkills.reduce((bonus, skill) => {
        const rating = worker.ratings?.[skill] || 0
        return bonus + (rating >= 4 ? 5 : 0)
      }, 0)
      score += skillBonus
    }

    return Math.max(0, score)
  }

  const hasWorkerRestrictions = async (worker1Id: string, worker2Id: string, branchId: string): Promise<boolean> => {
    try {
      const allRestrictions = (await localDB.safeGet("workerRestrictions")) || []
      const branchRestrictions = allRestrictions.filter((r: WorkerRestriction) => r.branchId === branchId)

      return branchRestrictions.some(
        (restriction: WorkerRestriction) =>
          (restriction.worker1Id === worker1Id && restriction.worker2Id === worker2Id) ||
          (restriction.worker1Id === worker2Id && restriction.worker2Id === worker1Id),
      )
    } catch (error) {
      console.error("Error checking worker restrictions:", error)
      return false
    }
  }

  const generateOptimalAssignment = async (
    availableWorkers: Worker[],
    shiftTemplate: ShiftTemplate,
    dayOfWeek: string,
    date: string,
    workerHours: { [workerId: string]: number },
    preferences: SchedulingPreferences,
  ): Promise<ScheduledShift> => {
    const selectedWorkers: string[] = []

    const checkRestrictions = async (workerId: string, currentlySelected: string[]): Promise<boolean> => {
      if (!currentBranch) return true

      for (const selectedId of currentlySelected) {
        const hasRestriction = await hasWorkerRestrictions(workerId, selectedId, currentBranch.id)
        if (hasRestriction) {
          console.log(`🚫 Worker restriction: ${workerId} cannot work with ${selectedId}`)
          return false
        }
      }
      return true
    }

    if (shiftTemplate.jobTitleRequirements && Object.keys(shiftTemplate.jobTitleRequirements).length > 0) {
      const jobTitleGroups: { [jobTitle: string]: Worker[] } = {}

      // Group workers by job title
      availableWorkers.forEach((worker) => {
        if (worker.jobTitle) {
          if (!jobTitleGroups[worker.jobTitle]) {
            jobTitleGroups[worker.jobTitle] = []
          }
          jobTitleGroups[worker.jobTitle].push(worker)
        }
      })

      // Assign workers based on job title requirements
      for (const [jobTitle, requiredCount] of Object.entries(shiftTemplate.jobTitleRequirements)) {
        const workersWithTitle = jobTitleGroups[jobTitle] || []

        // Sort by score and hours
        const sortedWorkers = workersWithTitle
          .map((worker) => ({
            worker,
            score: calculateWorkerScore(worker, shiftTemplate, preferences),
            currentHours: workerHours[worker.id] || 0,
          }))
          .sort((a, b) => {
            if (preferences.balanceWorkload) {
              const hoursDiff = a.currentHours - b.currentHours
              if (Math.abs(hoursDiff) > 3) return hoursDiff
            }
            return b.score - a.score
          })

        // Select required number of workers with this job title, checking restrictions
        let selectedFromTitle = 0
        for (const workerScore of sortedWorkers) {
          if (selectedFromTitle >= requiredCount) break

          const canWork = await checkRestrictions(workerScore.worker.id, selectedWorkers)
          if (canWork) {
            selectedWorkers.push(workerScore.worker.id)
            selectedFromTitle++
          }
        }

        console.log(`📋 Job title assignments: ${selectedFromTitle} workers assigned for ${jobTitle}`)
      }
    }

    const remainingSlots = shiftTemplate.requiredWorkers - selectedWorkers.length
    if (remainingSlots > 0) {
      const remainingWorkers = availableWorkers.filter((worker) => !selectedWorkers.includes(worker.id))

      const workerScores = remainingWorkers.map((worker) => ({
        worker,
        score: calculateWorkerScore(worker, shiftTemplate, preferences),
        currentHours: workerHours[worker.id] || 0,
      }))

      // Sort remaining workers
      if (preferences.balanceWorkload) {
        workerScores.sort((a, b) => {
          const hoursDiff = a.currentHours - b.currentHours
          if (Math.abs(hoursDiff) > 3) return hoursDiff
          return b.score - a.score
        })
      } else {
        workerScores.sort((a, b) => b.score - a.score)
      }

      // Select additional workers, checking restrictions
      let additionalSelected = 0
      for (const workerScore of workerScores) {
        if (additionalSelected >= remainingSlots) break

        const canWork = await checkRestrictions(workerScore.worker.id, selectedWorkers)
        if (canWork) {
          selectedWorkers.push(workerScore.worker.id)
          additionalSelected++
        }
      }
    }

    console.log(
      `📋 Final assignment: ${selectedWorkers.length}/${shiftTemplate.requiredWorkers} workers for ${shiftTemplate.name}`,
    )

    return {
      id: crypto.randomUUID(),
      templateId: shiftTemplate.id,
      date,
      startTime: shiftTemplate.startTime,
      endTime: shiftTemplate.endTime,
      assignedWorkers: selectedWorkers,
    }
  }

  const calculateShiftDuration = (startTime: string, endTime: string): number => {
    const start = new Date(`2000-01-01T${startTime}:00`)
    const end = new Date(`2000-01-01T${endTime}:00`)
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60) // Hours
  }

  const isShiftWithinBranchHours = (
    shiftTemplate: ShiftTemplate,
    branchHours: { start: string; end: string; isOpen: boolean },
  ): boolean => {
    if (!branchHours.isOpen) return false

    const branchStart = new Date(`2000-01-01T${branchHours.start}:00`)
    const branchEnd = new Date(`2000-01-01T${branchHours.end}:00`)
    const shiftStart = new Date(`2000-01-01T${shiftTemplate.startTime}:00`)
    const shiftEnd = new Date(`2000-01-01T${shiftTemplate.endTime}:00`)

    return shiftStart >= branchStart && shiftEnd <= branchEnd
  }

  const generateSchedule = async (
    weekStartDate: string,
    selectedShifts: string[],
    customPreferences?: Partial<SchedulingPreferences>,
  ): Promise<Schedule> => {
    if (!currentBranch) {
      throw new Error("No branch selected")
    }

    customPreferences =  await localDB.safeGet("schedulingPreferences")
    const preferences = { ...DEFAULT_PREFERENCES, ...customPreferences }
    console.log(`🚀 Generating schedule for week ${weekStartDate}`)
    console.log(`⚙️ Preferences:`, preferences)

    // Get fresh worker data
    const allWorkers = (await localDB.safeGet("workers")) || []
    const branchWorkers = allWorkers.filter((worker: Worker) => worker.branchId === currentBranch.id)
    console.log(`👥 Available workers: ${branchWorkers.length}`)
    branchWorkers.forEach((worker) => {
      console.log(`👤 Worker: ${worker.name} (ID: ${worker.id}, Branch: ${worker.branchId})`)
    })

    console.log(`📊 Checking availability submissions for all workers...`)
    branchWorkers.forEach((worker) => {
      const availability = getWorkerAvailability(worker.id, weekStartDate)
      console.log(
        `📋 ${worker.name}: ${availability ? "HAS AVAILABILITY" : "NO AVAILABILITY"} for week ${weekStartDate}`,
      )
      if (availability) {
        console.log(`  📅 Submission ID: ${availability.id}`)
        console.log(`  📅 Status: ${availability.status}`)
        console.log(`  📅 Available days:`, Object.keys(availability.availability || {}))
      }
    })

    const startDate = new Date(weekStartDate)
    const shifts: ScheduledShift[] = []
    const daysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]

    // Track worker hours and daily assignments
    const workerHours: { [workerId: string]: number } = {}
    const workerDailyAssignments: { [workerId: string]: { [date: string]: string[] } } = {}

    branchWorkers.forEach((worker) => {
      workerHours[worker.id] = 0
      workerDailyAssignments[worker.id] = {}
    })

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const currentDate = new Date(startDate)
      currentDate.setDate(startDate.getDate() + dayOffset)
      const dayOfWeek = daysOfWeek[currentDate.getDay()]
      const dateString = currentDate.toISOString().split("T")[0]

      console.log(`📅 Processing ${dayOfWeek} (${dateString})`)

      // Check branch hours
      const branchHours = currentBranch.settings?.openingHours?.[dayOfWeek]
      if (!branchHours?.isOpen) {
        console.log(`🚫 Branch closed on ${dayOfWeek}`)
        continue
      }

      const dayShiftTemplates = selectedShifts
        .map((shiftTemplateId) => currentBranch.settings?.shiftTemplates?.find((st) => st.id === shiftTemplateId))
        .filter(Boolean)
        .filter((template) => {
          const templateDays =
            template!.days && template!.days.length > 0
              ? template!.days
              : ["monday", "tuesday", "wednesday", "thursday", "friday"]

          const appliesToDay = templateDays.includes(dayOfWeek)
          console.log(`🔍 ${template!.name} days:`, templateDays, `applies to ${dayOfWeek}:`, appliesToDay)

          if (!appliesToDay) {
            console.log(`🚫 ${template!.name} does not apply to ${dayOfWeek}`)
          }
          return appliesToDay
        })
        .sort((a, b) => {
          // Sort by start time to process earlier shifts first
          return a!.startTime.localeCompare(b!.startTime)
        })

      console.log(`📋 ${dayShiftTemplates.length} shift templates apply to ${dayOfWeek}`)

      // Process each shift template for this day
      for (const shiftTemplate of dayShiftTemplates) {
        if (!shiftTemplate) continue

        console.log(`🎯 Processing ${shiftTemplate.name} (${shiftTemplate.startTime}-${shiftTemplate.endTime})`)

        // Check if shift is within branch hours
        if (!isShiftWithinBranchHours(shiftTemplate, branchHours)) {
          console.log(`⚠️ Shift outside branch hours`)
          // Create empty shift to show it needs manual assignment
          shifts.push({
            id: crypto.randomUUID(),
            templateId: shiftTemplate.id,
            date: dateString,
            startTime: shiftTemplate.startTime,
            endTime: shiftTemplate.endTime,
            assignedWorkers: [],
          })
          continue
        }

        const availableWorkers = []
        for (const worker of branchWorkers) {
          const isAvailable = await isWorkerAvailableForShift(
            worker,
            dayOfWeek,
            shiftTemplate,
            weekStartDate,
            dateString,
          )
          if (!isAvailable) {
            console.log(`❌ ${worker.name} not available for ${shiftTemplate.name} on ${dayOfWeek}`)
            continue
          }

          const dailyAssignments = workerDailyAssignments[worker.id][dateString] || []
          if (dailyAssignments.length > 0) {
            console.log(`⚠️ ${worker.name} already assigned to ${dailyAssignments.length} shift(s) on ${dayOfWeek}`)

            let hasConflict = false
            for (const existingShiftId of dailyAssignments) {
              const existingShift = shifts.find((s) => s.id === existingShiftId)
              if (existingShift && hasTimeConflict(shiftTemplate, existingShift)) {
                console.log(`🚫 Time conflict detected for ${worker.name}`)
                hasConflict = true
                break
              }
            }
            if (hasConflict) continue
          }

          const shiftDuration = calculateShiftDuration(shiftTemplate.startTime, shiftTemplate.endTime)
          const maxHours = preferences.allowOvertime ? preferences.overtimeThreshold : preferences.maxHoursPerWeek

          if (workerHours[worker.id] + shiftDuration > maxHours) {
            console.log(`⏰ ${worker.name} would exceed ${maxHours}h limit`)
            continue
          }

          availableWorkers.push(worker)
        }

        console.log(`✅ Available workers for ${shiftTemplate.name}: ${availableWorkers.length}`)
        availableWorkers.forEach((w) => console.log(`  - ${w.name}`))

        const scheduledShift = await generateOptimalAssignment(
          availableWorkers,
          shiftTemplate,
          dayOfWeek,
          dateString,
          workerHours,
          preferences,
        )

        shifts.push(scheduledShift)

        const shiftDuration = calculateShiftDuration(shiftTemplate.startTime, shiftTemplate.endTime)
        scheduledShift.assignedWorkers.forEach((workerId) => {
          workerHours[workerId] += shiftDuration

          if (!workerDailyAssignments[workerId][dateString]) {
            workerDailyAssignments[workerId][dateString] = []
          }
          workerDailyAssignments[workerId][dateString].push(scheduledShift.id)

          const workerName = branchWorkers.find((w) => w.id === workerId)?.name || "Unknown"
          console.log(`📝 Assigned ${workerName} to ${shiftTemplate.name} on ${dayOfWeek} (${shiftDuration}h)`)
        })
      }
    }

    const newSchedule: Schedule = {
      id: crypto.randomUUID(),
      branchId: currentBranch.id,
      weekStartDate,
      shifts,
      createdAt: new Date().toISOString(),
    }

    console.log(`🎉 Schedule generated with ${shifts.length} shifts`)
    console.log(
      `📊 Worker hours:`,
      Object.entries(workerHours).map(([id, hours]) => {
        const worker = branchWorkers.find((w) => w.id === id)
        return `${worker?.name || "Unknown"}: ${hours}h`
      }),
    )

    return newSchedule
  }

  const hasTimeConflict = (shiftTemplate: ShiftTemplate, existingShift: ScheduledShift): boolean => {
    const newStart = new Date(`2000-01-01T${shiftTemplate.startTime}:00`)
    const newEnd = new Date(`2000-01-01T${shiftTemplate.endTime}:00`)
    const existingStart = new Date(`2000-01-01T${existingShift.startTime}:00`)
    const existingEnd = new Date(`2000-01-01T${existingShift.endTime}:00`)

    // Check if times overlap
    return newStart < existingEnd && newEnd > existingStart
  }

  const saveSchedule = async (schedule: Schedule): Promise<boolean> => {
    try {
      const allSchedules = (await localDB.safeGet("schedules")) || []
      const existingIndex = allSchedules.findIndex((s: Schedule) => s.id === schedule.id)

      if (existingIndex >= 0) {
        allSchedules[existingIndex] = schedule
      } else {
        allSchedules.push(schedule)
      }

      await instance({}).post('/schedule',schedule);

      await localDB.safeSet("schedules", allSchedules)
      setSchedules((prev) => {
        const updated = prev.filter((s) => s.id !== schedule.id)
        return [...updated, schedule]
      })

      console.log("Schedule saved:", schedule.id)
      return true
    } catch (error) {
      console.error("Error saving schedule:", error)
      return false
    }
  }

  const updateSchedule = async (scheduleId: string, updates: Partial<Schedule>): Promise<boolean> => {
    try {
      const allSchedules = (await localDB.safeGet("schedules")) || []
      const scheduleIndex = allSchedules.findIndex((s: Schedule) => s.id === scheduleId)

      if (scheduleIndex === -1) {
        return false
      }

      allSchedules[scheduleIndex] = { ...allSchedules[scheduleIndex], ...updates }
      await localDB.safeSet("schedules", allSchedules)

      setSchedules((prev) => prev.map((s) => (s.id === scheduleId ? { ...s, ...updates } : s)))

      console.log("Schedule updated:", scheduleId)
      return true
    } catch (error) {
      console.error("Error updating schedule:", error)
      return false
    }
  }

  const deleteSchedule = async (scheduleId: string): Promise<boolean> => {
    try {
      await instance({scheduleId}).delete('/schedules');
      const allSchedules = (await localDB.safeGet("schedules")) || []
      const filteredSchedules = allSchedules.filter((schedule: Schedule) => schedule.id !== scheduleId)
      await localDB.safeSet("schedules", filteredSchedules)
      setSchedules((prev) => prev.filter((schedule) => schedule.id !== scheduleId))
      console.log("Schedule deleted:", scheduleId)
      return true
    } catch (error) {
      console.error("Error deleting schedule:", error)
      return false
    }
  }

  const archiveSchedule = async (scheduleId: string): Promise<boolean> => {
    return await updateSchedule(scheduleId, { archived: true })
  }

  const restoreSchedule = async (scheduleId: string): Promise<boolean> => {
    return await updateSchedule(scheduleId, { archived: false })
  }

  const getScheduleById = (scheduleId: string): Schedule | undefined => {
    return schedules.find((schedule) => schedule.id === scheduleId)
  }

  const getScheduleForWeek = (weekStartDate: string): Schedule | undefined => {
    return schedules.find((schedule) => schedule.weekStartDate.substring(0, 10) === weekStartDate)
  }

  const moveWorkerToShift = async (
    scheduleId: string,
    workerId: string,
    fromShiftId: string,
    toShiftId: string,
  ): Promise<boolean> => {
    try {
      const schedule = getScheduleById(scheduleId)
      if (!schedule) return false

      const updatedShifts = schedule.shifts.map((shift) => {
        if (shift.id === fromShiftId) {
          return {
            ...shift,
            assignedWorkers: shift.assignedWorkers.filter((id) => id !== workerId),
          }
        }
        if (shift.id === toShiftId) {
          const assignedWorkers = shift.assignedWorkers.includes(workerId)
            ? shift.assignedWorkers
            : [...shift.assignedWorkers, workerId]
          return {
            ...shift,
            assignedWorkers,
          }
        }
        return shift
      })

      return await updateSchedule(scheduleId, { shifts: updatedShifts })
    } catch (error) {
      console.error("Error moving worker:", error)
      return false
    }
  }

  const refreshSchedules = async () => {
    await loadSchedules()
  }

  return (
    <ScheduleContext.Provider
      value={{
        schedules,
        generateSchedule,
        saveSchedule,
        updateSchedule,
        deleteSchedule,
        archiveSchedule,
        restoreSchedule,
        getScheduleById,
        getScheduleForWeek,
        moveWorkerToShift,
        refreshSchedules,
        loading,
        error,
      }}
    >
      {children}
    </ScheduleContext.Provider>
  )
}

export function useSchedules() {
  const context = useContext(ScheduleContext)
  if (context === undefined) {
    throw new Error("useSchedules must be used within a ScheduleProvider")
  }
  return context
}
