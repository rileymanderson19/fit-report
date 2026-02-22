'use client';

import React from 'react';
import Image from 'next/image';
import { Lightbulb, ArrowRight, Camera } from 'lucide-react';
import ShareWeeklyHighlightsCard from '@/components/shareable/ShareWeeklyHighlightsCard';
import ShareWeightProgressChart from '@/components/shareable/ShareWeightProgressChart';
import {
  demoBrand,
  demoDailyWeightData,
  demoWeeklyAverages,
  demoGoalWeight,
  demoWeeklyData,
  demoCoachingNotes,
  demoPeriodTrends,
  demoRecentWorkouts,
  demoProgressPhotos,
} from './mockData';

interface FullReportPreviewProps {
  compact?: boolean;
}

export default function FullReportPreview({ compact = false }: FullReportPreviewProps) {
  const maxHeight = compact ? 'max-h-[500px]' : 'max-h-[700px]';

  return (
    <div className={`bg-white rounded-2xl shadow-lg overflow-hidden ${compact ? 'p-4' : 'p-6 md:p-8'}`}>
      {/* Report Header */}
      <div className={compact ? 'mb-4' : 'mb-6'}>
        <div className="h-1 w-16 rounded-full bg-gradient-to-r from-blue-600 to-blue-800 mb-3" />
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Peak Performance Coaching</p>
        <h3 className={`font-bold text-gray-900 ${compact ? 'text-lg' : 'text-xl'}`}>Timmy R.</h3>
        <p className="text-sm text-gray-500">Progress Report: Jan 25 - Feb 21</p>
      </div>

      {/* Scrollable report body */}
      <div className={`${maxHeight} overflow-y-auto pr-1 space-y-6 scrollbar-thin`}>

        {/* Section 1: AI Coaching Notes */}
        <div className="rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            <h4 className="font-semibold text-gray-900">AI Coaching Notes</h4>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">{demoCoachingNotes.summary}</p>
          <div className="mb-4">
            <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Key Insights</h5>
            <ul className="space-y-1.5">
              {demoCoachingNotes.keyInsights.map((insight, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                  {insight}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Action Items</h5>
            <ul className="space-y-1.5">
              {demoCoachingNotes.actionItems.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                  <ArrowRight className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Section 2: Weekly Highlights + Weight Chart */}
        <div className={`flex flex-col ${compact ? 'gap-4' : 'lg:flex-row gap-6'}`}>
          <div className={compact ? 'w-full' : 'w-full lg:w-[400px] flex-shrink-0'}>
            <ShareWeeklyHighlightsCard
              clientName="Timmy R."
              dateRangeStart="2026-02-15"
              dateRangeEnd="2026-02-21"
              weeklyData={demoWeeklyData}
              weightChange={-1.45}
              hideHeader
              hideFooter
              brand={demoBrand}
            />
          </div>
          <div className="w-full flex-1 min-w-0">
            <ShareWeightProgressChart
              dailyData={demoDailyWeightData}
              weeklyAverages={demoWeeklyAverages}
              goalWeight={demoGoalWeight}
              clientName="Timmy R."
              dateRangeStart="2026-01-25"
              dateRangeEnd="2026-02-21"
              hideHeader
              hideFooter
              brand={demoBrand}
            />
          </div>
        </div>

        {/* Section 3: Progress Photos */}
        <div className="rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
            <Camera className="w-5 h-5 text-gray-500" />
            <h4 className="font-semibold text-gray-900">Progress Photos</h4>
          </div>
          <div className="p-4 space-y-6">
            {demoProgressPhotos.map((poseGroup) => (
              <div key={poseGroup.pose}>
                <h5 className="text-sm font-semibold text-gray-700 mb-3">{poseGroup.pose}</h5>
                <div className="grid grid-cols-3 gap-3">
                  {poseGroup.photos.map((photo) => (
                    <div key={photo.label}>
                      <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-gray-100">
                        <Image
                          src={photo.src}
                          alt={`${poseGroup.pose} - ${photo.label}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 30vw, 200px"
                        />
                      </div>
                      <div className="mt-1.5 text-center">
                        <div className={`text-xs font-medium ${photo.label === 'Latest' ? 'text-green-600' : 'text-gray-500'}`}>
                          {photo.label}
                        </div>
                        <div className="text-[10px] text-gray-400">{photo.date}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 4: Period Trends */}
        <div className="rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-100">
            <h4 className="font-semibold text-gray-900">Period Trends</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Week</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Weight</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Calories</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Protein</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Steps</th>
                </tr>
              </thead>
              <tbody>
                {demoPeriodTrends.map((week, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{week.week}</div>
                      <div className="text-xs text-gray-400">{week.dates}</div>
                    </td>
                    <td className="text-right px-4 py-3 text-gray-700">{week.weight.toFixed(1)}</td>
                    <td className="text-right px-4 py-3 text-gray-700">{week.calories.toLocaleString()}</td>
                    <td className="text-right px-4 py-3 text-gray-700">{week.protein}g</td>
                    <td className="text-right px-4 py-3 text-gray-700">{week.steps.toLocaleString()}</td>
                  </tr>
                ))}
                {/* Change row */}
                <tr className="bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-500">Change</td>
                  <td className="text-right px-4 py-3 font-medium text-green-600">↓ 4.4 lbs</td>
                  <td className="text-right px-4 py-3 font-medium text-gray-500">→ -40</td>
                  <td className="text-right px-4 py-3 font-medium text-green-600">↑ +7g</td>
                  <td className="text-right px-4 py-3 font-medium text-green-600">↑ +600</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 5: Recent Workouts */}
        <div className="rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-100">
            <h4 className="font-semibold text-gray-900">Recent Workouts</h4>
          </div>
          <div className="divide-y divide-gray-100">
            {demoRecentWorkouts.map((workout, wi) => (
              <div key={wi} className="p-4">
                <h5 className="text-sm font-semibold text-gray-900 mb-3">{workout.name}</h5>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Exercise</th>
                      {workout.sessions.map((s, si) => (
                        <th key={si} className="text-right py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">{s.date}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {workout.sessions[0].exercises.map((ex, ei) => (
                      <tr key={ei} className="border-b border-gray-50">
                        <td className="py-2 text-gray-700">{ex.name}</td>
                        {workout.sessions.map((s, si) => (
                          <td key={si} className="text-right py-2 text-gray-500 text-xs">{s.exercises[ei].sets}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Scroll fade indicator at bottom */}
      <div className="h-8 bg-gradient-to-t from-white to-transparent -mt-8 relative z-10 pointer-events-none" />
    </div>
  );
}
