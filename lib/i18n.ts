"use client"

import { useSettings } from "./settings"
import { useMemo } from "react"

export const translations = {
  en: {
    // ... existing translations ...

    // Authentication
    "auth.sign_in": "Sign In",
    "auth.credentials_description": "Enter your credentials to access your account",
    "auth.email": "Email",
    "auth.enter_email": "Enter your email",
    "auth.password": "Password",
    "auth.enter_password": "Enter your password",
    "auth.signing_in": "Signing in...",
    "auth.dont_have_account": "Don't have an account? Sign up",
    "auth.have_worker_key": "Have a worker key? Join here",
    "auth.create_account": "Create Account",
    "auth.setup_account_description": "Set up your Smart Scheduler account",
    "auth.full_name": "Full Name",
    "auth.enter_full_name": "Enter your full name",
    "auth.branch_name": "Branch Name",
    "auth.enter_branch_name": "Enter your branch name",
    "auth.franchise_key": "Franchise Key",
    "auth.enter_franchise_key": "Enter your franchise key",
    "auth.franchise_key_help": "Contact your franchise administrator for this key",
    "auth.create_password": "Create password",
    "auth.confirm_password": "Confirm Password",
    "auth.confirm_password_placeholder": "Confirm your password",
    "auth.creating_account": "Creating account...",
    "auth.already_have_account": "Already have an account? Sign in",
    "auth.worker_account_signup": "Worker Account Signup",
    "auth.worker_signup_description": "Create your worker account using your worker key",
    "auth.worker_key": "Worker Key",
    "auth.enter_worker_key": "Enter your worker key",
    "auth.create_worker_account": "Create Worker Account",
    "auth.back": "Back",

    // Navigation
    "nav.overview": "Overview",
    "nav.settings": "Settings",
    "nav.workers": "Workers",
    "nav.worker_keys": "Worker Keys",
    "nav.availability_approvals": "Availability Approvals",
    "nav.manager_availability": "My Availability",
    "nav.schedules": "Schedules",
    "nav.franchise": "Franchise",
    "nav.test_mode": "Test Mode",
    "nav.insights": "Insights",
    "nav.time_off_approvals": "Time Off Requests",
    "nav.shift_switches": "Shift Switches",

    // Dashboard
    "dashboard.title": "Smart Scheduler",
    "dashboard.welcome": "Welcome to Smart Scheduler",
    "dashboard.overview": "Overview",
    "dashboard.quick_actions": "Quick Actions",
    "dashboard.recent_activity": "Recent Activity",

    // Worker Dashboard
    "worker.dashboard_title": "Worker Dashboard",
    "worker.welcome_back": "Welcome back",
    "worker.upcoming_shifts": "Upcoming Shifts",
    "worker.pending_requests": "Pending Requests",
    "worker.approved_requests": "Approved Requests",
    "worker.submit_availability": "Submit Availability",
    "worker.submit_availability_desc": "Let your manager know when you're available to work",
    "worker.submit_new_availability": "Submit New Availability",
    "worker.view_schedules": "View Schedules",
    "worker.view_schedules_desc": "Check your upcoming shifts and schedule",
    "worker.view_all_schedules": "View All Schedules",
    "worker.request_time_off": "Request Time Off",
    "worker.request_time_off_desc": "Request days off for vacation or personal time",
    "worker.request_new_time_off": "Request Time Off",
    "worker.switch_shifts": "Switch Shifts",
    "worker.switch_shifts_desc": "Request to switch shifts with other workers",
    "worker.request_shift_switch": "Request Shift Switch",
    "worker.my_schedules": "My Schedules",
    "worker.upcoming_shifts_desc": "Your scheduled shifts for the coming weeks",
    "worker.availability_status": "Availability Status",
    "worker.track_submissions": "Track your availability submissions and approvals",
    "worker.no_submissions": "No availability submissions yet",
    "worker.select_week": "Select Week",
    "worker.my_schedule": "My Schedule",
    "worker.full_schedule": "Full Schedule",
    "worker.full_schedule_view": "Full Schedule View",
    "worker.week_of": "Week of",
    "worker.no_schedule_for_week": "No schedule found for this week",
    "worker.select_different_week": "Try selecting a different week",
    "worker.time_shift": "Time/Shift",
    "worker.no_assignment": "No assignment",
    "worker.no_schedules_assigned": "No schedules assigned",
    "worker.submit_availability_first": "Submit your availability to get scheduled",
    "worker.view_time_off": "View Time Off",

    // Quick Actions
    "quick_actions.generate_schedule": "Generate Schedule",
    "quick_actions.generate_schedule_desc": "Create new schedules based on availability",
    "quick_actions.add_worker": "Add Worker",
    "quick_actions.add_worker_desc": "Generate worker keys and manage staff",
    "quick_actions.view_reports": "View Reports",
    "quick_actions.view_reports_desc": "Analyze performance and scheduling data",
    "quick_actions.create_franchise": "Create Franchise",
    "quick_actions.create_franchise_desc": "Set up new franchise locations",
    "quick_actions.title": "Quick Actions",
    "quick_actions.description": "Common tasks and shortcuts",

    // System Status
    "system_status.online": "Online",
    "system_status.offline": "Offline",
    "system_status.checking": "Checking",
    "system_status.title": "System Status",
    "system_status.description": "Current system health and connectivity",
    "system_status.database": "Database",
    "system_status.data_sync": "Data Sync",
    "system_status.last_backup": "Last Backup",
    "system_status.never": "Never",

    // Toast Messages
    "toast.schedule_generation_started": "Schedule generation started",
    "toast.worker_key_generated": "Worker key generated successfully",
    "toast.reports_opened": "Reports opened",
    "toast.franchise_creation_started": "Franchise creation started",

    // Disabled Account
    "disabled_account.contact_admin": "Contact your administrator",
    "disabled_account.account_disabled": "Account Disabled",
    "disabled_account.account_disabled_desc": "Your account has been disabled.",
    "disabled_account.reactivate_message": "Please contact your administrator to reactivate your account.",
    "disabled_account.dismiss": "Dismiss",

    // Settings
    "settings.title": "Settings",
    "settings.description": "Configure your Smart Scheduler preferences",
    "settings.general": "General",
    "settings.global": "Global Settings",
    "settings.shift_templates": "Shift Templates",
    "settings.rating_criteria": "Rating Criteria",
    "settings.scheduling": "Scheduling Preferences",
    "settings.roles": "Roles & Job Titles",
    "settings.worker_restrictions": "Worker Restrictions",

    // Branch Settings
    "branch.information": "Branch Information",
    "branch.information_desc": "Basic information about your branch",
    "branch.name": "Branch Name",
    "branch.id": "Branch ID",
    "branch.address": "Address",
    "branch.synced_with_franchise": "Synced with Franchise",
    "branch.opening_hours": "Opening Hours",
    "branch.opening_hours_desc": "Set your branch operating hours",
    "branch.rating_criteria": "Rating Criteria",
    "branch.rating_criteria_desc": "Criteria used for worker performance ratings",
    "branch.schedule_settings": "Schedule Settings",
    "branch.schedule_settings_desc": "Configure how schedules are generated",

    // Days of the week
    "days.sunday": "Sunday",
    "days.monday": "Monday",
    "days.tuesday": "Tuesday",
    "days.wednesday": "Wednesday",
    "days.thursday": "Thursday",
    "days.friday": "Friday",
    "days.saturday": "Saturday",

    // Worker Form
    "worker_form.personal_info": "Personal Information",
    "worker_form.personal_info_desc": "Basic worker details and contact information",
    "worker_form.full_name": "Full Name",
    "worker_form.email": "Email",
    "worker_form.role": "Role",
    "worker_form.job_title": "Job Title",
    "worker_form.select_job_title": "Select job title",
    "worker_form.skill_ratings": "Skill Ratings",
    "worker_form.skill_ratings_desc": "Rate worker skills and competencies",
    "worker_form.not_rated": "Not rated",
    "worker_form.customer_service": "Customer Service",
    "worker_form.technical_skills": "Technical Skills",
    "worker_form.teamwork": "Teamwork",
    "worker_form.reliability": "Reliability",
    "worker_form.leadership": "Leadership",

    // Time Off
    "time_off.title": "Time Off Requests",
    "time_off.manage_requests": "Manage worker time-off requests",
    "time_off.single_day": "Single Day",
    "time_off.date_range": "Date Range",
    "time_off.select_date": "Select Date",
    "time_off.start_date": "Start Date",
    "time_off.end_date": "End Date",
    "time_off.enter_reason": "Enter reason for time off (optional)",
    "time_off.request_submitted": "Time off request submitted successfully",
    "time_off.request_time_off": "Request Time Off",
    "time_off.select_dates": "Select Dates",
    "time_off.reason": "Reason",
    "time_off.reason_placeholder": "Enter reason for time off",
    "time_off.submit_request": "Submit Request",
    "time_off.pending_requests": "Pending Requests",
    "time_off.approved_requests": "Approved Requests",
    "time_off.rejected_requests": "Rejected Requests",
    "time_off.approve": "Approve",
    "time_off.reject": "Reject",
    "time_off.status_pending": "Pending",
    "time_off.status_approved": "Approved",
    "time_off.status_rejected": "Rejected",

    // Availability
    "availability.select_week": "Select Week",
    "availability.submit_availability": "Submit Availability",
    "availability.available": "Available",
    "availability.not_available": "Not Available",
    review_worker_availability: "Review worker availability submissions",

    // Worker Restrictions
    "worker_restrictions.title": "Worker Restrictions",
    "worker_restrictions.description": "Manage workers who cannot be scheduled together",
    "worker_restrictions.worker_1": "Worker 1",
    "worker_restrictions.worker_2": "Worker 2",
    "worker_restrictions.select_worker": "Select worker",
    "worker_restrictions.reason": "Reason",
    "worker_restrictions.reason_placeholder": "Enter reason for restriction",
    "worker_restrictions.add_restriction": "Add Restriction",
    "worker_restrictions.current_restrictions": "Current Restrictions",
    "worker_restrictions.same_worker_error": "Cannot restrict a worker from working with themselves",
    "worker_restrictions.already_exists": "This restriction already exists",
    "worker_restrictions.unknown_worker": "Unknown Worker",

    // Common
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.add": "Add",
    "common.remove": "Remove",
    "common.close": "Close",
    "common.submit": "Submit",
    "common.loading": "Loading...",
    "common.error": "Error",
    "common.success": "Success",
    "common.warning": "Warning",
    "common.info": "Info",
  },
}

export function useTranslation() {
  const { globalSettings, loading } = useSettings()

  const t = useMemo(() => {
    return (key: string): string => {
      const translation = translations.en[key as keyof typeof translations.en]
      if (!translation) {
        console.warn(`Translation key "${key}" not found`)
        return key // Only return key if translation truly doesn't exist
      }

      return translation
    }
  }, []) // Removed loading dependency since we always use English

  return { t, language: "en", loading: false } // Always return loading as false since we use static English
}
