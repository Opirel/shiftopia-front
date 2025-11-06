import { useSettings } from "./settings"

export function useDateTimeFormatting() {
  const { globalSettings } = useSettings()

  const formatDate = (date: Date | string): string => {
    const dateObj = typeof date === "string" ? new Date(date) : date

    switch (globalSettings.dateFormat) {
      case "MM/DD/YYYY":
        return dateObj.toLocaleDateString("en-US", {
          month: "2-digit",
          day: "2-digit",
          year: "numeric",
        })
      case "DD/MM/YYYY":
        return dateObj.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      case "YYYY-MM-DD":
        return dateObj.toLocaleDateString("sv-SE")
      default:
        return dateObj.toLocaleDateString()
    }
  }

  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(":")
    const date = new Date()
    date.setHours(Number.parseInt(hours), Number.parseInt(minutes))

    if (globalSettings.timeFormat === "12h") {
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    } else {
      return `${hours}:${minutes}`
    }
  }

  const formatDateTime = (date: Date | string): string => {
    const dateObj = typeof date === "string" ? new Date(date) : date
    return `${formatDate(dateObj)} ${formatTime(dateObj.toTimeString().slice(0, 5))}`
  }

  return { formatDate, formatTime, formatDateTime }
}

// Non-hook versions for use outside components
export function formatDateWithSettings(date: Date | string, dateFormat: string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date

  switch (dateFormat) {
    case "MM/DD/YYYY":
      return dateObj.toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      })
    case "DD/MM/YYYY":
      return dateObj.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    case "YYYY-MM-DD":
      return dateObj.toLocaleDateString("sv-SE")
    default:
      return dateObj.toLocaleDateString()
  }
}

export function formatTimeWithSettings(time: string, timeFormat: string): string {
  const [hours, minutes] = time.split(":")
  const date = new Date()
  date.setHours(Number.parseInt(hours), Number.parseInt(minutes))

  if (timeFormat === "12h") {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  } else {
    return `${hours}:${minutes}`
  }
}

export function formatDate(date: Date | string, dateFormat = "MM/DD/YYYY"): string {
  const dateObj = typeof date === "string" ? new Date(date) : date

  switch (dateFormat) {
    case "MM/DD/YYYY":
      return dateObj.toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      })
    case "DD/MM/YYYY":
      return dateObj.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    case "YYYY-MM-DD":
      return dateObj.toLocaleDateString("sv-SE")
    default:
      return dateObj.toLocaleDateString()
  }
}

export function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day
  return new Date(d.setDate(diff))
}

export function getWeekEnd(date: Date): Date {
  const weekStart = getWeekStart(date)
  return new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000)
}

export function isToday(date: Date): boolean {
  const today = new Date()
  return date.toDateString() === today.toDateString()
}

export function isSameWeek(date1: Date, date2: Date): boolean {
  const week1Start = getWeekStart(date1)
  const week2Start = getWeekStart(date2)
  return week1Start.getTime() === week2Start.getTime()
}
