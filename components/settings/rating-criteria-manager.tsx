"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useBranch } from "@/lib/branch"
import { useToast } from "@/hooks/use-toast"

export function RatingCriteriaManager() {
  const { currentBranch, updateBranchSettings } = useBranch()
  const { toast } = useToast()
  const [newCriteria, setNewCriteria] = useState("")
  const [criteriaToDelete, setCriteriaToDelete] = useState<string | null>(null)

  if (!currentBranch) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">No branch data available</p>
        </CardContent>
      </Card>
    )
  }

  const handleAddCriteria = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newCriteria.trim()) {
      toast({
        title: "Invalid input",
        description: "Please enter a criteria name.",
       variant: "default",
      })
      return
    }

    if (currentBranch.settings.ratingCriteria.includes(newCriteria.trim())) {
      toast({
        title: "Duplicate criteria",
        description: "This criteria already exists.",
       variant: "default",
      })
      return
    }

    const updatedCriteria = [...currentBranch.settings.ratingCriteria, newCriteria.trim()]

    const success = await updateBranchSettings(currentBranch.id, {
      ratingCriteria: updatedCriteria,
    })

    if (success) {
      toast({
        title: "Criteria added",
        description: `"${newCriteria}" has been added to rating criteria.`,
      })
      setNewCriteria("")
    } else {
      toast({
        title: "Error",
        description: "Failed to add criteria. Please try again.",
       variant: "default",
      })
    }
  }

  const handleDeleteCriteria = async (criteria: string) => {
    const updatedCriteria = currentBranch.settings.ratingCriteria.filter((c) => c !== criteria)

    const success = await updateBranchSettings(currentBranch.id, {
      ratingCriteria: updatedCriteria,
    })

    if (success) {
      toast({
        title: "Criteria deleted",
        description: `"${criteria}" has been removed from rating criteria.`,
      })
    } else {
      toast({
        title: "Error",
        description: "Failed to delete criteria. Please try again.",
       variant: "default",
      })
    }
    setCriteriaToDelete(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Rating Criteria</h3>
        <p className="text-sm text-gray-600">Manage the criteria used to evaluate worker performance</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add New Criteria</CardTitle>
          <CardDescription>Add criteria that will be used to rate worker performance</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddCriteria} className="flex gap-2">
            <div className="flex-1">
              <Input
                value={newCriteria}
                onChange={(e) => setNewCriteria(e.target.value)}
                placeholder="e.g., Communication Skills, Problem Solving"
                required
              />
            </div>
            <Button type="submit">Add Criteria</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Criteria</CardTitle>
          <CardDescription>
            {currentBranch.settings.ratingCriteria.length} criteria configured for worker evaluation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentBranch.settings.ratingCriteria.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-4">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">No rating criteria</h4>
              <p className="text-gray-600">Add criteria to evaluate worker performance.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {currentBranch.settings.ratingCriteria.map((criteria, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{index + 1}</Badge>
                    <span className="font-medium">{criteria}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCriteriaToDelete(criteria)}
                    className="text-red-600 hover:text-red-700"
                  >
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!criteriaToDelete} onOpenChange={() => setCriteriaToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Rating Criteria</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{criteriaToDelete}"? This will remove this criteria from all worker
              profiles and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => criteriaToDelete && handleDeleteCriteria(criteriaToDelete)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
