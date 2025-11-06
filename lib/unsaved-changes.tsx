"use client"

import type React from "react"

import { createContext, useContext, useState, useCallback } from "react"
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

interface UnsavedChangesContextType {
  hasUnsavedChanges: boolean
  setHasUnsavedChanges: (hasChanges: boolean) => void
  showUnsavedWarning: (onConfirm: () => void) => void
}

const UnsavedChangesContext = createContext<UnsavedChangesContextType | undefined>(undefined)

export function UnsavedChangesProvider({ children }: { children: React.ReactNode }) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showWarning, setShowWarning] = useState(false)
  const [onConfirmCallback, setOnConfirmCallback] = useState<(() => void) | null>(null)

  const showUnsavedWarning = useCallback(
    (onConfirm: () => void) => {
      if (hasUnsavedChanges) {
        setOnConfirmCallback(() => onConfirm)
        setShowWarning(true)
      } else {
        onConfirm()
      }
    },
    [hasUnsavedChanges],
  )

  const handleConfirm = () => {
    setHasUnsavedChanges(false)
    setShowWarning(false)
    if (onConfirmCallback) {
      onConfirmCallback()
      setOnConfirmCallback(null)
    }
  }

  const handleCancel = () => {
    setShowWarning(false)
    setOnConfirmCallback(null)
  }

  return (
    <UnsavedChangesContext.Provider
      value={{
        hasUnsavedChanges,
        setHasUnsavedChanges,
        showUnsavedWarning,
      }}
    >
      {children}

      <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes that will be lost. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} className="bg-red-600 hover:bg-red-700">
              Continue Without Saving
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </UnsavedChangesContext.Provider>
  )
}

export function useUnsavedChanges() {
  const context = useContext(UnsavedChangesContext)
  if (context === undefined) {
    throw new Error("useUnsavedChanges must be used within an UnsavedChangesProvider")
  }
  return context
}
