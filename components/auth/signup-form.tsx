"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "@/lib/i18n"
import { GlobalHeader } from "@/components/ui/global-header"

interface SignupFormProps {
  onSwitchToLogin: () => void
}

export function SignupForm({ onSwitchToLogin }: SignupFormProps) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    branchName: "",
    franchiseKey: "", // Remove default empty string to make validation clearer
  })
  const [isLoading, setIsLoading] = useState(false)
  const { signup } = useAuth()
  const { toast } = useToast()
  const { t } = useTranslation()

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "Passwords do not match. Please try again.",
       variant: "default",
      })
      return
    }

    if (!formData.franchiseKey.trim()) {
      toast({
        title: "Franchise key required",
        description: "Please enter a valid franchise key to create your account.",
       variant: "default",
      })
      return
    }

    setIsLoading(true)

    const success = await signup(
      formData.email,
      formData.password,
      formData.name,
      formData.branchName,
      formData.franchiseKey, // No longer optional
    )

    if (success) {
      toast({
        title: "Account created!",
        description: "Welcome to Smart Scheduler. You're now logged in.",
      })
    } else {
      toast({
        title: "Signup failed",
        description: "Invalid franchise key or email already exists. Please try again.",
       variant: "default",
      })
    }

    setIsLoading(false)
  }

  return (
    <div className="w-full max-w-md space-y-4">
      <div className="flex justify-end">
        <GlobalHeader />
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>{t("auth.create_account")}</CardTitle>
          <CardDescription>{t("auth.setup_account_description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("auth.full_name")}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                required
                placeholder={t("auth.enter_full_name")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                required
                placeholder={t("auth.enter_email")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branchName">{t("auth.branch_name")}</Label>
              <Input
                id="branchName"
                value={formData.branchName}
                onChange={(e) => handleChange("branchName", e.target.value)}
                required
                placeholder={t("auth.enter_branch_name")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="franchiseKey">{t("auth.franchise_key")} *</Label>
              <Input
                id="franchiseKey"
                value={formData.franchiseKey}
                onChange={(e) => handleChange("franchiseKey", e.target.value)}
                required
                placeholder={t("auth.enter_franchise_key")}
              />
              <p className="text-xs text-muted-foreground">{t("auth.franchise_key_help")}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleChange("password", e.target.value)}
                required
                placeholder={t("auth.create_password")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t("auth.confirm_password")}</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => handleChange("confirmPassword", e.target.value)}
                required
                placeholder={t("auth.confirm_password_placeholder")}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? t("auth.creating_account") : t("auth.create_account")}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <Button variant="link" onClick={onSwitchToLogin}>
              {t("auth.already_have_account")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
