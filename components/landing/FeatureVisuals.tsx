'use client';

import React from 'react';
import { demoClientList } from './mockData';

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  'On Track': { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  'Watch': { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  'Needs Attention': { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
};

/** Mini client dashboard showing status at a glance */
export function ClientDashboardMini() {
  return (
    <div className="mt-5 rounded-lg border border-gray-100 overflow-hidden text-left">
      {/* Header row */}
      <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-3 py-2 bg-gray-50 text-[11px] font-medium text-gray-400 uppercase tracking-wider">
        <span>Client</span>
        <span>Status</span>
        <span className="text-right">Change</span>
      </div>
      {demoClientList.map((client) => {
        const colors = statusColors[client.status] || statusColors['On Track'];
        return (
          <div
            key={client.name}
            className="grid grid-cols-[1fr_auto_auto] gap-3 items-center px-3 py-2 border-t border-gray-50"
          >
            <span className="text-sm font-medium text-gray-700 truncate">{client.name}</span>
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
              {client.status}
            </span>
            <span className={`text-xs font-medium text-right ${client.change.startsWith('-') ? 'text-green-600' : client.change.startsWith('+') && client.goal === 'Muscle Gain' ? 'text-green-600' : 'text-orange-600'}`}>
              {client.change}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Mini weight chart using pure CSS (no recharts dependency for fast load) */
export function WeightChartMini() {
  // Simplified 7-point trend for visual effect
  const points = [172, 170.6, 169.4, 169.0, 168.2, 167.4, 166.2];
  const min = Math.min(...points) - 1;
  const max = Math.max(...points) + 1;
  const range = max - min;
  const height = 80;
  const width = 200;
  const stepX = width / (points.length - 1);

  const pathPoints = points.map((p, i) => {
    const x = i * stepX;
    const y = height - ((p - min) / range) * height;
    return `${x},${y}`;
  });

  const linePath = `M${pathPoints.join(' L')}`;
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`;

  return (
    <div className="mt-5 rounded-lg border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-gray-400">4-week trend</span>
        <span className="text-sm font-bold text-green-600">-5.8 lbs</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-16" preserveAspectRatio="none">
        <defs>
          <linearGradient id="miniChartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563EB" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#miniChartGradient)" />
        <path d={linePath} fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="flex justify-between mt-2 text-[10px] text-gray-400">
        <span>172.0 lbs</span>
        <span>166.2 lbs</span>
      </div>
    </div>
  );
}

/** Mini weekly report card preview */
export function WeeklyReportMini() {
  const metrics = [
    { label: 'Calories', value: '2,180', sub: 'daily avg' },
    { label: 'Protein', value: '168g', sub: 'daily avg' },
    { label: 'Steps', value: '9,247', sub: 'daily avg' },
    { label: 'Workouts', value: '4', sub: 'completed' },
  ];

  return (
    <div className="mt-5 rounded-lg border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-gray-400">Weekly Highlights</span>
        <span className="text-xs text-gray-400">Feb 15 - Feb 21</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {metrics.map((m) => (
          <div key={m.label} className="bg-gray-50 rounded-lg px-3 py-2">
            <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{m.label}</div>
            <div className="text-base font-bold text-gray-900">{m.value}</div>
            <div className="text-[10px] text-gray-400">{m.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
