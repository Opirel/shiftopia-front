"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useBranch } from "@/lib/branch"
import { useToast } from "@/hooks/use-toast"
import type { Branch } from "@/types"

export function FranchiseSync() {
  const { currentBranch, syncWithFranchise, getFranchiseBranches } = useBranch()
  const { toast } = useToast()
  const [franchiseKey, setFranchiseKey] = useState("")
  const [syncedBranches, setSyncedBranches] = useState<Branch[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const handleSync = async () => {
    if (!franchiseKey.trim()) {
      toast({
        title: "Invalid franchise key",
        description: "Please enter a valid franchise key.",
       variant: "default",
      })
      return
    }

    setIsLoading(true)
    try {
      const branches = await syncWithFranchise(franchiseKey)
      setSyncedBranches(branches)

      if (branches.length > 0) {
        toast({
          title: "Sync successful",
          description: `Found ${branches.length} branch(es) in the franchise.`,
        })
      } else {
        toast({
          title: "No branches found",
          description: "No branches found with this franchise key.",
        })
      }
    } catch (error) {
      toast({
        title: "Sync failed",
        description: "Failed to sync with franchise. Please try again.",
       variant: "default",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const currentFranchiseBranches = currentBranch?.franchiseKey ? getFranchiseBranches(currentBranch.franchiseKey) : []

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Franchise Synchronization</CardTitle>
          <CardDescription>
            Connect with other branches using a franchise key to share workers and sync schedules
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentBranch?.franchiseKey ? (
            <div>
              <Label>Current Franchise Key</Label>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="font-mono">
                  {currentBranch.franchiseKey}
                </Badge>
                <span className="text-sm text-gray-500">Connected to {currentFranchiseBranches.length} branch(es)</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="franchiseKey">Enter Franchise Key</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="franchiseKey"
                    value={franchiseKey}
                    onChange={(e) => setFranchiseKey(e.target.value)}
                    placeholder="Enter franchise key to sync"
                    className="font-mono"
                  />
                  <Button onClick={handleSync} disabled={isLoading}>
                    {isLoading ? "Syncing..." : "Sync"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {currentFranchiseBranches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Franchise Branches</CardTitle>
            <CardDescription>All branches connected to your franchise</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {currentFranchiseBranches.map((branch) => (
                <div key={branch.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{branch.name}</h4>
                    <p className="text-sm text-gray-500">Created {new Date(branch.createdAt).toLocaleDateString()}</p>
                  </div>
                  {branch.id === currentBranch?.id && <Badge variant="default">Your Branch</Badge>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {syncedBranches.length > 0 && !currentBranch?.franchiseKey && (
        <Card>
          <CardHeader>
            <CardTitle>Found Branches</CardTitle>
            <CardDescription>Branches found with the entered franchise key</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {syncedBranches.map((branch) => (
                <div key={branch.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{branch.name}</h4>
                    <p className="text-sm text-gray-500">Created {new Date(branch.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                To join this franchise, you'll need to update your account settings with the franchise key during signup
                or contact your franchise administrator.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
