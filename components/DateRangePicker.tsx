'use client';

import { useState } from 'react';
import { format } from 'date-fns';

interface DateRangePickerProps {
  from: Date | undefined;
  to: Date | undefined;
  onSelect: (range: { from: Date | undefined; to: Date | undefined }) => void;
}

export function DateRangePicker({ from, to, onSelect }: DateRangePickerProps) {
  const formatDate = (date: Date | undefined) => {
    return date ? format(date, 'yyyy-MM-dd') : '';
  };

  return (
    <div className="flex gap-4">
      <div className="form-control flex-1">
        <label className="label">
          <span className="label-text">From</span>
        </label>
        <input
          type="date"
          className="input input-bordered w-full"
          value={formatDate(from)}
          onChange={(e) => {
            const newFrom = e.target.value ? new Date(e.target.value) : undefined;
            onSelect({ from: newFrom, to });
          }}
        />
      </div>

      <div className="form-control flex-1">
        <label className="label">
          <span className="label-text">To</span>
        </label>
        <input
          type="date"
          className="input input-bordered w-full"
          value={formatDate(to)}
          min={formatDate(from)}
          onChange={(e) => {
            const newTo = e.target.value ? new Date(e.target.value) : undefined;
            onSelect({ from, to: newTo });
          }}
        />
      </div>
    </div>
  );
} 