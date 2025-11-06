"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import type { Branch, BranchSettings } from "@/types"
import { useAuth } from "./auth"
import { localDB } from "./local-db"
import { useAxois } from "./axois"

interface BranchContextType {
  currentBranch: Branch | null
  setCurrentBranch : (branch :Branch) => Promise<void>
  branches: Branch[]
  createBranch: (name: string, franchiseKey?: string) => Promise<Branch>
  updateBranchSettings: (branchId: string, settings: Partial<BranchSettings>) => Promise<boolean>
  deleteBranch: (branchId: string) => Promise<boolean>
  getBranchById: (branchId: string) => Branch | null
  refreshBranches: () => Promise<void>
  getFranchiseBranches: (franchiseKey: string) => Branch[]
  syncWithFranchise: (franchiseKey: string) => Promise<Branch[]>
  loading: boolean
  error: string | null
}

const BranchContext = createContext<BranchContextType | undefined>(undefined)

const createDefaultBranchSettings = (): BranchSettings => ({
  openingHours: {
    monday: { start: "09:00", end: "17:00", isOpen: true },
    tuesday: { start: "09:00", end: "17:00", isOpen: true },
    wednesday: { start: "09:00", end: "17:00", isOpen: true },
    thursday: { start: "09:00", end: "17:00", isOpen: true },
    friday: { start: "09:00", end: "17:00", isOpen: true },
    saturday: { start: "10:00", end: "16:00", isOpen: true },
    sunday: { start: "10:00", end: "16:00", isOpen: false },
  },
  weekStartDay: "monday",
  shiftTemplates: [
    {
      id: crypto.randomUUID(),
      name: "Morning Shift",
      startTime: "09:00",
      endTime: "13:00",
      requiredWorkers: 2,
      priority: 1,
      days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    },
    {
      id: crypto.randomUUID(),
      name: "Afternoon Shift",
      startTime: "13:00",
      endTime: "17:00",
      requiredWorkers: 2,
      priority: 1,
      days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    },
  ],
  ratingCriteria: ["Customer Service", "Technical Skills", "Teamwork", "Reliability", "Leadership"],
})

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const { user, isMasterAdmin } = useAuth()
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null)
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { instance } = useAxois()
  useEffect(() => {
    if (user && !isMasterAdmin()) {
      initializeBranches()
    } else {
      resetBranchState()
    }
  }, [user])

  const resetBranchState = () => {
    setCurrentBranch(null)
    setBranches([])
    setLoading(false)
    setError(null)
  }

  const initializeBranches = async () => {
    try {
      setLoading(true)
      setError(null)

      var currentBranchExists = await loadBranches()

      //todo asycurrentBranchExistsnc wasn't update maybe not needed
      // if (!currentBranchExists && user) {
      //   // Check if a branch already exists for this user to prevent duplicates
      //   const existingBranch = branches.find((branch) => branch.ownerId === user.id)
      //   if (!existingBranch) {
      //     await createBranch(user.branchName, user.franchiseKey)
      //   } else {
      //     setCurrentBranch(existingBranch)
      //   }
      //}
    } catch (err) {
      console.error("Error initializing branches:", err)
      setError("Failed to load branch data")
    } finally {
      setLoading(false)
    }
  }

  const loadBranches = async () => {
    try {
      //const allBranches = (await localDB.safeGet("branches")) || []
      var branch = (await instance({branchId:user?.branchId}).get("/branches")).data|| [];
      //todo to one object
      const allBranches = [branch]; 

      //todo migratedBranches looks like not needed and can be removed
      // send this branch.ownerId === user?.id || branch.ownerId === user?.managerId
      const migratedBranches = allBranches.map((branch: Branch) => {
        if (branch.settings?.shiftTemplates) {
          branch.settings.shiftTemplates = branch.settings.shiftTemplates.map((template) => {
            if (!template.days || template.days.length === 0) {
              return {
                ...template,
                days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
              }
            }
            return template
          })
        }
        return branch
      })

      // Save migrated branches back to storage
      if (JSON.stringify(allBranches) !== JSON.stringify(migratedBranches)) {
        await localDB.safeSet("branches", migratedBranches)
        console.log("Migrated shift templates to include days property")
      }

      setBranches(migratedBranches)

      // Find user's branch
      const userBranch = migratedBranches.find((branch: Branch) => branch.ownerId === user?.id || branch.ownerId === user?.managerId)
      if (userBranch) {
        setCurrentBranch(userBranch)
      }else{
          await createBranch(user.branchName, user.franchiseKey)
      }

      console.log("Branches loaded:", migratedBranches.length)
      return !!userBranch
    } catch (error) {
      console.error("Error loading branches:", error)
      await handleLoadingFallback()
    }
  }

  const handleLoadingFallback = async () => {
    try {
      const fallbackBranches = JSON.parse(localStorage.getItem("smart-scheduler-branches") || "[]")
      if (fallbackBranches.length > 0) {
        await localDB.safeSet("branches", fallbackBranches)
        setBranches(fallbackBranches)

        const userBranch = fallbackBranches.find((branch: Branch) => branch.ownerId === user?.id)
        if (userBranch) {
          setCurrentBranch(userBranch)
        }

        console.log("Fallback branches loaded:", fallbackBranches.length)
      }
    } catch (fallbackError) {
      console.error("Fallback loading failed:", fallbackError)
      setError("Failed to load branch data from fallback")
    }
  }

  const createBranch = async (name: string, franchiseId?: string): Promise<Branch> => {
    if (!user) {
      throw new Error("User must be authenticated to create a branch")
    }

    try {
      var allBranches = [];
      var id = user.managerId || user.id;
      const existingBranch = (await instance({ownerId : id}).get('/branches')).data || []

      //const existingBranch = allBranches.find((branch: Branch) => branch.ownerId === user.id)
      if (existingBranch.lenth > 0) {
        console.log("Branch already exists for user:", existingBranch.name)
        setCurrentBranch(existingBranch)
        return existingBranch
      }

      const newBranch: Branch = {
        id: crypto.randomUUID(),
        name: name.trim(),
        ownerId: user.id,
        franchiseId: franchiseId,
        settings: createDefaultBranchSettings(),
        createdAt: new Date().toISOString(),
      }

      await instance({}).post('/branches',newBranch);
      allBranches.push(newBranch)
      await localDB.safeSet("branches", allBranches)

      setBranches(allBranches)
      setCurrentBranch(newBranch)

      console.log("Branch created:", newBranch.name)
      return newBranch
    } catch (error) {
      console.error("Error creating branch:", error)
      throw new Error("Failed to create branch")
    }
  }

  const updateBranchSettings = async (branchId: string, settings: Partial<BranchSettings>): Promise<boolean> => {
    try {
      const oldBranch = await localDB.safeGet("branches");

      // Merge settings with existing ones
      oldBranch.settings = {
        ...oldBranch.settings,
        ...settings,
      }

      await instance({id:oldBranch.settings.id}).put('/settings',oldBranch.settings );
      await localDB.safeSet("branches", oldBranch)
      await localDB.safeSet("currentBranch", oldBranch)
      setCurrentBranch(oldBranch);
      console.log("Branch settings updated:", branchId)
      return true
    } catch (error) {
      console.error("Error updating branch settings:", error)
      return false
    }
  }

  const deleteBranch = async (branchId: string): Promise<boolean> => {
    try {
      const allBranches = (await localDB.safeGet("branches")) || []
      const filteredBranches = allBranches.filter((branch: Branch) => branch.id !== branchId)

      await localDB.safeSet("branches", filteredBranches)
      setBranches(filteredBranches)

      // Clear current branch if it was deleted
      if (currentBranch?.id === branchId) {
        setCurrentBranch(null)
      }

      console.log("Branch deleted:", branchId)
      return true
    } catch (error) {
      console.error("Error deleting branch:", error)
      return false
    }
  }

  const getBranchById = (branchId: string): Branch | null => {
    return branches.find((branch) => branch.id === branchId) || null
  }

  const refreshBranches = async () => {
    await loadBranches()
  }

  const getFranchiseBranches = (franchiseKey: string): Branch[] => {
    return branches.filter((branch) => branch.franchiseKey === franchiseKey)
  }

  const syncWithFranchise = async (franchiseKey: string): Promise<Branch[]> => {
    try {
      await refreshBranches()
      const franchiseBranches = branches.filter((branch) => branch.franchiseKey === franchiseKey)
      console.log(`Found ${franchiseBranches.length} branches with franchise key:`, franchiseKey)
      return franchiseBranches
    } catch (error) {
      console.error("Error syncing with franchise:", error)
      throw new Error("Failed to sync with franchise")
    }
  }

  return (
    <BranchContext.Provider
      value={{
        currentBranch,
        branches,
        createBranch,
        updateBranchSettings,
        deleteBranch,
        getBranchById,
        refreshBranches,
        getFranchiseBranches,
        syncWithFranchise,
        loading,
        error,
        setCurrentBranch,
      }}
    >
      {children}
    </BranchContext.Provider>
  )
}

export function useBranch() {
  const context = useContext(BranchContext)
  if (context === undefined) {
    throw new Error("useBranch must be used within a BranchProvider")
  }
  return context
}
