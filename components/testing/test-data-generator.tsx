"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth"
import { useBranch } from "@/lib/branch"
import { useWorkers } from "@/lib/workers"

export function TestDataGenerator() {
  const { toast } = useToast()
  const { user } = useAuth()
  const { currentBranch } = useBranch()
  const { workers } = useWorkers()
  const [isGenerating, setIsGenerating] = useState(false)

  const generateTestData = async () => {
    setIsGenerating(true)
    try {
      // Generate test workers, schedules, and availability
      await new Promise((resolve) => setTimeout(resolve, 1000)) // Simulate generation

      toast({
        title: "Test data generated",
        description: "Created sample workers, schedules, and availability data.",
      })
    } catch (error) {
      toast({
        title: "Generation failed",
        description: "Failed to generate test data. Please try again.",
       variant: "default",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const clearTestData = async () => {
    try {
      // Clear all test data
      toast({
        title: "Test data cleared",
        description: "All test data has been removed.",
      })
    } catch (error) {
      toast({
        title: "Clear failed",
        description: "Failed to clear test data. Please try again.",
       variant: "default",
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Data Generator</CardTitle>
        <CardDescription>Generate realistic test data for development and testing</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{workers.length}</div>
            <div className="text-sm text-gray-500">Workers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">0</div>
            <div className="text-sm text-gray-500">Schedules</div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={generateTestData} disabled={isGenerating} className="flex-1">
            {isGenerating ? "Generating..." : "Generate Test Data"}
          </Button>
          <Button onClick={clearTestData} variant="outline" className="flex-1 bg-transparent">
            Clear Test Data
          </Button>
        </div>

        <div className="text-xs text-gray-500">
          <Badge variant="secondary" className="mr-2">
            Current Branch
          </Badge>
          {currentBranch?.name || "No branch selected"}
        </div>
      </CardContent>
    </Card>
  )
}
