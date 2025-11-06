"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import type { User, Worker, WorkerAvailabilitySubmission } from "@/types"
import { useBranch } from "./branch"
import { useAuth } from "./auth"
import { localDB } from "./local-db"
import { useAxois } from "./axois"

interface WorkerKey {
  key: string
  managerId: string
  isActive: boolean
  createdAt: string
  usedBy?: string
  usedAt?: string
}

interface WorkerContextType {
  workers: Worker[]
  workerKeys: WorkerKey[]
  availabilitySubmissions: WorkerAvailabilitySubmission[]
  addWorker: (worker: Omit<Worker, "id" | "branchId" | "createdAt">) => Promise<Worker>
  updateWorker: (workerId: string, updates: Partial<Worker>) => Promise<boolean>
  deleteWorker: (workerId: string) => Promise<boolean>
  getWorkerById: (workerId: string) => Worker | undefined
  generateWorkerKey: () => Promise<string>
  getWorkerKeys: () => Promise<WorkerKey[]>
  deactivateWorkerKey: (key: string) => Promise<boolean>
  submitAvailability: (workerId: string, availability: any, weekStartDate: string) => Promise<boolean>
  getWorkerAvailability: (workerId: string, weekStartDate?: string) => WorkerAvailabilitySubmission | null
  requestShiftSwitch: (shiftId: string, targetWorkerId: string, reason?: string) => Promise<boolean>
  refreshWorkers: () => Promise<void>
  loading: boolean
  error: string | null
}

const WorkerContext = createContext<WorkerContextType | undefined>(undefined)

const createDefaultAvailability = () => ({
  monday: { start: "09:00", end: "17:00", available: false },
  tuesday: { start: "09:00", end: "17:00", available: false },
  wednesday: { start: "09:00", end: "17:00", available: false },
  thursday: { start: "09:00", end: "17:00", available: false },
  friday: { start: "09:00", end: "17:00", available: false },
  saturday: { start: "10:00", end: "16:00", available: false },
  sunday: { start: "10:00", end: "16:00", available: false },
})

const createDefaultRatings = (criteria: string[]) => {
  const ratings: { [key: string]: number } = {}
  criteria.forEach((criterion) => {
    ratings[criterion] = 0 // Start with 0 ratings - managers must rate workers
  })
  return ratings
}

export function WorkerProvider({ children }: { children: React.ReactNode }) {
  const { currentBranch } = useBranch()
  const { user } = useAuth()
  const { instance } = useAxois()
  const [workers, setWorkers] = useState<Worker[]>([])
  const [workerKeys, setWorkerKeys] = useState<WorkerKey[]>([])
  const [availabilitySubmissions, setAvailabilitySubmissions] = useState<WorkerAvailabilitySubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (currentBranch && user) {
      initializeWorkerData()
    } else {
      resetWorkerState()
    }
  }, [currentBranch, user])

  const resetWorkerState = () => {
    setWorkers([])
    setWorkerKeys([])
    setAvailabilitySubmissions([])
    setLoading(false)
    setError(null)
  }

  const initializeWorkerData = async () => {
    try {
      setLoading(true)
      setError(null)

      await Promise.all([loadWorkers(), loadWorkerKeys(), loadAvailabilitySubmissions()])
    } catch (err) {
      console.error("Error initializing worker data:", err)
      setError("Failed to load worker data")
    } finally {
      setLoading(false)
    }
  }

  const loadWorkers = async () => {
    try {
      const branchWorkers = (await instance({branchId : currentBranch?.id}).get("/user")).data || []
      // console.log("All workers in database:", allWorkers.length)
      // console.log("Current branch ID:", currentBranch?.id)
      // console.log("Current user ID:", user?.id)

      // const branchWorkers = allWorkers.filter((worker: Worker) => {
      //   const matchesBranch = worker.branchId === currentBranch?.id
      //   const matchesManager = worker.managerId === user?.id || worker.branchId === currentBranch?.id
      //   console.log(
      //     `Worker ${worker.name}: branchId=${worker.branchId}, managerId=${worker.managerId}, matches=${matchesBranch || matchesManager}`,
      //   )
      //   return matchesBranch || matchesManager
      // })

      setWorkers(branchWorkers)
      console.log("Workers loaded for manager:", branchWorkers.length)
      console.log(
        "Worker details:",
        branchWorkers.map((w) => ({ name: w.name, branchId: w.branchId, managerId: w.managerId })),
      )
    } catch (error) {
      console.error("Error loading workers:", error)
      await handleWorkerLoadingFallback()
    }
  }

  const handleWorkerLoadingFallback = async () => {
    try {
      const fallbackWorkers = JSON.parse(localStorage.getItem("smart-scheduler-workers") || "[]")
      if (fallbackWorkers.length > 0) {
        await localDB.safeSet("workers", fallbackWorkers)
        const branchWorkers = fallbackWorkers.filter((worker: Worker) => worker.branchId === currentBranch?.id)
        setWorkers(branchWorkers)
        console.log("Fallback workers loaded:", branchWorkers.length)
      }
    } catch (fallbackError) {
      console.error("Worker fallback loading failed:", fallbackError)
    }
  }

  const loadWorkerKeys = async () => {
    try {
      const allKeys = (await localDB.safeGet("workerKeys")) || []
      const managerKeys = allKeys.filter((key: WorkerKey) => key.managerId === user?.id)
      setWorkerKeys(managerKeys)
      console.log("Worker keys loaded:", managerKeys.length)
    } catch (error) {
      console.error("Error loading worker keys:", error)
    }
  }

  const loadAvailabilitySubmissions = async () => {
    try {
      const branchSubmissions = (await instance({managerId : user?.id}).get("/availabilitySubmissions")).data; 
      //todo delete if works
      //const allSubmissions2 = (await localDB.safeGet("availabilitySubmissions")) || []
      // const branchSubmissions = allSubmissions.filter(
      //   (submission: WorkerAvailabilitySubmission) => submission.managerId === user?.id,
      // )
      setAvailabilitySubmissions(branchSubmissions)
      console.log("Availability submissions loaded:", branchSubmissions.length)
    } catch (error) {
      console.error("Error loading availability submissions:", error)
    }
  }

  const addWorker = async (workerData: Omit<Worker, "id" | "branchId" | "createdAt">): Promise<Worker> => {
    if (!currentBranch) {
      throw new Error("No branch selected")
    }

    try {
      const newWorker: Worker = {
        id: crypto.randomUUID(),
        branchId: currentBranch.id,
        name: workerData.name.trim(),
        email: workerData.email.trim().toLowerCase(),
        role: workerData.role || "Staff",
        ratings: createDefaultRatings(currentBranch.settings.ratingCriteria),
        availability: createDefaultAvailability(),
        createdAt: new Date().toISOString(),
        managerId: user?.id || "", // Assuming managerId is required for better association
      }

      const allWorkers = (await localDB.safeGet("workers")) || []
      allWorkers.push(newWorker)
      await localDB.safeSet("workers", allWorkers)

      setWorkers((prev) => [...prev, newWorker])
      console.log("Worker added:", newWorker.name)
      return newWorker
    } catch (error) {
      console.error("Error adding worker:", error)
      throw new Error("Failed to add worker")
    }
  }

  const updateWorker = async (workerId: string, updates: Partial<Worker>): Promise<boolean> => {
    try {
      const allWorkers = (await localDB.safeGet("workers")) || []
      const workerIndex = allWorkers.findIndex((worker: Worker) => worker.id === workerId)

      if (workerIndex === -1) {
        console.error("Worker not found:", workerId)
        return false
      }

      allWorkers[workerIndex] = { ...allWorkers[workerIndex], ...updates }
      await localDB.safeSet("workers", allWorkers)

      setWorkers((prev) => prev.map((worker) => (worker.id === workerId ? { ...worker, ...updates } : worker)))

      console.log("Worker updated:", workerId)
      return true
    } catch (error) {
      console.error("Error updating worker:", error)
      return false
    }
  }

  const deleteWorker = async (workerId: string): Promise<boolean> => {
    try {
      const allWorkers = (await localDB.safeGet("workers")) || []
      const filteredWorkers = allWorkers.filter((worker: Worker) => worker.id !== workerId)
      await localDB.safeSet("workers", filteredWorkers)

      setWorkers((prev) => prev.filter((worker) => worker.id !== workerId))
      console.log("Worker deleted:", workerId)
      return true
    } catch (error) {
      console.error("Error deleting worker:", error)
      return false
    }
  }

  const getWorkerById = (workerId: string): Worker | undefined => {
    return workers.find((worker) => worker.id === workerId)
  }

  const generateWorkerKey = async (): Promise<string> => {
    if (!user) {
      throw new Error("User must be authenticated")
    }

    try {
      const key = `WK-${crypto.randomUUID().substring(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`

      const newKey: WorkerKey = {
        key,
        managerId: user.id,
        isActive: true,
        createdAt: new Date().toISOString(),
      }

      const allKeys = (await localDB.safeGet("workerKeys")) || []
      allKeys.push(newKey)
      await localDB.safeSet("workerKeys", allKeys)

      setWorkerKeys((prev) => [...prev, newKey])
      console.log("Worker key generated:", key)
      return key
    } catch (error) {
      console.error("Error generating worker key:", error)
      throw new Error("Failed to generate worker key")
    }
  }

  const getWorkerKeys = async (): Promise<WorkerKey[]> => {
    await loadWorkerKeys()
    return workerKeys
  }

  const deactivateWorkerKey = async (key: string): Promise<boolean> => {
    try {
      const allKeys = (await localDB.safeGet("workerKeys")) || []
      const keyIndex = allKeys.findIndex((k: WorkerKey) => k.key === key)

      if (keyIndex === -1) {
        return false
      }

      allKeys[keyIndex].isActive = false
      await localDB.safeSet("workerKeys", allKeys)

      setWorkerKeys((prev) => prev.map((k) => (k.key === key ? { ...k, isActive: false } : k)))

      console.log("Worker key deactivated:", key)
      return true
    } catch (error) {
      console.error("Error deactivating worker key:", error)
      return false
    }
  }

  const submitAvailability = async (user: User, availability: any, weekStartDate: string): Promise<boolean> => {
    if (!user) {
      return false
    }

    try {
      const workerId =user.id;


      const submission: WorkerAvailabilitySubmission = {
        id: crypto.randomUUID(),
        workerId:user.id,
        managerId: user.managerId,
        weekStartDate,
        availability,
        submittedAt: new Date().toISOString(),
        status: "pending",
      }
      await instance({}).post('/availabilitySubmissions',submission);
      const allSubmissions = (await localDB.safeGet("availabilitySubmissions")) || []

      const filteredSubmissions = allSubmissions.filter(
        (s: WorkerAvailabilitySubmission) => !(s.workerId === workerId && s.weekStartDate.substring(0, 10) === weekStartDate),
      )

      filteredSubmissions.push(submission)
      await localDB.safeSet("availabilitySubmissions", filteredSubmissions)

      const allWorkers = (await localDB.safeGet("users")) || []
      const workerIndex = allWorkers.findIndex((w: Worker) => w.id === workerId)

      if (workerIndex !== -1) {
        if (!allWorkers[workerIndex].availabilitySubmissions) {
          allWorkers[workerIndex].availabilitySubmissions = []
        }

        allWorkers[workerIndex].availabilitySubmissions = allWorkers[workerIndex].availabilitySubmissions.filter(
          (s: WorkerAvailabilitySubmission) => s.weekStartDate !== weekStartDate,
        )

        allWorkers[workerIndex].availabilitySubmissions.push(submission)
        await localDB.safeSet("workers", allWorkers)
      }

      setAvailabilitySubmissions((prev) => [
        ...prev.filter((s) => !(s.workerId === workerId && s.weekStartDate.substring(0, 10) === weekStartDate)),
        submission,
      ])

      console.log("Availability submitted with correct managerId:", {
        workerId,
        managerId: user.managerId,
        weekStartDate,
      })
      return true
    } catch (error) {
      console.error("Error submitting availability:", error)
      return false
    }
  }

  const getWorkerAvailability = (workerId: string, weekStartDate?: string): WorkerAvailabilitySubmission | null => {
    if (!weekStartDate) {
      const workerSubmissions = availabilitySubmissions
        .filter((s) => s.workerId === workerId)
        .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())

      return workerSubmissions[0] || null
    }

    return availabilitySubmissions.find((s) => s.workerId === workerId && s.weekStartDate.substring(0, 10) === weekStartDate) || null
  }

  const requestShiftSwitch = async (shiftId: string, targetWorkerId: string, reason?: string): Promise<boolean> => {
    if (!user) {
      console.error("User must be authenticated to request shift switch")
      return false
    }

    try {
      const shiftSwitchRequest = {
        id: crypto.randomUUID(),
        requesterId: user.id,
        requesterName: user.name,
        shiftId,
        targetWorkerId,
        reason: reason || "",
        status: "pending",
        createdAt: new Date().toISOString(),
        managerId: user.managerId || "", // Manager who needs to approve
      }

      const allRequests = (await localDB.safeGet("shiftSwitchRequests")) || []
      allRequests.push(shiftSwitchRequest)
      await localDB.safeSet("shiftSwitchRequests", allRequests)

      console.log("Shift switch request created:", shiftSwitchRequest)
      return true
    } catch (error) {
      console.error("Error requesting shift switch:", error)
      return false
    }
  }

  const refreshWorkers = async () => {
    await initializeWorkerData()
  }

  return (
    <WorkerContext.Provider
      value={{
        workers,
        workerKeys,
        availabilitySubmissions,
        addWorker,
        updateWorker,
        deleteWorker,
        getWorkerById,
        generateWorkerKey,
        getWorkerKeys,
        deactivateWorkerKey,
        submitAvailability,
        getWorkerAvailability,
        requestShiftSwitch,
        refreshWorkers,
        loading,
        error,
      }}
    >
      {children}
    </WorkerContext.Provider>
  )
}

export function useWorkers() {
  const context = useContext(WorkerContext)
  if (context === undefined) {
    throw new Error("useWorkers must be used within a WorkerProvider")
  }
  return context
}
