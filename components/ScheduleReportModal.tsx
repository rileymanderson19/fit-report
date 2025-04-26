'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';

interface ScheduleReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedClients: string[];
  minReps: number;
  maxReps: number;
}

export function ScheduleReportModal({
  isOpen,
  onClose,
  selectedClients,
  minReps,
  maxReps
}: ScheduleReportModalProps) {
  const [scheduleType, setScheduleType] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [dayOfWeek, setDayOfWeek] = useState<number>(1); // Monday
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [timeOfDay, setTimeOfDay] = useState<string>('09:00');
  const [reportRange, setReportRange] = useState<number>(7); // Days

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/scheduled-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientIds: selectedClients,
          scheduleType,
          dayOfWeek: scheduleType === 'weekly' ? dayOfWeek : undefined,
          dayOfMonth: scheduleType === 'monthly' ? dayOfMonth : undefined,
          timeOfDay,
          reportParameters: {
            startDateOffset: reportRange,
            endDateOffset: 0,
            minReps,
            maxReps
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create scheduled report');
      }

      toast.success('Report scheduled successfully');
      onClose();
    } catch (error) {
      console.error('Error scheduling report:', error);
      toast.error('Failed to schedule report');
    }
  };

  if (!isOpen) return null;

  return (
    <dialog className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-6">Schedule Report</h3>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Schedule Type */}
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text font-semibold">Schedule Type</span>
            </label>
            <select 
              className="select select-bordered w-full"
              value={scheduleType}
              onChange={(e) => setScheduleType(e.target.value as 'daily' | 'weekly' | 'monthly')}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          {/* Day Selection - Weekly */}
          {scheduleType === 'weekly' && (
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-semibold">Day of Week</span>
              </label>
              <select 
                className="select select-bordered w-full"
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(parseInt(e.target.value))}
              >
                <option value={1}>Monday</option>
                <option value={2}>Tuesday</option>
                <option value={3}>Wednesday</option>
                <option value={4}>Thursday</option>
                <option value={5}>Friday</option>
                <option value={6}>Saturday</option>
                <option value={0}>Sunday</option>
              </select>
            </div>
          )}

          {/* Day Selection - Monthly */}
          {scheduleType === 'monthly' && (
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-semibold">Day of Month</span>
              </label>
              <select 
                className="select select-bordered w-full"
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(parseInt(e.target.value))}
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>
          )}

          {/* Time of Day */}
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text font-semibold">Time of Day</span>
            </label>
            <input 
              type="time" 
              className="input input-bordered w-full"
              value={timeOfDay}
              onChange={(e) => setTimeOfDay(e.target.value)}
            />
          </div>

          {/* Report Range */}
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text font-semibold">Report Range (days)</span>
            </label>
            <select 
              className="select select-bordered w-full"
              value={reportRange}
              onChange={(e) => setReportRange(parseInt(e.target.value))}
            >
              <option value={1}>Last 24 hours</option>
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
            </select>
          </div>

          <div className="modal-action">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={selectedClients.length === 0}
            >
              Schedule Report
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
} 