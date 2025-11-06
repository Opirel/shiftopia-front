"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth"
import { useTranslation } from "@/lib/i18n"
import { RefreshCw, Calendar, Clock, User } from "lucide-react"
import type { Schedule } from "@/types"

interface ShiftSwitchingModalProps {
  onClose: () => void
  onSwitch: (shiftId: string, newWorkerId: string) => void
  schedules: Schedule[]
  allWorkers: any[]
}

export function ShiftSwitchingModal({ onClose, onSwitch, schedules, allWorkers }: ShiftSwitchingModalProps) {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [selectedShift, setSelectedShift] = useState<any>(null)
  const [selectedWorker, setSelectedWorker] = useState<string>("")

  // Get upcoming shifts for the current worker
  const upcomingShifts = schedules
    .flatMap((schedule) =>
      schedule.shifts.filter(
        (shift) => shift.assignedWorkers.includes(user?.id || "") && new Date(shift.date) >= new Date(),
      ),
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const handleSwitchRequest = () => {
    if (selectedShift && selectedWorker) {
      onSwitch(selectedShift.id, selectedWorker)
      onClose()
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            {t("worker.switch_shifts")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step 1: Select Shift to Switch */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">
              {t("worker.select_shift_to_switch")}
            </h3>
            {upcomingShifts.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">{t("worker.no_upcoming_shifts")}</p>
              </div>
            ) : (
              <div className="grid gap-3 max-h-60 overflow-y-auto">
                {upcomingShifts.map((shift) => {
                  const shiftDate = new Date(shift.date)
                  const dayName = shiftDate.toLocaleDateString("en-US", { weekday: "long" })
                  const isSelected = selectedShift?.id === shift.id

                  return (
                    <Card
                      key={shift.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        isSelected
                          ? "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : "hover:bg-gray-50 dark:hover:bg-gray-700"
                      }`}
                      onClick={() => setSelectedShift(shift)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{shiftDate.getDate()}</p>
                            <p className="text-xs text-gray-500 uppercase">{dayName.slice(0, 3)}</p>
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-800 dark:text-gray-200">
                              {shift.templateName || "Shift"}
                            </p>
                            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {shift.startTime} - {shift.endTime}
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {shiftDate.toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          {isSelected && <Badge className="bg-blue-500 text-white">{t("common.selected")}</Badge>}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>

          {/* Step 2: Select Worker to Switch With */}
          {selectedShift && (
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">
                {t("worker.select_worker_to_switch_with")}
              </h3>
              <div className="grid gap-3 max-h-60 overflow-y-auto">
                {allWorkers
                  .filter((worker) => worker.id !== user?.id) // Exclude current user
                  .map((worker) => {
                    const isSelected = selectedWorker === worker.id

                    return (
                      <Card
                        key={worker.id}
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          isSelected
                            ? "ring-2 ring-green-500 bg-green-50 dark:bg-green-900/20"
                            : "hover:bg-gray-50 dark:hover:bg-gray-700"
                        }`}
                        onClick={() => setSelectedWorker(worker.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="p-2 bg-gray-100 dark:bg-gray-600 rounded-full">
                              <User className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-gray-800 dark:text-gray-200">{worker.name}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{worker.email}</p>
                              {worker.jobTitle && <p className="text-xs text-gray-500">{worker.jobTitle}</p>}
                            </div>
                            {isSelected && <Badge className="bg-green-500 text-white">{t("common.selected")}</Badge>}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="outline" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleSwitchRequest}
              disabled={!selectedShift || !selectedWorker}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              {t("worker.request_switch")}
            </Button>
          </div>

          {/* Summary */}
          {selectedShift && selectedWorker && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
              <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">{t("worker.switch_summary")}</h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {t("worker.requesting_to_switch")}{" "}
                <strong>
                  {selectedShift.templateName} on {new Date(selectedShift.date).toLocaleDateString()}
                </strong>{" "}
                {t("common.with")} <strong>{allWorkers.find((w) => w.id === selectedWorker)?.name}</strong>
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">{t("worker.switch_request_note")}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
