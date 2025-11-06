"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "@/lib/i18n"
import { GlobalHeader } from "@/components/ui/global-header"

interface LoginFormProps {
  onSwitchToSignup: () => void
  onSwitchToWorkerSignup: () => void
}

export function LoginForm({ onSwitchToSignup, onSwitchToWorkerSignup }: LoginFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { login, loginError } = useAuth()
  const { toast } = useToast()
  const { t } = useTranslation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const success = await login(email, password)

    if (success) {
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      })
    } else {
      toast({
        title: "Login failed",
        description: loginError || "Invalid email or password. Please try again.",
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
          <CardTitle>{t("auth.sign_in")}</CardTitle>
          <CardDescription>{t("auth.credentials_description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder={t("auth.enter_email")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder={t("auth.enter_password")}
              />
            </div>

            {loginError && (
              <Alert variant="destructive">
                <AlertDescription>{loginError}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? t("auth.signing_in") : t("auth.sign_in")}
            </Button>
          </form>
          <div className="mt-4 space-y-2 text-center">
            <Button variant="link" onClick={onSwitchToSignup}>
              {t("auth.dont_have_account")}
            </Button>
            <Button variant="link" onClick={onSwitchToWorkerSignup}>
              {t("auth.have_worker_key")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
