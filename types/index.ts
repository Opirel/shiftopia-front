export interface User {
  id: string
  email: string
  name: string
  branchName: string
  franchiseKey?: string
  role: "user" | "master_admin" | "worker"
  createdAt: string
  managerId?: string
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
}

export interface Branch {
  id: string
  name: string
  ownerId: string
  franchiseId?: string
  settings: BranchSettings
  createdAt: string
}

export interface BranchSettings {
  id: string
  openingHours: {
    [key: string]: { start: string; end: string; isOpen: boolean }
  }
  weekStartDay: "sunday" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday"
  shiftTemplates: ShiftTemplate[]
  ratingCriteria: string[]
}

export interface ShiftTemplate {
  id: string
  name: string
  startTime: string
  endTime: string
  requiredWorkers: number
  priority: number,
  //todo rename
  settingsId :string
}

export interface Worker {
  id: string
  branchId: string
  name: string
  email: string
  role: string
  ratings: { [criteria: string]: number }
  availability: {
    [day: string]: { start: string; end: string; available: boolean }
  }
  createdAt: string
}

export interface Schedule {
  id: string
  branchId: string
  weekStartDate: string
  shifts: ScheduledShift[]
  createdAt: string
  archived?: boolean
}

export interface ScheduledShift {
  id: string
  templateId: string
  date: string
  startTime: string
  endTime: string
  assignedWorkers: string[]
}

export interface Franchise {
  id: string
  name: string
  key: string
  createdAt: string
  createdBy: string
  isActive: boolean
  branches: Branch[]
}

export interface WorkerAvailabilitySubmission {
  id: string
  workerId: string
  managerId: string
  weekStartDate: string
  availability: {
    [day: string]: { shifts: string[]; available: boolean }
  }
  submittedAt: string
  status: "pending" | "approved" | "rejected"
}

export interface ShiftSwitchRequest {
  id: string
  requesterId: string
  requesterShiftId: string
  targetWorkerId: string
  targetShiftId: string
  scheduleId: string
  reason: string
  status: "pending" | "approved" | "rejected" | "cancelled"
  requestedAt: string
  respondedAt?: string
  managerApprovedAt?: string
  managerId: string
}

export interface WorkerRestriction {
  id: string
  branchId: string
  worker1Id: string
  worker2Id: string
  reason: string
  createdAt: string
  createdBy: string
}
