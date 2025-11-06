"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useFranchise } from "@/lib/franchise"
import { useAuth } from "@/lib/auth"
import { useUnsavedChanges } from "@/lib/unsaved-changes"
import { useToast } from "@/hooks/use-toast"
import { localDB } from "@/lib/local-db"
import type { Branch, Franchise, User } from "@/types"
import { useAxois } from '@/lib/axois'
import { useBranch } from "@/lib/branch"

export function MasterAdminDashboard() {
  const { user, signup, signupWorker, login, generateWorkerKey, changeUserRole } = useAuth()
  const { createFranchise, getFranchises, deactivateFranchise, reactivateFranchise } = useFranchise()
  const { createBranch, getFranchiseBranches, setCurrentBranch } = useBranch()
  const { setHasUnsavedChanges } = useUnsavedChanges()
  const { toast } = useToast()
  const { instance } = useAxois()
  const [franchiseName, setFranchiseName] = useState("")
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [franchises, setFranchises] = useState<Franchise[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [testAccounts, setTestAccounts] = useState<{
    franchise?: Franchise
    manager?: User
  }>({})
  const [isCreatingTestAccounts, setIsCreatingTestAccounts] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)

        const franchiseData = (await instance({}).get("/franchises")).data;//await localDB.safeGet("franchises")
        setFranchises(Array.isArray(franchiseData) ? franchiseData : [])
        //todo will we have master admin at prod?
        const allUsers = (await instance({}).get("/user")).data; //await localDB.safeGet("users")
        const filteredUsers = Array.isArray(allUsers) ? allUsers.filter((u: User) => u.role !== "master_admin") : []
        setUsers(filteredUsers)
      } catch (error) {
        console.error("Error loading admin data:", error)
        toast({
          title: "Error",
          description: "Failed to load admin data. Please refresh the page.",
         variant: "default",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [toast])

  const handleCreateFranchise = async () => {
    if (!franchiseName.trim() || !user) return

    try {
      setHasUnsavedChanges(true)
      const newFranchise = await createFranchise(franchiseName.trim(), user.id)
      if (newFranchise) {
        setFranchises((prev) => [...(prev || []), newFranchise])
        setFranchiseName("")
        setHasUnsavedChanges(false)
        toast({
          title: "Success",
          description: "Franchise created successfully!",
        })
      }
    } catch (error) {
      console.error("Error creating franchise:", error)
      toast({
        title: "Error",
        description: "Failed to create franchise. Please try again.",
       variant: "default",
      })
    }
  }

  const handleCreateBranch = async (franchiseId : string) => {
    const branchName = inputValues[franchiseId];
    if (!branchName.trim() || !user) return

    try {
      setHasUnsavedChanges(true)
      const newBranch = await createBranch(branchName.trim(), franchiseId)
      if (newBranch) {
        //setFranchises((prev) => [...(prev || []), newFranchise])
        //setFranchiseName("")
        (franchises.filter( x=> x.id == franchiseId)[0]).branches.push(newBranch);
        setFranchises(franchises);
        setHasUnsavedChanges(false)
        inputValues[franchiseId] = '';
        toast({
          title: "Success",
          description: "Branch created successfully!",
        })
      }
    } catch (error) {
      console.error("Error creating franchise:", error)
      toast({
        title: "Error",
        description: "Failed to create franchise. Please try again.",
       variant: "default",
      })
    }
  }

  const handleDeactivateFranchise = async (franchiseId: string) => {
    try {
      setHasUnsavedChanges(true)
      if (await deactivateFranchise(franchiseId)) {
        setFranchises((prev) => (prev || []).map((f) => (f.id === franchiseId ? { ...f, isActive: false } : f)))
        setHasUnsavedChanges(false)
        toast({
          title: "Success",
          description: "Franchise and all linked accounts have been deactivated successfully!",
        })

        // Refresh users list to show disabled status
        const allUsers = await localDB.safeGet("users")
        const filteredUsers = Array.isArray(allUsers) ? allUsers.filter((u: User) => u.role !== "master_admin") : []
        setUsers(filteredUsers)
      }
    } catch (error) {
      console.error("Error deactivating franchise:", error)
      toast({
        title: "Error",
        description: "Failed to deactivate franchise. Please try again.",
       variant: "default",
      })
    }
  }

  const handleReactivateFranchise = async (franchiseId: string) => {
    try {
      setHasUnsavedChanges(true)
      if (await reactivateFranchise(franchiseId)) {
        setFranchises((prev) => (prev || []).map((f) => (f.id === franchiseId ? { ...f, isActive: true } : f)))
        setHasUnsavedChanges(false)
        toast({
          title: "Success",
          description: "Franchise and all linked accounts have been reactivated successfully!",
        })

        // Refresh users list to show reactivated status
        const allUsers = await localDB.safeGet("users")
        const filteredUsers = Array.isArray(allUsers) ? allUsers.filter((u: User) => u.role !== "master_admin") : []
        setUsers(filteredUsers)
      }
    } catch (error) {
      console.error("Error reactivating franchise:", error)
      toast({
        title: "Error",
        description: "Failed to reactivate franchise. Please try again.",
       variant: "default",
      })
    }
  }

  const handleSaveChanges = async () => {
    try {
      await localDB.safeSet("franchises", franchises)
      setHasUnsavedChanges(false)
      toast({
        title: "Success",
        description: "All changes saved successfully!",
      })
    } catch (error) {
      console.error("Error saving changes:", error)
      toast({
        title: "Error",
        description: "Failed to save changes. Please try again.",
       variant: "default",
      })
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied",
      description: "Franchise key copied to clipboard!",
    })
  }


  // You can add common headers or auth tokens here
//instance.defaults.headers.common['Authorization'] = AUTH_TOKEN;

  const moveToBranch = async (branch :Branch) => {
    if (!user) return

    //try {
      //{mail: 'test-manager@example.com'}
      //todo users by branch
      const existingUsers = (await instance({}).get("/user")).data; 
      // if (Array.isArray(filteredUsers2)) {
      //   await localDB.safeSet("users", filteredUsers2)
     // }
      
          //const existingUsers = await localDB.safeGet("users")
      if (Array.isArray(existingUsers)) {
        const filteredUsers = existingUsers.filter((u: User) => !u.email.includes("test-manager@example.com"))
        await localDB.safeSet("users", filteredUsers)
      }

      //todo maybe to function
      await localDB.safeSet("branches", branch)
      setCurrentBranch(branch)
      user.role = "user"
      await changeUserRole(user)
    //}
     
  }

// You can add common headers or auth tokens here
//instance.defaults.headers.common['Authorization'] = AUTH_TOKEN;

  const createTestAccounts = async (franchiseKey = '') => {
    if (!user) return

    try {
      setIsCreatingTestAccounts(true)
      //{mail: 'test-manager@example.com'}
      //todo Will be used in prod?
      const existingUsers = (await instance({}).get("/user")).data; 
      // if (Array.isArray(filteredUsers2)) {
      //   await localDB.safeSet("users", filteredUsers2)
     // }
      
          //const existingUsers = await localDB.safeGet("users")
      if (Array.isArray(existingUsers)) {
        const filteredUsers = existingUsers.filter((u: User) => !u.email.includes("test-manager@example.com"))
        await localDB.safeSet("users", filteredUsers)
      }

      let testFranchise =  franchiseKey ?  {key : franchiseKey} : undefined;
      if(!franchiseKey)
      {
          try {
          testFranchise = await createFranchise("Test Franchise", user.id)
          if (!testFranchise) {
            throw new Error("createFranchise returned null")
          }
        } catch (error) {
          console.error("Franchise creation error:", error)
          throw new Error(`Failed to create test franchise: ${error instanceof Error ? error.message : "Unknown error"}`)
        }
      }
      toast({
        title: "Step 1/2 Complete",
        description: "Created test franchise",
      })

      await new Promise((resolve) => setTimeout(resolve, 500))

      let managerResult
      let managerUser
      try {
        console.log("Creating manager with:", {
          email: "test-manager@example.com",
          name: "Test Manager",
          branchName: "Test Branch",
          franchiseKey: testFranchise.key,
        })

        managerResult = await signup(
          "test-manager@example.com",
          "testpass123",
          "Test Manager",
          "Test Branch",
          testFranchise.key,
        )

        console.log("Manager signup result:", managerResult)

        if (!managerResult) {
          throw new Error("Signup returned false")
        }

        await new Promise((resolve) => setTimeout(resolve, 200))

        const allUsers = await localDB.safeGet("users")
        managerUser = allUsers.find((u: User) => u.email === "test-manager@example.com")
        if (!managerUser) {
          throw new Error("Manager user not found after signup")
        }
      } catch (error) {
        console.error("Manager creation error:", error)
        throw new Error(`Failed to create test manager: ${error instanceof Error ? error.message : "Unknown error"}`)
      }

      toast({
        title: "Step 2/2 Complete",
        description: "Created test manager account",
      })

      setTestAccounts({
        franchise: testFranchise,
        manager: managerUser,
      })

      try {
        const franchiseData = await localDB.safeGet("franchises")
        setFranchises(Array.isArray(franchiseData) ? franchiseData : [])

        const allUsers = await localDB.safeGet("users")
        const filteredUsers = Array.isArray(allUsers) ? allUsers.filter((u: User) => u.role !== "master_admin") : []
        setUsers(filteredUsers)
      } catch (error) {
        console.error("Error refreshing data:", error)
      }

      toast({
        title: "Success!",
        description: "Test franchise and manager created! Login as manager to create worker accounts.",
      })
    } catch (error) {
      console.error("Error creating test accounts:", error)
      toast({
        title: "Error",
        description: `Error creating test accounts: ${error instanceof Error ? error.message : "Unknown error"}`,
       variant: "default",
      })
    } finally {
      setIsCreatingTestAccounts(false)
    }
  }

  const loginAsTestAccount = async (email: string, password: string, accountType: string) => {
    try {
      const result = await login(email, password)
      if (result.success) {
        toast({
          title: "Success",
          description: `Logged in as ${accountType}`,
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to login to test account",
         variant: "default",
        })
      }
    } catch (error) {
      console.error("Error logging in:", error)
      toast({
        title: "Error",
        description: "Failed to login to test account",
       variant: "default",
      })
    }
  }

  const clearTestAccounts = async () => {
    try {
      setTestAccounts({})

      toast({
        title: "Success",
        description: "Test accounts cleared from memory. Note: Accounts still exist in database.",
      })
    } catch (error) {
      console.error("Error clearing test accounts:", error)
    }
  }

  const activeFranchises = (franchises || []).filter((f) => f.isActive)
  const totalBranches = (franchises || []).reduce((total, f) => total + (f.branches?.length || 0), 0)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Master Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage franchises and monitor system usage</p>
        </div>
        <Button onClick={handleSaveChanges} variant="outline">
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue="franchises" className="space-y-4">
        <TabsList>
          <TabsTrigger value="franchises">Franchise Management</TabsTrigger>
          <TabsTrigger value="users">User Overview</TabsTrigger>
          <TabsTrigger value="analytics">System Analytics</TabsTrigger>
          <TabsTrigger value="test-mode">Test Mode</TabsTrigger>
        </TabsList>

        <TabsContent value="franchises" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create New Franchise</CardTitle>
              <CardDescription>Generate a new franchise key for branch connections</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="franchise-name">Franchise Name</Label>
                  <Input
                    id="franchise-name"
                    value={franchiseName}
                    onChange={(e) => {
                      setFranchiseName(e.target.value)
                      if (e.target.value !== "") setHasUnsavedChanges(true)
                    }}
                    placeholder="Enter franchise name"
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleCreateFranchise} disabled={!franchiseName.trim()}>
                    Create Franchise
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active Franchises ({activeFranchises.length})</CardTitle>
              <CardDescription>Manage existing franchises and their keys</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {franchises.map((franchise) => (
                  <div key={franchise.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <h3 className="font-semibold">{franchise.name}</h3>
                      <div className="flex items-center gap-2">
                        <code className="px-2 py-1 bg-muted rounded text-sm font-mono">{franchise.key}</code>
                        <Button variant="outline" size="sm" onClick={() => copyToClipboard(franchise.key)}>
                          Copy Key
                        </Button>
                        {franchise.branches?.map((branch) => (<button key={branch.id}  onClick={() => moveToBranch(branch)} > {branch.name}</button>))}
                        
                        
                      </div>
                  <div className="flex-1">
                  <Label htmlFor="branch-name">Branch Name</Label>
                  <Input
                    id="branch-name"
                     value={inputValues[franchise.id] || ''}
                    onChange={(e) => {
                       setInputValues({ ...inputValues, [franchise.id]: e.target.value });
                      if (e.target.value !== "") setHasUnsavedChanges(true)
                    }}
                    placeholder="Enter branch name"
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={() => handleCreateBranch(franchise.id)} disabled={!(inputValues[franchise.id] || '').trim()}>
                    Create Branch
                  </Button>
                </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Created: {new Date(franchise.createdAt).toLocaleDateString()}</span>
                        <Badge variant="secondary">{franchise.branches?.length || 0} branches</Badge>
                        {franchise.branches && franchise.branches.length > 0 && (
                          <Badge variant="outline">{franchise.branches.length} connected</Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {!franchise.isActive ? (
                        <Button variant="default" size="sm" onClick={() => handleReactivateFranchise(franchise.id)}>
                          Reactivate
                        </Button>
                      ) : (
                        <Button variant="destructive" size="sm" onClick={() => handleDeactivateFranchise(franchise.id)}>
                          Deactivate
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {activeFranchises.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">No active franchises</p>
                    <p className="text-sm text-muted-foreground">Create your first franchise to get started</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Users ({users.length})</CardTitle>
              <CardDescription>Overview of all registered users and their branches</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(users || []).map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{user.name}</h3>
                        {user.isDisabled && <Badge variant="destructive">Disabled</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      {user.isDisabled && user.disabledReason && (
                        <p className="text-sm text-red-600">Reason: {user.disabledReason}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm">
                        <span>Branch: {user.branchName}</span>
                        <Badge variant="outline" className="capitalize">
                          {user.role}
                        </Badge>
                        {user.franchiseKey && <Badge variant="secondary">Franchise: {user.franchiseKey}</Badge>}
                      </div>
                    </div>
                    <Badge variant="secondary">Joined {new Date(user.createdAt).toLocaleDateString()}</Badge>
                  </div>
                ))}
                {(users || []).length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">No users registered</p>
                    <p className="text-sm text-muted-foreground">Users will appear here after they sign up</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(users || []).length}</div>
                <p className="text-xs text-muted-foreground">
                  {users.filter((u) => u.role === "manager").length} managers,{" "}
                  {users.filter((u) => u.role === "worker").length} workers
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Franchises</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeFranchises.length}</div>
                <p className="text-xs text-muted-foreground">
                  {franchises.length - activeFranchises.length} deactivated
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Connected Branches</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalBranches}</div>
                <p className="text-xs text-muted-foreground">Across all franchises</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="test-mode" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Mode</CardTitle>
              <CardDescription>Automatically create test accounts for easy development and testing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">What Admin Test Mode Does:</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Creates a test franchise with a unique key</li>
                  <li>Creates a test manager account using the franchise key</li>
                </ol>
                <p className="text-sm text-muted-foreground mt-2">
                  <strong>Note:</strong> Login as the test manager to access manager test mode for creating worker
                  accounts.
                </p>
              </div>

              <div className="flex gap-4">
                <Button onClick={() => createTestAccounts()} disabled={isCreatingTestAccounts} className="flex-1">
                  {isCreatingTestAccounts ? "Creating Test Accounts..." : "Create Test Accounts"}
                </Button>
                <Button onClick={clearTestAccounts} variant="outline" disabled={!testAccounts.manager}>
                  Clear Test Data
                </Button>
              </div>

              {testAccounts.manager && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Test Accounts Created</CardTitle>
                    <CardDescription>Click the buttons below to login as different test accounts</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {testAccounts.franchise && (
                      <div className="p-3 bg-muted rounded">
                        <h4 className="font-medium">Test Franchise</h4>
                        <p className="text-sm text-muted-foreground">Name: {testAccounts.franchise.name}</p>
                        <p className="text-sm text-muted-foreground">Key: {testAccounts.franchise.key}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <h4 className="font-medium">Test Manager</h4>
                        <p className="text-sm text-muted-foreground">Email: test-manager@example.com</p>
                        <p className="text-sm text-muted-foreground">Password: testpass123</p>
                      </div>
                      <Button
                        onClick={() => loginAsTestAccount("test-manager@example.com", "testpass123", "Test Manager")}
                        size="sm"
                      >
                        Login as Manager
                      </Button>
                    </div>

                    <div className="p-3 bg-blue-50 rounded border border-blue-200">
                      <p className="text-sm text-blue-800">
                        <strong>Next Step:</strong> Login as the test manager and use the manager test mode to create
                        worker accounts.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
