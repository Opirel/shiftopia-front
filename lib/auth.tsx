"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import type { User, AuthState } from "@/types"
import { localDB } from "./local-db"
import { useAxois } from "./axois"

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<boolean>
  signup: (email: string, password: string, name: string, branchName: string, franchiseKey?: string) => Promise<boolean>
  signupWorker: (email: string, password: string, name: string, workerKey: string) => Promise<boolean>
  logout: () => void
  isMasterAdmin: () => boolean
  isManager: () => boolean
  isWorker: () => boolean
  generateWorkerKey: () => Promise<string>
  changeUserRole: (user: User) => Promise<void>
  quickSwitchToAccount: (email: string) => Promise<boolean>
  quickSwitchToTestAccount: (accountType: "admin" | "manager" | "worker") => Promise<boolean>
  refreshCurrentUser: () => Promise<void>
  loginError: string
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const SYSTEM_USERS = {
  MASTER_ADMIN: {
    id: "master-admin-001",
    email: "admin2391@gmail.com",
    password: "admin2391",
    name: "Master Administrator",
    branchName: "System Administration",
    role: "master_admin" as const,
    createdAt: new Date().toISOString(),
  },
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
  })
  const [loginError, setLoginError] = useState("")
  const [isInitialized, setIsInitialized] = useState(false)
  const { instance } = useAxois()
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await localDB.init()

        // Ensure master admin exists
        await ensureMasterAdminExists()

        // Restore user session if exists
        await restoreUserSession()
      } catch (error) {
        console.error("Auth initialization error:", error)
        // Fallback to localStorage if local database fails
        await fallbackInitialization()
      } finally {
        setIsInitialized(true)
      }
    }

    initializeAuth()
  }, [])

  const ensureMasterAdminExists = async () => {
    const users = (await localDB.safeGet("users")) || []
    const masterAdminExists = users.find((u: any) => u.email === SYSTEM_USERS.MASTER_ADMIN.email)

    if (!masterAdminExists) {
      users.push(SYSTEM_USERS.MASTER_ADMIN)
      await localDB.safeSet("users", users)
      console.log("Master admin created")
    } else {
      // Update master admin with latest data
      const adminIndex = users.findIndex((u: any) => u.email === SYSTEM_USERS.MASTER_ADMIN.email)
      if (adminIndex !== -1) {
        users[adminIndex] = { ...users[adminIndex], ...SYSTEM_USERS.MASTER_ADMIN }
        await localDB.safeSet("users", users)
      }
    }
  }

  const restoreUserSession = async () => {
    const savedUser = await localDB.safeGet("currentUser")
    if (savedUser?.id && savedUser?.email && savedUser?.role) {
      //todo do right
      const users = (await instance({}).get("/user")).data|| []
      const userExists = users.find((u: User) => u.id === savedUser.id)

      if (userExists) {
        //todo userExists back to savedUser
        setAuthState({ user: userExists, isAuthenticated: true })
        console.log("User session restored:", savedUser.email)
      } else {
        await localDB.remove("currentUser")
        console.log("Invalid session removed")
      }
    }
  }

  const fallbackInitialization = async () => {
    try {
      const savedUser = JSON.parse(localStorage.getItem("smart-scheduler-currentUser") || "null")
      if (savedUser?.id) {
        setAuthState({ user: savedUser, isAuthenticated: true })
        console.log("Fallback session restored")
      }
    } catch (error) {
      console.error("Fallback initialization failed:", error)
    }
  }

  const refreshCurrentUser = async (): Promise<void> => {
    try {
      if (!authState.user?.id) {
        console.log("No current user to refresh")
        return
      }

      console.log("Refreshing current user data:", authState.user.email)

      // Check if it's master admin
      if (authState.user.email === SYSTEM_USERS.MASTER_ADMIN.email) {
        const { password: _, ...userWithoutPassword } = SYSTEM_USERS.MASTER_ADMIN
        await setUserSession(userWithoutPassword)
        console.log("Master admin session refreshed")
        return
      }

      // Get fresh user data from database
      const users = (await localDB.safeGet("users")) || []
      const freshUser = users.find((u: any) => u.id === authState.user?.id)

      if (freshUser) {
        const { password: _, ...userWithoutPassword } = freshUser
        await setUserSession(userWithoutPassword)

        // Clear any existing error messages if user is no longer disabled
        if (!freshUser.isDisabled && loginError) {
          setLoginError("")
        }
      } else {
        console.log("User no longer exists, logging out")
        logout()
      }
    } catch (error) {
      console.error("Error refreshing current user:", error)
    }
  }

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoginError("")
      console.log("Login attempt for:", email)

      // Check master admin first
      if (email === SYSTEM_USERS.MASTER_ADMIN.email && password === SYSTEM_USERS.MASTER_ADMIN.password) {
        const { password: _, ...userWithoutPassword } = SYSTEM_USERS.MASTER_ADMIN
        await setUserSession(userWithoutPassword)
        return true
      }

      // Check regular users
      const users = (await localDB.safeGet("users")) || []
      const user = users.find((u: any) => u.email === email && u.password === password)

      if (user) {
        const { password: _, ...userWithoutPassword } = user
        await setUserSession(userWithoutPassword)

        // Set a warning message for disabled accounts but still allow login
        if (user.isDisabled) {
          setLoginError(`Account disabled: ${user.disabledReason || "Contact administrator for assistance"}`)
        }

        return true
      }

      setLoginError("Invalid email or password")
      return false
    } catch (error) {
      console.error("Login error:", error)
      setLoginError("Login failed. Please try again.")
      return false
    }
  }

  const setUserSession = async (user: User) => {
    setAuthState({ user, isAuthenticated: true })
    await localDB.safeSet("currentUser", user)
    console.log("User session set:", user.email)
  }


  const signup = async (
    email: string,
    password: string,
    name: string,
    branchName: string,
    franchiseKey?: string,
  ): Promise<boolean> => {
    try {
      setLoginError("")

      const users = (await localDB.safeGet("users")) || []

      // Check if email already exists
      if (users.find((u: User) => u.email === email)) {
        setLoginError("Email already exists")
        return false
      }

      // Validate franchise key if provided
      if (franchiseKey) {
        const franchises = (await localDB.safeGet("franchises")) || []
        const validFranchise = franchises.find((f: any) => f.key === franchiseKey && f.isActive)

        if (!validFranchise) {
          setLoginError("Invalid franchise key")
          return false
        }
      }

      // Create new user
      const newUser: User & { password: string } = {
        id: crypto.randomUUID(),
        email,
        password,
        name,
        branchName,
        franchiseKey,
        role: "user",
        createdAt: new Date().toISOString(),
      }

      users.push(newUser)
      await localDB.safeSet("users", users)

      // Link to franchise if key provided
      if (franchiseKey) {
        await linkUserToFranchise(newUser.id, franchiseKey)
      }

      const { password: _, ...userWithoutPassword } = newUser
      await setUserSession(userWithoutPassword)

      return true
    } catch (error) {
      console.error("Signup error:", error)
      setLoginError("Signup failed. Please try again.")
      return false
    }
  }

  const linkUserToFranchise = async (userId: string, franchiseKey: string) => {
    try {
      const franchises = (await localDB.safeGet("franchises")) || []
      const franchiseIndex = franchises.findIndex((f: any) => f.key === franchiseKey)

      if (franchiseIndex !== -1) {
        if (!franchises[franchiseIndex].branches) {
          franchises[franchiseIndex].branches = []
        }
        franchises[franchiseIndex].branches.push(userId)
        await localDB.safeSet("franchises", franchises)
        console.log("User linked to franchise:", franchiseKey)
      }
    } catch (error) {
      console.error("Error linking to franchise:", error)
    }
  }

  const signupWorker = async (email: string, password: string, name: string, workerKey: string): Promise<boolean> => {
    try {
      setLoginError("")

      const users = (await localDB.safeGet("users")) || []
      const workerKeys = (await localDB.safeGet("workerKeys")) || []

      // Check if email already exists
      if (users.find((u: User) => u.email === email)) {
        setLoginError("Email already exists")
        return false
      }

      // Validate worker key
      const validKey = workerKeys.find((keyData: any) => keyData.key === workerKey && keyData.isActive === true)

      if (!validKey) {
        setLoginError("Invalid or expired worker key")
        return false
      }

      // Find manager
      const manager = users.find((u: User) => u.id === validKey.managerId)
      if (!manager) {
        setLoginError("Manager account not found")
        return false
      }

 // Find manager's branch
      const branch = (await localDB.safeGet("branches"));


      // Create worker user
      const newWorker: User & { password: string } = {
        id: crypto.randomUUID(),
        email,
        password,
        name,
        branchId: branch?.id,
        role: "worker",
        managerId: manager.id,
        createdAt: new Date().toISOString(),
      }

      await instance({}).post('/user',newWorker);
      users.push(newWorker)
      await localDB.safeSet("users", users)

      // Create worker profile
      await createWorkerProfile(newWorker, branch.id)

      // Deactivate worker key
      await deactivateWorkerKey(workerKey, newWorker.id)

      const { password: _, ...workerWithoutPassword } = newWorker
      await setUserSession(workerWithoutPassword)

      return true
    } catch (error) {
      console.error("Worker signup error:", error)
      setLoginError("Worker signup failed. Please try again.")
      return false
    }
  }

  const createWorkerProfile = async (worker: User, branchId: string) => {
    const workers = (await localDB.safeGet("workers")) || []

    const newWorkerProfile = {
      id: worker.id,
      name: worker.name,
      email: worker.email,
      role: "Staff",
      branchId,
      managerId: worker.managerId,
      ratings: {
        "Customer Service": 0,
        "Technical Skills": 0,
        Teamwork: 0,
        Reliability: 0,
        Leadership: 0,
      },
      availability: {
        monday: { start: "09:00", end: "17:00", available: false },
        tuesday: { start: "09:00", end: "17:00", available: false },
        wednesday: { start: "09:00", end: "17:00", available: false },
        thursday: { start: "09:00", end: "17:00", available: false },
        friday: { start: "09:00", end: "17:00", available: false },
        saturday: { start: "09:00", end: "17:00", available: false },
        sunday: { start: "09:00", end: "17:00", available: false },
      },
      createdAt: new Date().toISOString(),
    }

    workers.push(newWorkerProfile)
    await localDB.safeSet("workers", workers)
    console.log("Worker profile created:", worker.name, "with managerId:", worker.managerId, "and branchId:", branchId)

    const users = (await localDB.safeGet("users")) || []
    const userIndex = users.findIndex((u: any) => u.id === worker.id)
    if (userIndex !== -1) {
      users[userIndex] = { ...users[userIndex], branchId }
      await localDB.safeSet("users", users)
      console.log("User record updated with branchId:", branchId)
    }
  }

  const deactivateWorkerKey = async (workerKey: string, workerId: string) => {
    const workerKeys = (await localDB.safeGet("workerKeys")) || []
    const updatedKeys = workerKeys.map((keyData: any) =>
      keyData.key === workerKey
        ? { ...keyData, isActive: false, usedBy: workerId, usedAt: new Date().toISOString() }
        : keyData,
    )
    await localDB.safeSet("workerKeys", updatedKeys)
  }

  const logout = () => {
    setAuthState({ user: null, isAuthenticated: false })
    localDB.remove("currentUser").catch(console.error)
    setLoginError("")
  }

  const isMasterAdmin = () => authState.user?.role === "master_admin"
  const isManager = () => authState.user?.role === "user"
  const isWorker = () => authState.user?.role === "worker"

  const generateWorkerKey = async (): Promise<string> => {
    const key = `WK-${crypto.randomUUID().substring(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`

    const workerKeys = (await localDB.safeGet("workerKeys")) || []
    const newKey = {
      key,
      managerId: authState.user?.id || "",
      isActive: true,
      createdAt: new Date().toISOString(),
    }

    workerKeys.push(newKey)
    await localDB.safeSet("workerKeys", workerKeys)

    return key
  }

  const quickSwitchToAccount = async (email: string): Promise<boolean> => {
    try {
      // Check master admin first
      if (email === SYSTEM_USERS.MASTER_ADMIN.email) {
        const { password: _, ...userWithoutPassword } = SYSTEM_USERS.MASTER_ADMIN
        await setUserSession(userWithoutPassword)
        return true
      }

      // Check regular users
      const users = (await localDB.safeGet("users")) || []
      const targetUser = users.find((u: any) => u.email === email)

      if (targetUser) {
        const { password: _, ...userWithoutPassword } = targetUser
        await setUserSession(userWithoutPassword)

        // Set a warning message for disabled accounts but still allow login
        if (targetUser.isDisabled) {
          setLoginError(`Account disabled: ${targetUser.disabledReason || "Contact administrator for assistance"}`)
        }

        return true
      }

      return false
    } catch (error) {
      console.error("Quick switch error:", error)
      return false
    }
  }
  const changeUserRole = async (user: User) => {
    setAuthState({ user, isAuthenticated: true })
    console.log("User session set:", user.email)
  }
  const quickSwitchToTestAccount = async (accountType: "admin" | "manager" | "worker"): Promise<boolean> => {
    try {
      let targetEmail = ""

      switch (accountType) {
        case "admin":
          targetEmail = SYSTEM_USERS.MASTER_ADMIN.email
          break
        case "manager":
          targetEmail = "test-manager@example.com"
          break
        case "worker":
          targetEmail = "test-worker@example.com"
          break
        default:
          return false
      }

      return await quickSwitchToAccount(targetEmail)
    } catch (error) {
      console.error("Quick switch to test account error:", error)
      return false
    }
  }

  const clearError = () => setLoginError("")

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
        signup,
        signupWorker,
        logout,
        isMasterAdmin,
        isManager,
        isWorker,
        generateWorkerKey,
        quickSwitchToAccount,
        quickSwitchToTestAccount,
        refreshCurrentUser,
        loginError,
        clearError,
        changeUserRole
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
