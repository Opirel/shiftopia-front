"use client"

import { AlertTriangle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface DisabledAccountMessageProps {
  reason: string
  onReturnToLogin: () => void
}

export function DisabledAccountMessage({ reason, onReturnToLogin }: DisabledAccountMessageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <CardTitle className="text-red-600">Account Disabled</CardTitle>
          <CardDescription>Your account has been temporarily disabled</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <p className="text-sm text-red-800">
              <strong>Reason:</strong> {reason}
            </p>
          </div>
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">Please contact your administrator for assistance.</p>
            <Button onClick={onReturnToLogin} variant="outline" className="w-full bg-transparent">
              Return to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
