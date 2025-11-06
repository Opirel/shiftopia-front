"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/lib/auth"
import { useTranslation } from "@/lib/i18n"
import { GlobalHeader } from "@/components/ui/global-header"

export function WorkerSignupForm({ onBack }: { onBack: () => void }) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    workerKey: "",
  })
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { signupWorker } = useAuth()
  const { t } = useTranslation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters")
      setIsLoading(false)
      return
    }

    const success = await signupWorker(formData.email, formData.password, formData.name, formData.workerKey)

    if (!success) {
      setError("Invalid worker key or email already exists")
    }

    setIsLoading(false)
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      <div className="flex justify-end">
        <GlobalHeader />
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>{t("auth.worker_account_signup")}</CardTitle>
          <CardDescription>{t("auth.worker_signup_description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="worker-key">{t("auth.worker_key")}</Label>
              <Input
                id="worker-key"
                type="text"
                placeholder={t("auth.enter_worker_key")}
                value={formData.workerKey}
                onChange={(e) => setFormData({ ...formData, workerKey: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">{t("auth.full_name")}</Label>
              <Input
                id="name"
                type="text"
                placeholder={t("auth.enter_full_name")}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t("auth.enter_email")}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Input
                id="password"
                type="password"
                placeholder={t("auth.create_password")}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">{t("auth.confirm_password")}</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder={t("auth.confirm_password_placeholder")}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onBack} className="flex-1 bg-transparent">
                {t("auth.back")}
              </Button>
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? t("auth.creating_account") : t("auth.create_worker_account")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
