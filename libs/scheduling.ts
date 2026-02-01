/**
 * Scheduling utilities for calculating next run times
 */

export type ScheduleType = "daily" | "weekly" | "monthly";

export interface ScheduledReport {
  id: string;
  client_id: string;
  trainer_id: string;
  schedule_type: ScheduleType;
  day_of_week: number | null;
  day_of_month: number | null;
  time_of_day: string;
  report_parameters: {
    start_date_offset: number;
    end_date_offset: number;
    min_reps: number;
    max_reps: number;
  };
  last_run_at: string | null;
  next_run_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Calculate the next run time for a scheduled report
 *
 * @param scheduleType - daily, weekly, or monthly
 * @param timeOfDay - Time in HH:MM format (24-hour)
 * @param dayOfWeek - Day of week (0=Sunday, 1=Monday, etc.) for weekly schedules
 * @param dayOfMonth - Day of month (1-31) for monthly schedules
 * @param fromDate - Calculate from this date (default: now)
 * @returns Next run date
 */
export function calculateNextRun(
  scheduleType: ScheduleType,
  timeOfDay: string,
  dayOfWeek?: number | null,
  dayOfMonth?: number | null,
  fromDate: Date = new Date()
): Date {
  const [hours, minutes] = timeOfDay.split(":").map(Number);

  // Start with today at the specified time
  const next = new Date(fromDate);
  next.setHours(hours, minutes, 0, 0);

  switch (scheduleType) {
    case "daily":
      // If the time has already passed today, move to tomorrow
      if (next <= fromDate) {
        next.setDate(next.getDate() + 1);
      }
      break;

    case "weekly":
      if (dayOfWeek === null || dayOfWeek === undefined) {
        throw new Error("dayOfWeek is required for weekly schedules");
      }

      // Find the next occurrence of the specified day
      const currentDay = next.getDay();
      let daysUntilTarget = dayOfWeek - currentDay;

      if (daysUntilTarget < 0) {
        daysUntilTarget += 7;
      } else if (daysUntilTarget === 0 && next <= fromDate) {
        // Same day but time passed, move to next week
        daysUntilTarget = 7;
      }

      next.setDate(next.getDate() + daysUntilTarget);
      break;

    case "monthly":
      if (dayOfMonth === null || dayOfMonth === undefined) {
        throw new Error("dayOfMonth is required for monthly schedules");
      }

      // Set to the specified day of the month
      next.setDate(dayOfMonth);

      // If the date has passed this month, move to next month
      if (next <= fromDate) {
        next.setMonth(next.getMonth() + 1);
      }

      // Handle months with fewer days (e.g., Feb 30 -> Feb 28)
      const daysInMonth = new Date(
        next.getFullYear(),
        next.getMonth() + 1,
        0
      ).getDate();

      if (dayOfMonth > daysInMonth) {
        next.setDate(daysInMonth);
      }
      break;
  }

  return next;
}

/**
 * Get a human-readable description of a schedule
 *
 * @param schedule - The scheduled report
 * @returns Description string
 */
export function getScheduleDescription(schedule: ScheduledReport): string {
  const time = formatTime(schedule.time_of_day);

  switch (schedule.schedule_type) {
    case "daily":
      return `Daily at ${time}`;

    case "weekly":
      const dayName = getDayName(schedule.day_of_week || 0);
      return `Every ${dayName} at ${time}`;

    case "monthly":
      const dayOfMonth = schedule.day_of_month || 1;
      const suffix = getOrdinalSuffix(dayOfMonth);
      return `Monthly on the ${dayOfMonth}${suffix} at ${time}`;

    default:
      return "Unknown schedule";
  }
}

/**
 * Format time for display (HH:MM -> h:MM AM/PM)
 */
function formatTime(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}

/**
 * Get day name from day number
 */
function getDayName(day: number): string {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return days[day] || "Unknown";
}

/**
 * Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
 */
function getOrdinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

/**
 * Check if a scheduled report is due to run
 *
 * @param schedule - The scheduled report
 * @param now - Current time (default: now)
 * @returns true if the schedule should run
 */
export function isScheduleDue(
  schedule: ScheduledReport,
  now: Date = new Date()
): boolean {
  if (!schedule.is_active) return false;
  const nextRun = new Date(schedule.next_run_at);
  return nextRun <= now;
}

/**
 * Get report date range based on schedule parameters
 *
 * @param params - Report parameters from schedule
 * @param now - Current time (default: now)
 * @returns Start and end dates for the report
 */
export function getReportDateRange(
  params: ScheduledReport["report_parameters"],
  now: Date = new Date()
): { startDate: Date; endDate: Date } {
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() - params.end_date_offset);
  endDate.setHours(23, 59, 59, 999);

  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - params.start_date_offset);
  startDate.setHours(0, 0, 0, 0);

  return { startDate, endDate };
}
