"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import { localDB } from "@/lib/local-db"
import type { User } from "@/types"

export function ManagerTestMode() {
  const { user, signupWorker, generateWorkerKey, login } = useAuth()
  const { toast } = useToast()

  const [testWorkers, setTestWorkers] = useState<User[]>([])
  const [workerCount, setWorkerCount] = useState(3) // Default to 3 workers
  const [isCreatingWorkers, setIsCreatingWorkers] = useState(false)

  const testWorkerNames = [
    "Alice Johnson",
    "Bob Smith",
    "Carol Davis",
    "David Wilson",
    "Emma Brown",
    "Frank Miller",
    "Grace Lee",
    "Henry Taylor",
    "Ivy Chen",
    "Jack Anderson",
  ]

  const createTestWorkers = async () => {
    if (!user) return

    try {
      setIsCreatingWorkers(true)

      const existingUsers = await localDB.safeGet("users")
      if (Array.isArray(existingUsers)) {
        const filteredUsers = existingUsers.filter((u: User) => !u.email.includes("test-worker"))
        await localDB.safeSet("users", filteredUsers)
      }

      const existingWorkerKeys = await localDB.safeGet("workerKeys")
      if (Array.isArray(existingWorkerKeys)) {
        const filteredKeys = existingWorkerKeys.filter((key: any) => !key.key.includes("TEST"))
        await localDB.safeSet("workerKeys", filteredKeys)
      }

      const createdWorkers: User[] = []

      for (let i = 0; i < workerCount; i++) {
        const workerName = testWorkerNames[i] || `Test Worker ${i + 1}`
        const workerEmail = `test-worker-${i + 1}@${user.branchName}.com`

        try {
          // Generate worker key
          const workerKey = await generateWorkerKey(user.id)
          if (!workerKey) {
            throw new Error("Failed to generate worker key")
          }

          // Wait and verify key exists
          await new Promise((resolve) => setTimeout(resolve, 300))
          const savedWorkerKeys = await localDB.safeGet("workerKeys")
          const keyExists =
            Array.isArray(savedWorkerKeys) &&
            savedWorkerKeys.some((k: any) => k.key === workerKey && k.isActive === true)

          if (!keyExists) {
            // Manually save key if needed
            const currentKeys = (await localDB.safeGet("workerKeys")) || []
            const newKey = {
              key: workerKey,
              managerId: user.id,
              isActive: true,
              createdAt: new Date().toISOString(),
            }
            await localDB.safeSet("workerKeys", [...currentKeys, newKey])
          }

          // Create worker account
          const workerResult = await signupWorker(workerEmail, "testpass123", workerName, workerKey)

          if (!workerResult) {
            console.error(`Failed to create worker ${workerName}`)
            continue // Skip this worker and continue with next
          }

          // Get the created worker
          await new Promise((resolve) => setTimeout(resolve, 300))
          const allUsers = await localDB.safeGet("users")
          const workerUser = allUsers.find((u: User) => u.email === workerEmail)

          if (workerUser) {
            createdWorkers.push(workerUser)
            toast({
              title: `Worker ${i + 1}/${workerCount} Created`,
              description: `Created ${workerName}`,
            })
          }
        } catch (error) {
          console.error(`Error creating worker ${workerName}:`, error)
          toast({
            title: "Worker Creation Error",
            description: `Failed to create ${workerName}`,
           variant: "default",
          })
        }
      }

      setTestWorkers(createdWorkers)

      toast({
        title: "Success!",
        description: `Created ${createdWorkers.length} test worker accounts! Use the Workers dropdown in the header to switch between them.`,
      })
    } catch (error) {
      console.error("Error creating test workers:", error)
      toast({
        title: "Error",
        description: `Error creating test workers: ${error instanceof Error ? error.message : "Unknown error"}`,
       variant: "default",
      })
    } finally {
      setIsCreatingWorkers(false)
    }
  }

  const clearTestWorkers = async () => {
    try {
      // Clear from memory
      setTestWorkers([])

      // Clear from database
      const existingUsers = await localDB.safeGet("users")
      if (Array.isArray(existingUsers)) {
        const filteredUsers = existingUsers.filter((u: User) => !u.email.includes("test-worker"))
        await localDB.safeSet("users", filteredUsers)
      }

      const existingWorkerKeys = await localDB.safeGet("workerKeys")
      if (Array.isArray(existingWorkerKeys)) {
        const filteredKeys = existingWorkerKeys.filter((key: any) => !key.key.includes("TEST"))
        await localDB.safeSet("workerKeys", filteredKeys)
      }

      toast({
        title: "Success",
        description: "All test workers cleared from database",
      })
    } catch (error) {
      console.error("Error clearing test workers:", error)
      toast({
        title: "Error",
        description: "Failed to clear test workers",
       variant: "default",
      })
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Manager Test Mode</CardTitle>
          <CardDescription>Create multiple test worker accounts for realistic testing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">What Manager Test Mode Does:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Generates worker keys from your manager account</li>
              <li>Creates multiple test worker accounts with different names</li>
              <li>Links all workers to your branch for scheduling</li>
              <li>Adds a Workers dropdown in the header for easy switching</li>
            </ol>
          </div>

          <div className="space-y-2">
            <Label htmlFor="workerCount">Number of Test Workers to Create</Label>
            <Input
              id="workerCount"
              type="number"
              min="1"
              max="10"
              value={workerCount}
              onChange={(e) => setWorkerCount(Math.max(1, Math.min(10, Number.parseInt(e.target.value) || 1)))}
              className="w-32"
            />
            <p className="text-xs text-muted-foreground">Create 1-10 test workers (recommended: 3-5)</p>
          </div>

          <div className="flex gap-4">
            <Button onClick={createTestWorkers} disabled={isCreatingWorkers} className="flex-1">
              {isCreatingWorkers ? `Creating ${workerCount} Test Workers...` : `Create ${workerCount} Test Workers`}
            </Button>
            <Button onClick={clearTestWorkers} variant="outline" disabled={testWorkers.length === 0}>
              Clear All Test Workers
            </Button>
          </div>

          {testWorkers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Test Workers Created ({testWorkers.length})</CardTitle>
                <CardDescription>Use the Workers dropdown in the header to switch between accounts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  {testWorkers.map((worker, index) => (
                    <div key={worker.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <h4 className="font-medium">{worker.name}</h4>
                        <p className="text-sm text-muted-foreground">{worker.email}</p>
                        <Badge variant="outline" className="mt-1">
                          Linked to your branch
                        </Badge>
                      </div>
                      <Badge variant="secondary">Worker {index + 1}</Badge>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-green-50 rounded border border-green-200">
                  <p className="text-sm text-green-800">
                    <strong>Quick Testing:</strong> All test workers are linked to your branch. Use the Workers dropdown
                    in the header to switch between them. Each worker can submit availability and be scheduled.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
