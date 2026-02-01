"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

interface Schedule {
  id: string;
  schedule_type: "daily" | "weekly" | "monthly";
  day_of_week: number | null;
  day_of_month: number | null;
  time_of_day: string;
  report_parameters: {
    start_date_offset: number;
    min_reps: number;
    max_reps: number;
  };
  last_run_at: string | null;
  next_run_at: string;
  is_active: boolean;
  created_at: string;
  client?: {
    id: string;
    display_name: string;
  };
}

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSchedules = async () => {
    try {
      const response = await fetch("/api/scheduled-reports");
      if (!response.ok) throw new Error("Failed to fetch schedules");
      const data = await response.json();
      setSchedules(data.schedules || []);
    } catch (error) {
      console.error("Error fetching schedules:", error);
      toast.error("Failed to load schedules");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const toggleSchedule = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/scheduled-reports/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (!response.ok) throw new Error("Failed to update schedule");

      toast.success(isActive ? "Schedule paused" : "Schedule resumed");
      fetchSchedules();
    } catch (error) {
      console.error("Error toggling schedule:", error);
      toast.error("Failed to update schedule");
    }
  };

  const deleteSchedule = async (id: string) => {
    if (!confirm("Are you sure you want to delete this schedule?")) return;

    try {
      const response = await fetch(`/api/scheduled-reports/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete schedule");

      toast.success("Schedule deleted");
      fetchSchedules();
    } catch (error) {
      console.error("Error deleting schedule:", error);
      toast.error("Failed to delete schedule");
    }
  };

  const getScheduleDescription = (schedule: Schedule) => {
    const time = formatTime(schedule.time_of_day);

    switch (schedule.schedule_type) {
      case "daily":
        return `Daily at ${time}`;
      case "weekly":
        return `Every ${DAYS_OF_WEEK[schedule.day_of_week || 0]} at ${time}`;
      case "monthly":
        return `${schedule.day_of_month}${getOrdinalSuffix(schedule.day_of_month || 1)} of each month at ${time}`;
      default:
        return "Unknown schedule";
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  const getOrdinalSuffix = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <span className="loading loading-spinner loading-lg text-accent-purple"></span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold gradient-text font-display">
            Scheduled Reports
          </h1>
          <p className="text-gray-400 mt-2">
            Manage your automated report schedules
          </p>
        </div>
        <Link href="/dashboard/clients" className="btn btn-primary">
          Schedule New Report
        </Link>
      </div>

      {schedules.length === 0 ? (
        <div className="card-elevated rounded-xl p-12 text-center">
          <div className="text-5xl mb-4">📅</div>
          <h2 className="text-xl font-semibold text-white mb-2">
            No Scheduled Reports
          </h2>
          <p className="text-gray-400 mb-6">
            Set up automated reports to send to your clients on a regular basis.
          </p>
          <Link href="/dashboard/clients" className="btn btn-primary">
            Go to Clients
          </Link>
        </div>
      ) : (
        <div className="card-elevated rounded-xl overflow-hidden">
          <table className="table w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="bg-transparent text-gray-400">Client</th>
                <th className="bg-transparent text-gray-400">Schedule</th>
                <th className="bg-transparent text-gray-400">Report Range</th>
                <th className="bg-transparent text-gray-400">Last Run</th>
                <th className="bg-transparent text-gray-400">Next Run</th>
                <th className="bg-transparent text-gray-400">Status</th>
                <th className="bg-transparent text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((schedule) => (
                <tr key={schedule.id} className="border-b border-white/5">
                  <td>
                    <div className="font-medium text-white">
                      {schedule.client?.display_name || "Unknown Client"}
                    </div>
                  </td>
                  <td>
                    <div className="text-sm">
                      {getScheduleDescription(schedule)}
                    </div>
                  </td>
                  <td>
                    <div className="text-sm text-gray-400">
                      {schedule.report_parameters.start_date_offset} days
                    </div>
                  </td>
                  <td>
                    <div className="text-sm text-gray-400">
                      {schedule.last_run_at
                        ? formatDistanceToNow(new Date(schedule.last_run_at), {
                            addSuffix: true,
                          })
                        : "Never"}
                    </div>
                  </td>
                  <td>
                    <div className="text-sm">
                      {schedule.is_active
                        ? formatDistanceToNow(new Date(schedule.next_run_at), {
                            addSuffix: true,
                          })
                        : "-"}
                    </div>
                  </td>
                  <td>
                    <span
                      className={`badge badge-sm ${
                        schedule.is_active
                          ? "badge-success"
                          : "badge-warning"
                      }`}
                    >
                      {schedule.is_active ? "Active" : "Paused"}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          toggleSchedule(schedule.id, schedule.is_active)
                        }
                        className="btn btn-ghost btn-xs"
                        title={schedule.is_active ? "Pause" : "Resume"}
                      >
                        {schedule.is_active ? "⏸️" : "▶️"}
                      </button>
                      <button
                        onClick={() => deleteSchedule(schedule.id)}
                        className="btn btn-ghost btn-xs text-error"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
