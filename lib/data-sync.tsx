"use client"

import { localDB } from "./local-db"
import type { User, Worker, Schedule } from "@/types"

export function useDataSync() {
  const getFranchiseUsers = async (currentUserId: string): Promise<User[]> => {
    try {
      const users = (await localDB.safeGet("users")) || []
      const currentUser = users.find((u: User) => u.id === currentUserId)

      if (!currentUser?.franchiseKey) {
        return [currentUser].filter(Boolean)
      }

      const franchiseUsers = users.filter(
        (u: User) => u.franchiseKey === currentUser.franchiseKey && u.role !== "master_admin",
      )

      console.log(`Found ${franchiseUsers.length} users in franchise ${currentUser.franchiseKey}`)
      return franchiseUsers
    } catch (error) {
      console.error("Error getting franchise users:", error)
      return []
    }
  }

  const getFranchiseWorkers = async (currentUserId: string): Promise<Worker[]> => {
    try {
      const franchiseUsers = await getFranchiseUsers(currentUserId)
      const managers = franchiseUsers.filter((u) => u.role === "user")

      let allWorkers: Worker[] = []
      const workerCache = new Map<string, Worker[]>()

      for (const manager of managers) {
        // Check cache first
        if (workerCache.has(manager.id)) {
          const cachedWorkers = workerCache.get(manager.id)!
          allWorkers = [...allWorkers, ...cachedWorkers]
          continue
        }

        const managerWorkers = (await localDB.safeGet("workers")) || []
        const filteredWorkers = managerWorkers.filter((worker: Worker) => worker.branchId)

        const workersWithManager = filteredWorkers.map((worker: Worker) => ({
          ...worker,
          managerName: manager.name,
          branchName: manager.branchName,
        }))

        workerCache.set(manager.id, workersWithManager)
        allWorkers = [...allWorkers, ...workersWithManager]
      }

      console.log(`Found ${allWorkers.length} workers across ${managers.length} managers`)
      return allWorkers
    } catch (error) {
      console.error("Error getting franchise workers:", error)
      return []
    }
  }

  const getFranchiseSchedules = async (
    currentUserId: string,
    dateRange?: { start: Date; end: Date },
  ): Promise<Schedule[]> => {
    try {
      const franchiseUsers = await getFranchiseUsers(currentUserId)
      const managers = franchiseUsers.filter((u) => u.role === "user")

      let allSchedules: Schedule[] = []

      for (const manager of managers) {
        const managerSchedules = (await localDB.safeGet("schedules")) || []
        let filteredSchedules = managerSchedules.filter((schedule: Schedule) => schedule.branchId)

        // Apply date filtering if provided
        if (dateRange) {
          filteredSchedules = filteredSchedules.filter((schedule: Schedule) => {
            const scheduleDate = new Date(schedule.weekStartDate)
            return scheduleDate >= dateRange.start && scheduleDate <= dateRange.end
          })
        }

        const schedulesWithManager = filteredSchedules.map((schedule: Schedule) => ({
          ...schedule,
          managerName: manager.name,
          branchName: manager.branchName,
        }))

        allSchedules = [...allSchedules, ...schedulesWithManager]
      }

      console.log(`Found ${allSchedules.length} schedules across ${managers.length} managers`)
      return allSchedules
    } catch (error) {
      console.error("Error getting franchise schedules:", error)
      return []
    }
  }

  // Get manager's data for workers
  const getManagerData = async (workerId: string) => {
    try {
      console.log("🔍 Getting manager data for worker:", workerId)

      const users = (await localDB.safeGet("users")) || []
      console.log("📋 Total users found:", users.length)

      const worker = users.find((u: User) => u.id === workerId)
      console.log(
        "👤 Worker found:",
        worker ? { id: worker.id, name: worker.name, managerId: worker.managerId } : "NOT FOUND",
      )

      if (!worker?.managerId) {
        console.log("❌ Worker has no managerId:", workerId)
        return null
      }

      const manager = users.find((u: User) => u.id === worker.managerId)
      console.log("👨‍💼 Manager found:", manager ? { id: manager.id, name: manager.name } : "NOT FOUND")

      if (!manager) {
        console.log("❌ Manager not found:", worker.managerId)
        return null
      }

      let schedules: Schedule[] = []
      try {
        const allSchedules = (await localDB.safeGet("schedules")) || []
        console.log("📅 Total schedules in database:", allSchedules.length)

        // Find manager's branch to get branchId
        const allBranches = (await localDB.safeGet("branches")) || []
        const managerBranch = allBranches.find((branch: any) => branch.ownerId === manager.id)

        if (managerBranch) {
          schedules = allSchedules.filter((schedule: Schedule) => schedule.branchId === managerBranch.id)
          console.log("📅 Manager's schedules found:", schedules.length)
        } else {
          console.log("❌ Manager's branch not found, cannot filter schedules")
        }
      } catch (error) {
        console.error("❌ Error loading schedules:", error)
      }

      let branchSettings = null
      try {
        const allBranches = (await localDB.safeGet("branches")) || []
        console.log(
          "🏢 All branches from local database:",
          allBranches.map((b: any) => ({ id: b.id, ownerId: b.ownerId, name: b.name })),
        )

        const managerBranch = allBranches.find((branch: any) => branch.ownerId === manager.id)
        console.log(
          "🏢 Manager's branch found:",
          managerBranch
            ? {
                id: managerBranch.id,
                ownerId: managerBranch.ownerId,
                hasSettings: !!managerBranch.settings,
                shiftTemplatesCount: managerBranch.settings?.shiftTemplates?.length || 0,
              }
            : "NOT FOUND",
        )

        if (managerBranch) {
          branchSettings = managerBranch.settings
          console.log("⚙️ Branch settings loaded:", {
            hasShiftTemplates: !!branchSettings?.shiftTemplates,
            shiftTemplatesCount: branchSettings?.shiftTemplates?.length || 0,
            weekStartDay: branchSettings?.weekStartDay,
            templates: branchSettings?.shiftTemplates?.map((t: any) => ({ id: t.id, name: t.name })) || [],
          })
        }

        if (!managerBranch) {
          console.log("🔄 Trying localStorage fallback...")
          const branchesData = localStorage.getItem("smart-scheduler-branches")
          if (branchesData) {
            const localStorageBranches = JSON.parse(branchesData)
            console.log(
              "🏢 Fallback branches from localStorage:",
              localStorageBranches.map((b: any) => ({ id: b.id, ownerId: b.ownerId, name: b.name })),
            )

            const fallbackBranch = localStorageBranches.find((branch: any) => branch.ownerId === manager.id)
            if (fallbackBranch) {
              branchSettings = fallbackBranch.settings
              console.log("⚙️ Fallback branch settings loaded:", {
                hasShiftTemplates: !!branchSettings?.shiftTemplates,
                shiftTemplatesCount: branchSettings?.shiftTemplates?.length || 0,
                templates: branchSettings?.shiftTemplates?.map((t: any) => ({ id: t.id, name: t.name })) || [],
              })
            }
          }
        }
      } catch (error) {
        console.error("❌ Error loading branch settings:", error)
      }

      // Get worker's availability submissions
      const workerAvailability = (await localDB.safeGet(`worker-availability-${workerId}`)) || []
      console.log("📝 Worker availability submissions found:", workerAvailability.length)

      const result = {
        manager,
        schedules,
        branchSettings,
        workerAvailability,
      }

      console.log("✅ Final manager data result:", {
        hasManager: !!result.manager,
        schedulesCount: result.schedules.length,
        hasBranchSettings: !!result.branchSettings,
        shiftTemplatesCount: result.branchSettings?.shiftTemplates?.length || 0,
        availabilityCount: result.workerAvailability.length,
      })

      return result
    } catch (error) {
      console.error("❌ Error getting manager data:", error)
      return null
    }
  }

  const submitWorkerAvailability = async (
    workerId: string,
    submissionData: { weekStartDate: string; availability: any },
  ) => {
    try {
      console.log("🚀 Starting availability submission process...")
      console.log("📋 Input data:", { workerId, submissionData })

      // Validate input parameters
      if (!workerId) {
        console.error("❌ Missing workerId")
        throw new Error("Worker ID is required")
      }

      if (!submissionData) {
        console.error("❌ Missing submission data")
        throw new Error("Submission data is required")
      }

      const { weekStartDate, availability } = submissionData

      if (!weekStartDate) {
        console.error("❌ Missing week start date")
        throw new Error("Week start date is required")
      }

      if (!availability || typeof availability !== "object") {
        console.error("❌ Invalid availability data:", availability)
        throw new Error("Invalid availability data")
      }

      console.log("✅ Input validation passed")

      // Find worker in users array first
      const users = (await localDB.safeGet("users")) || []
      console.log("📋 Total users in database:", users.length)

      let worker = users.find((u: User) => u.id === workerId)
      console.log(
        "👤 Worker found in users:",
        worker ? { id: worker.id, name: worker.name, managerId: worker.managerId } : "NOT FOUND",
      )

      // If not found in users, check workers array
      if (!worker) {
        console.log("🔍 Checking workers array...")
        const workers = (await localDB.safeGet("workers")) || []
        console.log("📋 Total workers in database:", workers.length)

        const workerRecord = workers.find((w: Worker) => w.id === workerId)
        console.log(
          "👤 Worker found in workers:",
          workerRecord ? { id: workerRecord.id, name: workerRecord.name } : "NOT FOUND",
        )

        if (workerRecord) {
          // Find the manager for this worker
          const manager = users.find((u: User) => u.role === "user" && u.id === workerRecord.managerId)
          if (manager) {
            worker = {
              id: workerRecord.id,
              name: workerRecord.name,
              email: workerRecord.email || `${workerRecord.name.toLowerCase().replace(/\s+/g, ".")}@worker.com`,
              managerId: manager.id,
              role: "worker",
            } as User
            console.log("✅ Created worker user object from worker record")
          }
        }
      }

      if (!worker) {
        console.error("❌ Worker not found in any storage:", workerId)
        throw new Error("Worker not found")
      }

      if (!worker.managerId) {
        console.error("❌ Worker not linked to manager:", { workerId, worker })
        throw new Error("Worker not linked to manager")
      }

      console.log("✅ Worker validation passed:", { workerId: worker.id, managerId: worker.managerId })

      // Generate submission ID with fallback
      let submissionId: string
      try {
        submissionId = crypto.randomUUID()
        console.log("✅ Generated UUID using crypto.randomUUID()")
      } catch (error) {
        // Fallback for browsers that don't support crypto.randomUUID()
        submissionId = "submission-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9)
        console.log("✅ Generated fallback UUID:", submissionId)
      }

      const newSubmission = {
        id: submissionId,
        workerId: worker.id,
        managerId: worker.managerId,
        weekStartDate,
        availability,
        submittedAt: new Date().toISOString(),
        status: "pending",
        workerName: worker.name,
      }

      console.log("📝 Created submission object:", newSubmission)

      // Save to worker-specific availability storage
      console.log("💾 Saving to worker-specific storage...")
      const workerAvailabilityKey = `worker-availability-${workerId}`
      const existingSubmissions = (await localDB.safeGet(workerAvailabilityKey)) || []
      console.log("📋 Existing submissions for worker:", existingSubmissions.length)

      // Remove any existing submission for the same week
      const filteredSubmissions = existingSubmissions.filter((s: any) => s.weekStartDate !== weekStartDate)
      console.log("📋 After filtering same week:", filteredSubmissions.length)

      filteredSubmissions.push(newSubmission)
      await localDB.safeSet(workerAvailabilityKey, filteredSubmissions)
      console.log("✅ Saved to worker-specific storage")

      // Also save to global availability submissions for manager access
      console.log("💾 Saving to global availability submissions...")
      const allSubmissions = (await localDB.safeGet("availabilitySubmissions")) || []
      console.log("📋 Existing global submissions:", allSubmissions.length)

      const filteredGlobalSubmissions = allSubmissions.filter(
        (s: any) => !(s.workerId === workerId && s.weekStartDate.substring(0, 10) === weekStartDate),
      )
      console.log("📋 After filtering global submissions:", filteredGlobalSubmissions.length)

      filteredGlobalSubmissions.push(newSubmission)
      await localDB.safeSet("availabilitySubmissions", filteredGlobalSubmissions)
      console.log("✅ Saved to global availability submissions")

      // Update the global workers array with the new submission
      console.log("💾 Updating global workers array...")
      const allWorkers = (await localDB.safeGet("workers")) || []
      console.log("📋 Total workers in global array:", allWorkers.length)

      const updatedWorkers = allWorkers.map((w: Worker) => {
        if (w.id === workerId) {
          const existingSubmissions = w.availabilitySubmissions || []
          const filteredExisting = existingSubmissions.filter((s: any) => s.weekStartDate !== weekStartDate)
          console.log("📋 Updated worker submissions:", filteredExisting.length + 1)
          return {
            ...w,
            availabilitySubmissions: [...filteredExisting, newSubmission],
          }
        }
        return w
      })

      await localDB.safeSet("workers", updatedWorkers)
      console.log("✅ Updated global workers array")

      console.log("🎉 Worker availability submitted successfully:", submissionId)
      return true
    } catch (error) {
      console.error("❌ Error submitting worker availability:", error)
      console.error("❌ Error details:", {
        message: error.message,
        stack: error.stack,
        workerId,
        submissionData,
      })
      return false
    }
  }

  // Get pending availability submissions for managers
  const getPendingAvailability = async (managerId: string) => {
    try {
      return (await localDB.safeGet(`pending-availability-${managerId}`)) || []
    } catch (error) {
      console.error("Error getting pending availability:", error)
      return []
    }
  }

  // Approve/reject worker availability
  const processWorkerAvailability = async (
    managerId: string,
    submissionId: string,
    status: "approved" | "rejected",
  ) => {
    try {
      const pendingAvailability = await getPendingAvailability(managerId)
      const updatedAvailability = pendingAvailability.map((submission: any) =>
        submission.submittedAt === submissionId
          ? { ...submission, status, processedAt: new Date().toISOString() }
          : submission,
      )

      await localDB.safeSet(`pending-availability-${managerId}`, updatedAvailability)
      return true
    } catch (error) {
      console.error("Error processing worker availability:", error)
      return false
    }
  }

  const batchUpdateWorkers = async (updates: { workerId: string; updates: Partial<Worker> }[]): Promise<boolean> => {
    try {
      const allWorkers = (await localDB.safeGet("workers")) || []

      const updatedWorkers = allWorkers.map((worker: Worker) => {
        const update = updates.find((u) => u.workerId === worker.id)
        return update ? { ...worker, ...update.updates } : worker
      })

      await localDB.safeSet("workers", updatedWorkers)
      console.log(`Batch updated ${updates.length} workers`)
      return true
    } catch (error) {
      console.error("Error in batch update:", error)
      return false
    }
  }

  const validateDataIntegrity = async (): Promise<{ isValid: boolean; errors: string[] }> => {
    const errors: string[] = []

    try {
      // Check users
      const users = (await localDB.safeGet("users")) || []
      users.forEach((user: User, index: number) => {
        if (!user.id || !user.email || !user.name) {
          errors.push(`User at index ${index} is missing required fields`)
        }
      })

      // Check workers
      const workers = (await localDB.safeGet("workers")) || []
      workers.forEach((worker: Worker, index: number) => {
        if (!worker.id || !worker.name || !worker.branchId) {
          errors.push(`Worker at index ${index} is missing required fields`)
        }
      })

      // Check schedules
      const schedules = (await localDB.safeGet("schedules")) || []
      schedules.forEach((schedule: Schedule, index: number) => {
        if (!schedule.id || !schedule.branchId || !schedule.weekStartDate) {
          errors.push(`Schedule at index ${index} is missing required fields`)
        }
      })

      return {
        isValid: errors.length === 0,
        errors,
      }
    } catch (error) {
      return {
        isValid: false,
        errors: [`Data validation failed: ${error.message}`],
      }
    }
  }

  const getWorkerAvailability = async (workerId: string, weekStartDate: string) => {
    try {
      console.log("🔍 Getting worker availability:", { workerId, weekStartDate })

      // First try worker-specific storage
      const workerAvailabilityKey = `worker-availability-${workerId}`
      const workerSubmissions = (await localDB.safeGet(workerAvailabilityKey)) || []
      console.log("📋 Worker submissions found:", workerSubmissions.length)

      // Find submission for the specific week
      const weekSubmission = workerSubmissions.find((s: any) => s.weekStartDate.substring(0, 10) === weekStartDate)

      if (weekSubmission) {
        console.log("✅ Found worker availability for week:", weekSubmission.availability)
        return weekSubmission.availability
      }

      // Fallback: check global workers array
      const allWorkers = (await localDB.safeGet("workers")) || []
      const worker = allWorkers.find((w: any) => w.id === workerId)

      if (worker?.availabilitySubmissions) {
        const submission = worker.availabilitySubmissions.find((s: any) => s.weekStartDate.substring(0, 10) === weekStartDate)
        if (submission) {
          console.log("✅ Found worker availability in global array:", submission.availability)
          return submission.availability
        }
      }

      console.log("❌ No availability found for worker and week")
      return null
    } catch (error) {
      console.error("❌ Error getting worker availability:", error)
      return null
    }
  }

  return {
    getFranchiseUsers,
    getFranchiseWorkers,
    getFranchiseSchedules,
    getManagerData,
    submitWorkerAvailability,
    getWorkerAvailability,
    getPendingAvailability,
    processWorkerAvailability,
    batchUpdateWorkers,
    validateDataIntegrity,
  }
}
