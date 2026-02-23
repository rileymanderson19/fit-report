'use client';

import ShareWeeklyHighlightsCard from '@/components/shareable/ShareWeeklyHighlightsCard';
import ShareWeightProgressChart from '@/components/shareable/ShareWeightProgressChart';
import {
  demoBrand,
  demoDailyWeightData,
  demoWeeklyAverages,
  demoGoalWeight,
  demoWeeklyData,
} from './mockData';

/**
 * Hero report snapshot showing weekly highlights + weight chart.
 * Uses the real shareable components for visual consistency with the actual product.
 */
export default function HeroReportSnapshot() {
  return (
    <div className="bg-white p-4 sm:p-5">
      {/* Report Header */}
      <div className="mb-4">
        <div className="h-1 w-12 rounded-full bg-gradient-to-r from-blue-600 to-blue-800 mb-2" />
        <h3 className="font-bold text-gray-900 text-sm">Timmy R.</h3>
        <p className="text-[11px] text-gray-500">Progress Report: Jan 25 - Feb 21</p>
      </div>

      {/* Weekly Highlights + Weight Chart */}
      <div className="flex flex-col gap-4">
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
  );
}
