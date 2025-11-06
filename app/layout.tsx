import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"
import { AuthProvider } from "@/lib/auth"
import { BranchProvider } from "@/lib/branch"
import { WorkerProvider } from "@/lib/workers"
// Added ScheduleProvider to layout
import { ScheduleProvider } from "@/lib/schedules"
import { SettingsProvider } from "@/lib/settings"
import { UnsavedChangesProvider } from "@/lib/unsaved-changes"
import { Toaster } from "@/components/ui/toaster"

export const metadata: Metadata = {
  title: "Smart Scheduler",
  description: "Intelligent employee scheduling solution",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body>
        <AuthProvider>
          <BranchProvider>
            <SettingsProvider>
              <WorkerProvider>
                <ScheduleProvider>
                  <UnsavedChangesProvider>
                    {children}
                    <Toaster />
                  </UnsavedChangesProvider>
                </ScheduleProvider>
              </WorkerProvider>
            </SettingsProvider>
          </BranchProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
