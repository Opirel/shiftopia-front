"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useWorkers } from "@/lib/workers"
import { useBranch } from "@/lib/branch"
import { useToast } from "@/hooks/use-toast"
import type { Worker } from "@/types"
import { useTranslation } from "@/lib/i18n"

interface WorkerFormProps {
  worker?: Worker
  onSuccess: () => void
  onCancel: () => void
}

export function WorkerForm({ worker, onSuccess, onCancel }: WorkerFormProps) {
  const { addWorker, updateWorker } = useWorkers()
  const { currentBranch } = useBranch()
  const { toast } = useToast()
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)

  const roles = currentBranch?.settings?.roles || []
  const jobTitles = currentBranch?.settings?.jobTitles || []

  const [formData, setFormData] = useState({
    name: worker?.name || "",
    email: worker?.email || "",
    role: worker?.role || "",
    jobTitle: worker?.jobTitle || "",
    ratings: worker?.ratings || {},
  })

  const [customJobTitle, setCustomJobTitle] = useState("")
  const [showCustomJobTitle, setShowCustomJobTitle] = useState(
    worker?.jobTitle && !jobTitles.some((jt) => jt.name === worker.jobTitle),
  )

  if (!currentBranch) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">{t("worker_form.no_branch_data")}</p>
        </CardContent>
      </Card>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const finalJobTitle = showCustomJobTitle ? customJobTitle : formData.jobTitle
      const workerData = { ...formData, jobTitle: finalJobTitle }

      if (worker) {
        await updateWorker(worker.id, workerData)
        toast({
          title: t("worker_form.worker_updated"),
          description: t("worker_form.worker_updated_desc"),
        })
      } else {
        await addWorker(workerData)
        toast({
          title: t("worker_form.worker_added"),
          description: t("worker_form.worker_added_desc"),
        })
      }
      onSuccess()
    } catch (error) {
      toast({
        title: t("worker_form.error"),
        description: t("worker_form.save_error"),
       variant: "default",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRatingChange = (criteria: string, rating: number) => {
    setFormData((prev) => ({
      ...prev,
      ratings: { ...prev.ratings, [criteria]: rating },
    }))
  }

  const handleJobTitleChange = (value: string) => {
    if (value === "custom") {
      setShowCustomJobTitle(true)
      setFormData((prev) => ({ ...prev, jobTitle: "" }))
    } else {
      setShowCustomJobTitle(false)
      setFormData((prev) => ({ ...prev, jobTitle: value }))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("worker_form.personal_info")}</CardTitle>
          <CardDescription>{t("worker_form.personal_info_desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("worker_form.full_name")}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                required
                placeholder={t("worker_form.enter_full_name")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t("worker_form.email")}</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                required
                placeholder={t("worker_form.enter_email")}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="role">{t("worker_form.role")}</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, role: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("worker_form.select_role")} />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.name}>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${role.color}`} />
                        {role.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="jobTitle">Job Title</Label>
              <Select value={showCustomJobTitle ? "custom" : formData.jobTitle} onValueChange={handleJobTitleChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select job title" />
                </SelectTrigger>
                <SelectContent>
                  {jobTitles.map((jobTitle) => (
                    <SelectItem key={jobTitle.id} value={jobTitle.name}>
                      <div className="flex items-center justify-between w-full">
                        <span>{jobTitle.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{jobTitle.department}</span>
                      </div>
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Create Custom Title</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {showCustomJobTitle && (
            <div className="space-y-2">
              <Label htmlFor="customJobTitle">Custom Job Title</Label>
              <Input
                id="customJobTitle"
                value={customJobTitle}
                onChange={(e) => setCustomJobTitle(e.target.value)}
                placeholder="Enter custom job title"
                required
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("worker_form.skill_ratings")}</CardTitle>
          <CardDescription>{t("worker_form.skill_ratings_desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentBranch.settings.ratingCriteria.map((criteria) => (
            <div key={criteria} className="flex items-center justify-between">
              <Label className="text-sm font-medium">{criteria}</Label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => handleRatingChange(criteria, rating)}
                    className={`w-6 h-6 ${
                      (formData.ratings[criteria] || 0) >= rating ? "text-yellow-400 fill-current" : "text-gray-300"
                    } hover:text-yellow-400 transition-colors`}
                  >
                    <svg viewBox="0 0 20 20" className="w-full h-full">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </button>
                ))}
                <span className="ml-2 text-sm text-gray-600">
                  {formData.ratings[criteria] ? `${formData.ratings[criteria]}/5` : t("worker_form.not_rated")}
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("worker_form.cancel")}
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? t("worker_form.saving") : worker ? t("worker_form.update_worker") : t("worker_form.add_worker")}
        </Button>
      </div>
    </form>
  )
}
