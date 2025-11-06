"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
import { useWorkers } from "@/lib/workers"
import { useBranch } from "@/lib/branch"
import { useToast } from "@/hooks/use-toast"
import { WorkerForm } from "./worker-form"
import { ExportMenu } from "@/components/export/export-menu"
import type { Worker } from "@/types"

export function WorkerList() {
  const { workers, deleteWorker } = useWorkers()
  const { currentBranch } = useBranch()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [workerToDelete, setWorkerToDelete] = useState<Worker | null>(null)

  const filteredWorkers = workers.filter(
    (worker) =>
      worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      worker.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      worker.role.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleEdit = (worker: Worker) => {
    setSelectedWorker(worker)
    setShowForm(true)
  }

  const handleDelete = async (worker: Worker) => {
    const success = await deleteWorker(worker.id)
    if (success) {
      toast({
        title: "Worker deleted",
        description: `${worker.name} has been removed from your team.`,
      })
    } else {
      toast({
        title: "Error",
        description: "Failed to delete worker. Please try again.",
       variant: "default",
      })
    }
    setWorkerToDelete(null)
  }

  const getAverageRating = (ratings: { [criteria: string]: number }) => {
    if (!ratings) return 0
    const values = Object.values(ratings)
    if (values.length === 0) return 0
    return (values.reduce((sum, rating) => sum + rating, 0) / values.length).toFixed(1)
  }

  const getAvailableDays = (availability: Worker["availability"]) => {
    if(!availability) return ''
    return Object.entries(availability)
      .filter(([_, schedule]) => schedule.available)
      .map(([day]) => day.charAt(0).toUpperCase() + day.slice(1, 3))
      .join(", ")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Workers</h2>
          <p className="text-gray-600">Workers join automatically when they sign up with worker keys</p>
        </div>
        <div className="flex gap-2">{workers.length > 0 && <ExportMenu type="workers" />}</div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Overview</CardTitle>
          <CardDescription>
            {workers.length} worker{workers.length !== 1 ? "s" : ""} in {currentBranch?.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Search workers by name, email, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>

          {filteredWorkers.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {workers.length === 0 ? "No workers yet" : "No workers found"}
              </h3>
              <p className="text-gray-600 mb-4">
                {workers.length === 0
                  ? "Generate worker keys in the 'Worker Keys' tab for your team members to sign up."
                  : "Try adjusting your search terms."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredWorkers.map((worker) => (
                <Card key={worker.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{worker.name}</h3>
                        <p className="text-sm text-gray-600">{worker.email}</p>
                      </div>
                      <Badge variant="secondary">{worker.role}</Badge>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Average Rating:</span>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">{getAverageRating(worker.ratings)}</span>
                          <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        </div>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-600">Available:</span>
                        <p className="text-xs text-gray-500 mt-1">{getAvailableDays(worker.availability)}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(worker)} className="flex-1">
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setWorkerToDelete(worker)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Worker</DialogTitle>
          </DialogHeader>
          <WorkerForm
            worker={selectedWorker || undefined}
            onSuccess={() => setShowForm(false)}
            onCancel={() => setShowForm(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!workerToDelete} onOpenChange={() => setWorkerToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Worker</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {workerToDelete?.name}? This action cannot be undone and will remove them
              from all schedules.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => workerToDelete && handleDelete(workerToDelete)}
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
