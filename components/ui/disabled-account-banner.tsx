"use client"

import { useAuth } from "@/lib/auth"
import { AlertTriangle, X } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "@/lib/i18n"

export function DisabledAccountBanner() {
  const { user, loginError } = useAuth()
  const { t } = useTranslation()
  const [isDismissed, setIsDismissed] = useState(false)

  // Show banner if user is disabled or there's a disabled account error
  const isDisabled = user?.isDisabled || loginError.includes("Account disabled")

  if (!isDisabled || isDismissed) {
    return null
  }

  const reason = user?.disabledReason || t("disabled_account.contact_admin")

  return (
    <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-red-400" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-800">{t("disabled_account.account_disabled")}</h3>
          <div className="mt-2 text-sm text-red-700">
            <p>
              {t("disabled_account.account_disabled_desc")} {reason}
            </p>
            <p className="mt-1 font-medium">{t("disabled_account.reactivate_message")}</p>
          </div>
        </div>
        <div className="ml-auto pl-3">
          <div className="-mx-1.5 -my-1.5">
            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="inline-flex rounded-md bg-red-50 p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-red-50"
            >
              <span className="sr-only">{t("disabled_account.dismiss")}</span>
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
