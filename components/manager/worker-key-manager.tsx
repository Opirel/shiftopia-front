"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth"
import { localDB } from "@/lib/local-db"
import { useToast } from "@/hooks/use-toast"
import { Copy, Check } from "lucide-react"

interface WorkerKey {
  id: string
  key: string
  managerId: string
  createdAt: string
  isActive: boolean
  usedBy?: string
  usedAt?: string
}

export function WorkerKeyManager() {
  const { user, generateWorkerKey } = useAuth()
  const { toast } = useToast()
  const [workerKeys, setWorkerKeys] = useState<WorkerKey[]>([])
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const loadWorkerKeys = async () => {
      try {
        const allKeys = (await localDB.safeGet("workerKeys")) || []
        const managerKeys = allKeys.filter((key: WorkerKey) => key.managerId === user?.id)
        setWorkerKeys(managerKeys)
      } catch (error) {
        console.error("Error loading worker keys:", error)
      }
    }

    if (user?.id) {
      loadWorkerKeys()
    }
  }, [user?.id])

  const createWorkerKey = async () => {
    if (!user?.id) return

    setIsLoading(true)
    try {
      const newKey: WorkerKey = {
        id: crypto.randomUUID(),
        key: await generateWorkerKey(),
        managerId: user.id,
        createdAt: new Date().toISOString(),
        isActive: true,
      }

      const allKeys = (await localDB.safeGet("workerKeys")) || []
      allKeys.push(newKey)
      await localDB.safeSet("workerKeys", allKeys)

      setWorkerKeys([...workerKeys, newKey])

      toast({
        title: "Worker key generated",
        description: "Share this key with your worker to create their account.",
      })
    } catch (error) {
      console.error("Error creating worker key:", error)
      toast({
        title: "Error",
        description: "Failed to generate worker key. Please try again.",
       variant: "default",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 2000)

      toast({
        title: "Copied to clipboard",
        description: "Worker key has been copied to your clipboard.",
      })
    } catch (err) {
      console.error("Failed to copy:", err)
      toast({
        title: "Copy failed",
        description: "Unable to copy to clipboard. Please copy manually.",
       variant: "default",
      })
    }
  }

  const deactivateKey = async (keyId: string) => {
    try {
      const allKeys = (await localDB.safeGet("workerKeys")) || []
      const updatedKeys = allKeys.map((key: WorkerKey) => (key.id === keyId ? { ...key, isActive: false } : key))
      await localDB.safeSet("workerKeys", updatedKeys)

      setWorkerKeys(workerKeys.map((key) => (key.id === keyId ? { ...key, isActive: false } : key)))

      toast({
        title: "Key deactivated",
        description: "Worker key has been deactivated and can no longer be used.",
      })
    } catch (error) {
      console.error("Error deactivating key:", error)
      toast({
        title: "Error",
        description: "Failed to deactivate key. Please try again.",
       variant: "default",
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Worker Keys</CardTitle>
        <CardDescription>Generate keys for workers to create their accounts and join your team</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Button onClick={createWorkerKey} disabled={isLoading} className="w-full">
            {isLoading ? "Generating..." : "Generate New Worker Key"}
          </Button>

          <div className="space-y-3">
            {workerKeys.map((keyObj) => (
              <div key={keyObj.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-mono text-sm bg-muted p-2 rounded break-all">{keyObj.key}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Created: {new Date(keyObj.createdAt).toLocaleDateString()}
                      {keyObj.usedAt && (
                        <span className="ml-2">• Used: {new Date(keyObj.usedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Badge variant={keyObj.isActive ? "default" : "secondary"}>
                      {keyObj.isActive ? "Active" : keyObj.usedBy ? "Used" : "Inactive"}
                    </Badge>
                    <Button size="sm" variant="outline" onClick={() => copyToClipboard(keyObj.key)}>
                      {copiedKey === keyObj.key ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    {keyObj.isActive && (
                      <Button size="sm" variant="destructive" onClick={() => deactivateKey(keyObj.id)}>
                        Deactivate
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {workerKeys.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-2">No worker keys created yet</p>
              <p className="text-sm text-muted-foreground">
                Generate keys for your team members to create their worker accounts
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
