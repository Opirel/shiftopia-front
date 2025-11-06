"use client"

import type { Franchise } from "@/types"
import { localDB } from "./local-db"
import { useAxois } from '@/lib/axois'
interface FranchiseManager {
  createFranchise: (name: string, createdBy: string) => Promise<Franchise>
  getFranchises: (createdBy?: string) => Promise<Franchise[]>
  getFranchiseByKey: (key: string) => Promise<Franchise | null>
  getFranchiseById: (id: string) => Promise<Franchise | null>
  updateFranchise: (id: string, updates: Partial<Franchise>) => Promise<boolean>
  deactivateFranchise: (franchiseId: string) => Promise<boolean>
  addBranchToFranchise: (franchiseKey: string, branchId: string) => Promise<boolean>
  removeBranchFromFranchise: (franchiseKey: string, branchId: string) => Promise<boolean>
  generateFranchiseKey: (franchiseName: string) => Promise<string>
  reactivateFranchise: (franchiseId: string) => Promise<boolean>
  getFranchiseBranches: (franchiseKey: string) => Promise<any[]>
  syncWithFranchise: (franchiseKey: string) => Promise<any[]>
}

export function useFranchise(): FranchiseManager {
  const { instance } = useAxois()
  const generateFranchiseKey = async (franchiseName: string): Promise<string> => {
    const existingKeys = await getAllExistingKeys()
    let attempts = 0
    let key: string

    do {
      const identifier = franchiseName
        .substring(0, 3)
        .toUpperCase()
        .replace(/[^A-Z]/g, "X")
      const timestamp = Date.now().toString(36).toUpperCase()
      const random = Math.random().toString(36).substring(2, 8).toUpperCase()
      key = `FR-${identifier}-${timestamp}-${random}`
      attempts++

      if (attempts > 100) {
        throw new Error("Unable to generate unique franchise key")
      }
    } while (existingKeys.includes(key))

    return key
  }

  const getAllExistingKeys = async (): Promise<string[]> => {
    try {
      const franchises = (await localDB.safeGet("franchises")) || []
      const workerKeys = (await localDB.safeGet("workerKeys")) || []

      const franchiseKeys = franchises.map((f: Franchise) => f.key)
      const workerKeyStrings = workerKeys.map((w: any) => w.key)

      return [...franchiseKeys, ...workerKeyStrings]
    } catch (error) {
      console.error("Error getting existing keys:", error)
      return []
    }
  }

  const createFranchise = async (name: string, createdBy: string): Promise<Franchise> => {
    try {
      const franchise: Franchise = {
        id: crypto.randomUUID(),
        name: name.trim(),
        key: await generateFranchiseKey(name),
        createdAt: new Date().toISOString(),
        createdBy:createdBy,
        isActive: true,
        branches: [],
      }

      await instance({}).post('/franchises',franchise);
      const franchises = (await localDB.safeGet("franchises")) || []
      franchises.push(franchise)
      await localDB.safeSet("franchises", franchises)

      console.log("Franchise created:", franchise.name, franchise.key)
      return franchise
    } catch (error) {
      console.error("Error creating franchise:", error)
      throw new Error("Failed to create franchise")
    }
  }

  const getFranchises = async (createdBy?: string): Promise<Franchise[]> => {
    try {
      const franchises = (await localDB.safeGet("franchises")) || []

      if (createdBy) {
        return franchises.filter((f: Franchise) => f.createdBy === createdBy)
      }

      return franchises
    } catch (error) {
      console.error("Error getting franchises:", error)
      return []
    }
  }

  const getFranchiseByKey = async (key: string): Promise<Franchise | null> => {
    try {
      const franchises = await getFranchises()
      return franchises.find((f: Franchise) => f.key === key && f.isActive) || null
    } catch (error) {
      console.error("Error getting franchise by key:", error)
      return null
    }
  }

  const getFranchiseById = async (id: string): Promise<Franchise | null> => {
    try {
      const franchises = await getFranchises()
      return franchises.find((f: Franchise) => f.id === id) || null
    } catch (error) {
      console.error("Error getting franchise by ID:", error)
      return null
    }
  }

  const updateFranchise = async (id: string, updates: Partial<Franchise>): Promise<boolean> => {
    try {
      const franchises = await getFranchises()
      const franchiseIndex = franchises.findIndex((f: Franchise) => f.id === id)

      if (franchiseIndex === -1) {
        return false
      }

      franchises[franchiseIndex] = { ...franchises[franchiseIndex], ...updates }
      await localDB.safeSet("franchises", franchises)

      console.log("Franchise updated:", id)
      return true
    } catch (error) {
      console.error("Error updating franchise:", error)
      return false
    }
  }

  const deactivateFranchise = async (franchiseId: string): Promise<boolean> => {
    try {
      console.log("Starting franchise deactivation:", franchiseId)

      // First deactivate the franchise
      const success = await updateFranchise(franchiseId, { isActive: false })
      if (!success) {
        console.error("Failed to deactivate franchise")
        return false
      }

      // Get the franchise to find its key
      const franchise = await getFranchiseById(franchiseId)
      if (!franchise) {
        console.error("Franchise not found after deactivation")
        return false
      }

      console.log("Cascading disable for franchise key:", franchise.key)

      // Cascade disable to all linked accounts
      await cascadeDisableAccounts(franchise.key)

      console.log("Franchise and linked accounts deactivated:", franchise.name)
      return true
    } catch (error) {
      console.error("Error deactivating franchise:", error)
      return false
    }
  }

  const cascadeDisableAccounts = async (franchiseKey: string): Promise<void> => {
    try {
      console.log("Loading users for cascade disable...")
      const users = (await localDB.safeGet("users")) || []
      console.log("Found users:", users.length)

      const updatedUsers = []
      let managersDisabled = 0
      let workersDisabled = 0

      // First pass: identify and disable managers with the franchise key
      const managersToDisable = []

      for (const user of users) {
        if (user.franchiseKey === franchiseKey && user.role === "user") {
          console.log("Found manager to disable:", user.email)
          managersToDisable.push(user.id)

          const disabledUser = {
            ...user,
            isDisabled: true,
            disabledReason: "Franchise key has been deactivated by administrator",
            disabledAt: new Date().toISOString(),
          }
          updatedUsers.push(disabledUser)
          managersDisabled++
        } else {
          updatedUsers.push(user)
        }
      }

      // Second pass: disable all workers under the disabled managers
      const finalUpdatedUsers = []

      for (const user of updatedUsers) {
        if (user.role === "worker" && user.managerId && managersToDisable.includes(user.managerId)) {
          console.log("Disabling worker under disabled manager:", user.email)

          const disabledWorker = {
            ...user,
            isDisabled: true,
            disabledReason: "Manager account has been deactivated",
            disabledAt: new Date().toISOString(),
          }
          finalUpdatedUsers.push(disabledWorker)
          workersDisabled++
        } else {
          finalUpdatedUsers.push(user)
        }
      }

      // Save all changes at once
      await localDB.safeSet("users", finalUpdatedUsers)
      console.log(`Cascade disable complete: ${managersDisabled} managers, ${workersDisabled} workers disabled`)
    } catch (error) {
      console.error("Error cascading disable:", error)
    }
  }

  const addBranchToFranchise = async (franchiseKey: string, branchId: string): Promise<boolean> => {
    try {
      const franchises = await getFranchises()
      const franchiseIndex = franchises.findIndex((f: Franchise) => f.key === franchiseKey && f.isActive)

      if (franchiseIndex === -1) {
        console.error("Franchise not found or inactive:", franchiseKey)
        return false
      }

      if (!franchises[franchiseIndex].branches.includes(branchId)) {
        franchises[franchiseIndex].branches.push(branchId)
        await localDB.safeSet("franchises", franchises)
        console.log("Branch added to franchise:", branchId, franchiseKey)
      }

      return true
    } catch (error) {
      console.error("Error adding branch to franchise:", error)
      return false
    }
  }

  const removeBranchFromFranchise = async (franchiseKey: string, branchId: string): Promise<boolean> => {
    try {
      const franchises = await getFranchises()
      const franchiseIndex = franchises.findIndex((f: Franchise) => f.key === franchiseKey)

      if (franchiseIndex === -1) {
        return false
      }

      franchises[franchiseIndex].branches = franchises[franchiseIndex].branches.filter((id) => id !== branchId)
      await localDB.safeSet("franchises", franchises)

      console.log("Branch removed from franchise:", branchId, franchiseKey)
      return true
    } catch (error) {
      console.error("Error removing branch from franchise:", error)
      return false
    }
  }

  const reactivateFranchise = async (franchiseId: string): Promise<boolean> => {
    try {
      console.log("Starting franchise reactivation:", franchiseId)

      // First reactivate the franchise
      const success = await updateFranchise(franchiseId, { isActive: true })
      if (!success) {
        console.error("Failed to reactivate franchise")
        return false
      }

      // Get the franchise to find its key
      const franchise = await getFranchiseById(franchiseId)
      if (!franchise) {
        console.error("Franchise not found after reactivation")
        return false
      }

      console.log("Cascading reactivate for franchise key:", franchise.key)

      // Cascade reactivate to all linked accounts
      await cascadeReactivateAccounts(franchise.key)

      await refreshCurrentUserSession()

      console.log("Franchise and linked accounts reactivated:", franchise.name)
      return true
    } catch (error) {
      console.error("Error reactivating franchise:", error)
      return false
    }
  }

  const cascadeReactivateAccounts = async (franchiseKey: string): Promise<void> => {
    try {
      console.log("Loading users for cascade reactivate...")
      const users = (await localDB.safeGet("users")) || []
      let managersReactivated = 0
      let workersReactivated = 0

      // First pass: identify and reactivate managers with the franchise key
      const managersToReactivate = []
      const updatedUsers = []

      for (const user of users) {
        if (user.franchiseKey === franchiseKey && user.role === "user" && user.isDisabled) {
          console.log("Reactivating manager:", user.email)
          managersToReactivate.push(user.id)

          const { isDisabled, disabledReason, disabledAt, ...reactivatedUser } = user
          updatedUsers.push(reactivatedUser)
          managersReactivated++
        } else {
          updatedUsers.push(user)
        }
      }

      // Second pass: reactivate all workers under the reactivated managers
      const finalUpdatedUsers = []

      for (const user of updatedUsers) {
        if (
          user.role === "worker" &&
          user.managerId &&
          managersToReactivate.includes(user.managerId) &&
          user.isDisabled
        ) {
          console.log("Reactivating worker under reactivated manager:", user.email)

          const { isDisabled, disabledReason, disabledAt, ...reactivatedWorker } = user
          finalUpdatedUsers.push(reactivatedWorker)
          workersReactivated++
        } else {
          finalUpdatedUsers.push(user)
        }
      }

      // Save all changes at once
      await localDB.safeSet("users", finalUpdatedUsers)
      console.log(
        `Cascade reactivate complete: ${managersReactivated} managers, ${workersReactivated} workers reactivated`,
      )
    } catch (error) {
      console.error("Error cascading reactivate:", error)
    }
  }

  const refreshCurrentUserSession = async (): Promise<void> => {
    try {
      // Check if there's a current user session
      const currentUser = await localDB.safeGet("currentUser")
      if (currentUser?.id) {
        console.log("Refreshing current user session after reactivation")

        // Import the auth hook dynamically to avoid circular dependency
        if (typeof window !== "undefined") {
          // Trigger a custom event that the auth provider can listen to
          window.dispatchEvent(new CustomEvent("refreshCurrentUser"))
        }
      }
    } catch (error) {
      console.error("Error refreshing current user session:", error)
    }
  }

  const getFranchiseBranches = async (franchiseKey: string): Promise<any[]> => {
    try {
      const branches = (await localDB.safeGet("branches")) || []
      return branches.filter((branch: any) => branch.franchiseKey === franchiseKey)
    } catch (error) {
      console.error("Error getting franchise branches:", error)
      return []
    }
  }

  const syncWithFranchise = async (franchiseKey: string): Promise<any[]> => {
    try {
      // Refresh branch data and return all branches with the specified franchise key
      const branches = await getFranchiseBranches(franchiseKey)
      console.log("Synced with franchise:", franchiseKey, "Found branches:", branches.length)
      return branches
    } catch (error) {
      console.error("Error syncing with franchise:", error)
      return []
    }
  }

  return {
    createFranchise,
    getFranchises,
    getFranchiseByKey,
    getFranchiseById,
    updateFranchise,
    deactivateFranchise,
    addBranchToFranchise,
    removeBranchFromFranchise,
    generateFranchiseKey,
    reactivateFranchise,
    getFranchiseBranches,
    syncWithFranchise,
  }
}
