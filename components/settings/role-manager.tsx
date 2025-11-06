"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
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
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { useBranch } from "@/lib/branch"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "@/lib/i18n"
import { Plus, Edit, Trash2, Users, Briefcase } from "lucide-react"

interface Role {
  id: string
  name: string
  description: string
  permissions: string[]
  color: string
  createdAt: string
}

interface JobTitle {
  id: string
  name: string
  description: string
  department: string
  level: "entry" | "mid" | "senior" | "management"
  createdAt: string
}

export function RoleManager() {
  const { currentBranch, updateBranchSettings } = useBranch()
  const { toast } = useToast()
  const { t } = useTranslation()
  const [showRoleForm, setShowRoleForm] = useState(false)
  const [showJobTitleForm, setShowJobTitleForm] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [editingJobTitle, setEditingJobTitle] = useState<JobTitle | null>(null)
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null)
  const [jobTitleToDelete, setJobTitleToDelete] = useState<JobTitle | null>(null)

  const [roleFormData, setRoleFormData] = useState({
    name: "",
    description: "",
    permissions: [] as string[],
    color: "bg-blue-500",
  })

  const [jobTitleFormData, setJobTitleFormData] = useState({
    name: "",
    description: "",
    department: "",
    level: "entry" as "entry" | "mid" | "senior" | "management",
  })

  const roles: Role[] = currentBranch?.settings?.roles || []
  const jobTitles: JobTitle[] = currentBranch?.settings?.jobTitles || []

  const colorOptions = [
    { value: "bg-blue-500", label: "Blue", class: "bg-blue-500" },
    { value: "bg-green-500", label: "Green", class: "bg-green-500" },
    { value: "bg-purple-500", label: "Purple", class: "bg-purple-500" },
    { value: "bg-orange-500", label: "Orange", class: "bg-orange-500" },
    { value: "bg-red-500", label: "Red", class: "bg-red-500" },
    { value: "bg-indigo-500", label: "Indigo", class: "bg-indigo-500" },
    { value: "bg-pink-500", label: "Pink", class: "bg-pink-500" },
    { value: "bg-teal-500", label: "Teal", class: "bg-teal-500" },
  ]

  const permissionOptions = [
    "view_schedules",
    "edit_schedules",
    "manage_availability",
    "view_reports",
    "manage_workers",
    "approve_time_off",
    "switch_shifts",
  ]

  const resetRoleForm = () => {
    setRoleFormData({
      name: "",
      description: "",
      permissions: [],
      color: "bg-blue-500",
    })
    setEditingRole(null)
  }

  const resetJobTitleForm = () => {
    setJobTitleFormData({
      name: "",
      description: "",
      department: "",
      level: "entry",
    })
    setEditingJobTitle(null)
  }

  const handleRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentBranch) return

    const updatedRoles = [...roles]

    if (editingRole) {
      const index = updatedRoles.findIndex((r) => r.id === editingRole.id)
      if (index >= 0) {
        updatedRoles[index] = { ...editingRole, ...roleFormData }
      }
    } else {
      const newRole: Role = {
        id: crypto.randomUUID(),
        ...roleFormData,
        createdAt: new Date().toISOString(),
      }
      updatedRoles.push(newRole)
    }

    const success = await updateBranchSettings(currentBranch.id, {
      roles: updatedRoles,
    })

    if (success) {
      toast({
        title: editingRole ? "Role updated" : "Role created",
        description: `Role "${roleFormData.name}" has been ${editingRole ? "updated" : "created"}.`,
      })
      setShowRoleForm(false)
      resetRoleForm()
    } else {
      toast({
        title: "Error",
        description: "Failed to save role. Please try again.",
       variant: "default",
      })
    }
  }

  const handleJobTitleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentBranch) return

    const updatedJobTitles = [...jobTitles]

    if (editingJobTitle) {
      const index = updatedJobTitles.findIndex((j) => j.id === editingJobTitle.id)
      if (index >= 0) {
        updatedJobTitles[index] = { ...editingJobTitle, ...jobTitleFormData }
      }
    } else {
      const newJobTitle: JobTitle = {
        id: crypto.randomUUID(),
        ...jobTitleFormData,
        createdAt: new Date().toISOString(),
      }
      updatedJobTitles.push(newJobTitle)
    }

    const success = await updateBranchSettings(currentBranch.id, {
      jobTitles: updatedJobTitles,
    })

    if (success) {
      toast({
        title: editingJobTitle ? "Job title updated" : "Job title created",
        description: `Job title "${jobTitleFormData.name}" has been ${editingJobTitle ? "updated" : "created"}.`,
      })
      setShowJobTitleForm(false)
      resetJobTitleForm()
    } else {
      toast({
        title: "Error",
        description: "Failed to save job title. Please try again.",
       variant: "default",
      })
    }
  }

  const handleEditRole = (role: Role) => {
    setRoleFormData({
      name: role.name,
      description: role.description,
      permissions: role.permissions,
      color: role.color,
    })
    setEditingRole(role)
    setShowRoleForm(true)
  }

  const handleEditJobTitle = (jobTitle: JobTitle) => {
    setJobTitleFormData({
      name: jobTitle.name,
      description: jobTitle.description,
      department: jobTitle.department,
      level: jobTitle.level,
    })
    setEditingJobTitle(jobTitle)
    setShowJobTitleForm(true)
  }

  const handleDeleteRole = async (role: Role) => {
    if (!currentBranch) return

    const updatedRoles = roles.filter((r) => r.id !== role.id)
    const success = await updateBranchSettings(currentBranch.id, {
      roles: updatedRoles,
    })

    if (success) {
      toast({
        title: "Role deleted",
        description: `Role "${role.name}" has been deleted.`,
      })
    } else {
      toast({
        title: "Error",
        description: "Failed to delete role. Please try again.",
       variant: "default",
      })
    }
    setRoleToDelete(null)
  }

  const handleDeleteJobTitle = async (jobTitle: JobTitle) => {
    if (!currentBranch) return

    const updatedJobTitles = jobTitles.filter((j) => j.id !== jobTitle.id)
    const success = await updateBranchSettings(currentBranch.id, {
      jobTitles: updatedJobTitles,
    })

    if (success) {
      toast({
        title: "Job title deleted",
        description: `Job title "${jobTitle.name}" has been deleted.`,
      })
    } else {
      toast({
        title: "Error",
        description: "Failed to delete job title. Please try again.",
       variant: "default",
      })
    }
    setJobTitleToDelete(null)
  }

  if (!currentBranch) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">No branch data available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      {/* Roles Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <div>
              <h3 className="text-lg font-semibold">Worker Roles</h3>
              <p className="text-sm text-muted-foreground">Define roles and permissions for your workers</p>
            </div>
          </div>
          <Button
            onClick={() => {
              resetRoleForm()
              setShowRoleForm(true)
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Role
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role) => (
            <Card key={role.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${role.color}`} />
                    <h4 className="font-medium">{role.name}</h4>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => handleEditRole(role)}>
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setRoleToDelete(role)}>
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{role.description}</p>
                <div className="flex flex-wrap gap-1">
                  {role.permissions.map((permission) => (
                    <Badge key={permission} variant="secondary" className="text-xs">
                      {permission.replace("_", " ")}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {roles.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h4 className="text-lg font-medium mb-2">No roles defined</h4>
                <p className="text-muted-foreground mb-4">
                  Create roles to organize your workers and define permissions.
                </p>
                <Button
                  onClick={() => {
                    resetRoleForm()
                    setShowRoleForm(true)
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Role
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Job Titles Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            <div>
              <h3 className="text-lg font-semibold">Job Titles</h3>
              <p className="text-sm text-muted-foreground">Manage job titles and positions for scheduling</p>
            </div>
          </div>
          <Button
            onClick={() => {
              resetJobTitleForm()
              setShowJobTitleForm(true)
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Job Title
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobTitles.map((jobTitle) => (
            <Card key={jobTitle.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-medium">{jobTitle.name}</h4>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => handleEditJobTitle(jobTitle)}>
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setJobTitleToDelete(jobTitle)}>
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{jobTitle.description}</p>
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{jobTitle.department}</Badge>
                  <Badge variant={jobTitle.level === "management" ? "default" : "secondary"}>{jobTitle.level}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {jobTitles.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h4 className="text-lg font-medium mb-2">No job titles defined</h4>
                <p className="text-muted-foreground mb-4">Create job titles to better organize your workforce.</p>
                <Button
                  onClick={() => {
                    resetJobTitleForm()
                    setShowJobTitleForm(true)
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Job Title
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Role Form Dialog */}
      <Dialog open={showRoleForm} onOpenChange={setShowRoleForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingRole ? "Edit Role" : "Create Role"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRoleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="roleName">Role Name</Label>
              <Input
                id="roleName"
                value={roleFormData.name}
                onChange={(e) => setRoleFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Manager, Supervisor, Staff"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="roleDescription">Description</Label>
              <Textarea
                id="roleDescription"
                value={roleFormData.description}
                onChange={(e) => setRoleFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the role and responsibilities"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setRoleFormData((prev) => ({ ...prev, color: color.value }))}
                    className={`w-8 h-8 rounded-full ${color.class} ${
                      roleFormData.color === color.value ? "ring-2 ring-offset-2 ring-gray-400" : ""
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Permissions</Label>
              <div className="grid grid-cols-2 gap-2">
                {permissionOptions.map((permission) => (
                  <label key={permission} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={roleFormData.permissions.includes(permission)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setRoleFormData((prev) => ({
                            ...prev,
                            permissions: [...prev.permissions, permission],
                          }))
                        } else {
                          setRoleFormData((prev) => ({
                            ...prev,
                            permissions: prev.permissions.filter((p) => p !== permission),
                          }))
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{permission.replace("_", " ")}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowRoleForm(false)}>
                Cancel
              </Button>
              <Button type="submit">{editingRole ? "Update Role" : "Create Role"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Job Title Form Dialog */}
      <Dialog open={showJobTitleForm} onOpenChange={setShowJobTitleForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingJobTitle ? "Edit Job Title" : "Create Job Title"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleJobTitleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="jobTitleName">Job Title</Label>
              <Input
                id="jobTitleName"
                value={jobTitleFormData.name}
                onChange={(e) => setJobTitleFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Cashier, Server, Kitchen Staff"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jobTitleDescription">Description</Label>
              <Textarea
                id="jobTitleDescription"
                value={jobTitleFormData.description}
                onChange={(e) => setJobTitleFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the job responsibilities"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={jobTitleFormData.department}
                onChange={(e) => setJobTitleFormData((prev) => ({ ...prev, department: e.target.value }))}
                placeholder="e.g., Front of House, Kitchen, Management"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="level">Level</Label>
              <select
                id="level"
                value={jobTitleFormData.level}
                onChange={(e) => setJobTitleFormData((prev) => ({ ...prev, level: e.target.value as any }))}
                className="w-full p-2 border rounded-md"
              >
                <option value="entry">Entry Level</option>
                <option value="mid">Mid Level</option>
                <option value="senior">Senior Level</option>
                <option value="management">Management</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowJobTitleForm(false)}>
                Cancel
              </Button>
              <Button type="submit">{editingJobTitle ? "Update Job Title" : "Create Job Title"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialogs */}
      <AlertDialog open={!!roleToDelete} onOpenChange={() => setRoleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the role "{roleToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => roleToDelete && handleDeleteRole(roleToDelete)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!jobTitleToDelete} onOpenChange={() => setJobTitleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Job Title</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the job title "{jobTitleToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => jobTitleToDelete && handleDeleteJobTitle(jobTitleToDelete)}
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
