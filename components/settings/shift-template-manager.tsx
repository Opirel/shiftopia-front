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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useBranch } from "@/lib/branch"
import { useToast } from "@/hooks/use-toast"
import { formatTimeWithSettings } from "@/lib/date-utils"
import { useSettings } from "@/lib/settings"
import type { ShiftTemplate } from "@/types"
import { useAxois } from "@/lib/axois"

export function ShiftTemplateManager() {
  const { instance } = useAxois()
  const { currentBranch, updateBranchSettings } = useBranch()
  const { globalSettings } = useSettings()
  const { toast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ShiftTemplate | null>(null)
  const [templateToDelete, setTemplateToDelete] = useState<ShiftTemplate | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    startTime: "09:00",
    endTime: "17:00",
    requiredWorkers: 1,
    priority: 1,
    days: ["monday", "tuesday", "wednesday", "thursday", "friday"] as string[],
    jobTitleRequirements: {} as { [jobTitle: string]: number }, // Added job title requirements
  })

  //todo from db
  const commonJobTitles = [
    "Manager",
    "Assistant Manager",
    "Supervisor",
    "Team Lead",
    "Senior Staff",
    "Staff",
    "Cashier",
    "Sales Associate",
    "Customer Service",
    "Kitchen Staff",
    "Server",
    "Bartender",
    "Host/Hostess",
    "Cleaner",
    "Security",
  ]

  if (!currentBranch) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">No branch data available</p>
        </CardContent>
      </Card>
    )
  }

  const resetForm = () => {
    setFormData({
      name: "",
      startTime: "09:00",
      endTime: "17:00",
      requiredWorkers: 1,
      priority: 1,
      days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      jobTitleRequirements: {},
    })
    setEditingTemplate(null)
  }

  const handleEdit = (template: ShiftTemplate) => {
    setFormData({
      name: template.name,
      startTime: template.startTime,
      endTime: template.endTime,
      requiredWorkers: template.requiredWorkers,
      priority: template.priority,
      days: template.days || ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
      jobTitleRequirements: template.jobTitleRequirements || {}, // Load job title requirements
    })
    setEditingTemplate(template)
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast({
        title: "Invalid input",
        description: "Please enter a shift name.",
       variant: "default",
      })
      return
    }

    const templates = [...currentBranch.settings.shiftTemplates]

    if (editingTemplate) {
      // Update existing template
      const index = templates.findIndex((t) => t.id === editingTemplate.id)
      if (index >= 0) {
        templates[index] = { ...editingTemplate, ...formData }
      }
      await instance({id:editingTemplate.id}).put('/shifttemplate',formData);
    } else {
      // Add new template
      const newTemplate: ShiftTemplate = {
        id: crypto.randomUUID(),
        settingsId : currentBranch.settings.id,
        ...formData,
      }
      templates.push(newTemplate)
      await instance({}).post('/shifttemplate',newTemplate);
    }

    const success = await updateBranchSettings(currentBranch.id, {
      shiftTemplates: templates,
    })
    
    if (success) {
      toast({
        title: editingTemplate ? "Template updated" : "Template added",
        description: `Shift template "${formData.name}" has been ${editingTemplate ? "updated" : "added"}.`,
      })
      setShowForm(false)
      resetForm()
    } else {
      toast({
        title: "Error",
        description: "Failed to save shift template. Please try again.",
       variant: "default",
      })
    }
  }

  const handleDelete = async (template: ShiftTemplate) => {
    const templates = currentBranch.settings.shiftTemplates.filter((t) => t.id !== template.id)
    await instance({id:template.id}).delete('/shifttemplate');
    const success = await updateBranchSettings(currentBranch.id, {
      shiftTemplates: templates,
    })

    if (success) {
      toast({
        title: "Template deleted",
        description: `Shift template "${template.name}" has been deleted.`,
      })
    } else {
      toast({
        title: "Error",
        description: "Failed to delete shift template. Please try again.",
       variant: "default",
      })
    }
    setTemplateToDelete(null)
  }

  const dayOptions = [
    { value: "sunday", label: "Sunday" },
    { value: "monday", label: "Monday" },
    { value: "tuesday", label: "Tuesday" },
    { value: "wednesday", label: "Wednesday" },
    { value: "thursday", label: "Thursday" },
    { value: "friday", label: "Friday" },
    { value: "saturday", label: "Saturday" },
  ]

  const toggleDay = (day: string) => {
    setFormData((prev) => ({
      ...prev,
      days: prev.days.includes(day) ? prev.days.filter((d) => d !== day) : [...prev.days, day],
    }))
  }

  const addJobTitleRequirement = (jobTitle: string) => {
    setFormData((prev) => ({
      ...prev,
      jobTitleRequirements: {
        ...prev.jobTitleRequirements,
        [jobTitle]: 1,
      },
    }))
  }

  const updateJobTitleRequirement = (jobTitle: string, count: number) => {
    setFormData((prev) => ({
      ...prev,
      jobTitleRequirements: {
        ...prev.jobTitleRequirements,
        [jobTitle]: count,
      },
    }))
  }

  const removeJobTitleRequirement = (jobTitle: string) => {
    setFormData((prev) => {
      const newRequirements = { ...prev.jobTitleRequirements }
      delete newRequirements[jobTitle]
      return {
        ...prev,
        jobTitleRequirements: newRequirements,
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Shift Templates</h3>
          <p className="text-sm text-gray-600">Manage your shift templates for schedule generation</p>
        </div>
        <Button
          onClick={() => {
            resetForm()
            setShowForm(true)
          }}
        >
          Add Template
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {currentBranch.settings.shiftTemplates.map((template) => (
          <Card key={template.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-medium">{template.name}</h4>
                  <p className="text-sm text-gray-600">
                    {formatTimeWithSettings(template.startTime, globalSettings.timeFormat)} -{" "}
                    {formatTimeWithSettings(template.endTime, globalSettings.timeFormat)}
                  </p>
                </div>
                <Badge variant={template.priority > 1 ? "default" : "secondary"}>Priority {template.priority}</Badge>
              </div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-600">Required Workers:</span>
                <span className="font-medium">{template.requiredWorkers}</span>
              </div>
              <div className="mb-3">
                <span className="text-sm text-gray-600">Days:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(
                    template.days || ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
                  ).map((day) => (
                    <Badge key={day} variant="outline" className="text-xs">
                      {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                    </Badge>
                  ))}
                </div>
              </div>
              {template.jobTitleRequirements && Object.keys(template.jobTitleRequirements).length > 0 && (
                <div className="mb-3">
                  <span className="text-sm text-gray-600">Job Requirements:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Object.entries(template.jobTitleRequirements).map(([jobTitle, count]) => (
                      <Badge key={jobTitle} variant="secondary" className="text-xs">
                        {count}x {jobTitle}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleEdit(template)} className="flex-1">
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setTemplateToDelete(template)}
                  className="text-red-600 hover:text-red-700"
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ... existing empty state code ... */}
      {currentBranch.settings.shiftTemplates.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <div className="text-gray-400 mb-4">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">No shift templates</h4>
              <p className="text-gray-600 mb-4">Add shift templates to enable schedule generation.</p>
              <Button
                onClick={() => {
                  resetForm()
                  setShowForm(true)
                }}
              >
                Add Your First Template
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit Shift Template" : "Add Shift Template"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Shift Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Morning Shift, Evening Shift"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData((prev) => ({ ...prev, startTime: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData((prev) => ({ ...prev, endTime: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="requiredWorkers">Required Workers</Label>
                <Input
                  id="requiredWorkers"
                  type="number"
                  min="1"
                  max="20"
                  value={formData.requiredWorkers}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, requiredWorkers: Number.parseInt(e.target.value) }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority Level</Label>
                <Input
                  id="priority"
                  type="number"
                  min="1"
                  max="5"
                  value={formData.priority}
                  onChange={(e) => setFormData((prev) => ({ ...prev, priority: Number.parseInt(e.target.value) }))}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Active Days</Label>
              <p className="text-sm text-gray-600">Select which days this shift template applies to</p>
              <div className="grid grid-cols-4 gap-2">
                {dayOptions.map(({ value, label }) => (
                  <Button
                    key={value}
                    type="button"
                    variant={formData.days.includes(value) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleDay(value)}
                    className="justify-start"
                  >
                    {label}
                  </Button>
                ))}
              </div>
              {formData.days.length === 0 && <p className="text-sm text-red-600">Please select at least one day</p>}
            </div>

            <div className="space-y-2">
              <Label>Job Title Requirements</Label>
              <p className="text-sm text-gray-600">
                Specify how many workers of each job title are needed for this shift
              </p>

              {Object.keys(formData.jobTitleRequirements).length > 0 && (
                <div className="space-y-2 p-3 border rounded-lg">
                  {Object.entries(formData.jobTitleRequirements).map(([jobTitle, count]) => (
                    <div key={jobTitle} className="flex items-center gap-2">
                      <span className="flex-1 text-sm font-medium">{jobTitle}</span>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={count}
                        onChange={(e) => updateJobTitleRequirement(jobTitle, Number.parseInt(e.target.value))}
                        className="w-20"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeJobTitleRequirement(jobTitle)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Select onValueChange={addJobTitleRequirement}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Add job title requirement" />
                  </SelectTrigger>
                  <SelectContent>
                    {commonJobTitles
                      .filter((title) => !formData.jobTitleRequirements[title])
                      .map((title) => (
                        <SelectItem key={title} value={title}>
                          {title}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={formData.days.length === 0}>
                {editingTemplate ? "Update Template" : "Add Template"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ... existing delete dialog code ... */}
      <AlertDialog open={!!templateToDelete} onOpenChange={() => setTemplateToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Shift Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{templateToDelete?.name}"? This action cannot be undone and may affect
              existing schedules.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => templateToDelete && handleDelete(templateToDelete)}
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
