'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, TrendingDown, Lightbulb, Camera, Dumbbell, ArrowLeftRight, ArrowRight } from 'lucide-react';
import ShareWeeklyHighlightsCard from '@/components/shareable/ShareWeeklyHighlightsCard';
import ShareWeightProgressChart from '@/components/shareable/ShareWeightProgressChart';
import {
  demoBrand,
  demoDailyWeightData,
  demoWeeklyAverages,
  demoGoalWeight,
  demoWeeklyData,
  demoCoachingNotes,
  demoProgressPhotos,
  demoRecentWorkouts,
  demoPeriodTrends,
} from './mockData';

const tabs = [
  {
    id: 'weekly',
    label: 'Weekly Report',
    icon: BarChart3,
    description: "Your client\u2019s week at a glance \u2014 calories, protein, steps, workouts, and weight change.",
  },
  {
    id: 'weight',
    label: 'Weight Tracking',
    icon: TrendingDown,
    description: 'Visualize weight trends over time with goal tracking and weekly averages.',
  },
  {
    id: 'ai-notes',
    label: 'AI Notes',
    icon: Lightbulb,
    description: 'AI-generated summaries, key insights, and action items for every client.',
  },
  {
    id: 'workouts',
    label: 'Workouts',
    icon: Dumbbell,
    description: 'Track exercise progression across sessions with automated workout analysis.',
  },
  {
    id: 'week-v-week',
    label: 'Week v Week',
    icon: ArrowLeftRight,
    description: 'Compare nutrition, weight, and activity metrics week over week.',
  },
  {
    id: 'photos',
    label: 'Photos',
    icon: Camera,
    description: "Side-by-side photo comparisons that show your clients how far they\u2019ve come.",
  },
] as const;

type TabId = typeof tabs[number]['id'];

const motionProps = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.3 },
};

function ReportHeader({ subtitle }: { subtitle: string }) {
  return (
    <div className="mb-4">
      <div className="h-1 w-12 rounded-full bg-gradient-to-r from-blue-600 to-blue-800 mb-2" />
      <h3 className="font-bold text-gray-900 text-sm">Timmy R.</h3>
      <p className="text-[11px] text-gray-500">{subtitle}</p>
    </div>
  );
}

export default function HeroProductShowcase() {
  const [activeTab, setActiveTab] = useState<TabId>('weekly');

  const currentTab = tabs.find(t => t.id === activeTab)!;

  return (
    <div>
      {/* Pill-style tab buttons */}
      <div className="flex flex-wrap justify-center gap-2 sm:gap-2.5 mb-4 sm:mb-6" role="tablist">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Icon className="w-3 h-3" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Description text */}
      <AnimatePresence mode="wait">
        <motion.p
          key={activeTab + '-desc'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="text-sm text-gray-500 text-center max-w-lg mx-auto mb-6"
        >
          {currentTab.description}
        </motion.p>
      </AnimatePresence>

      {/* Browser chrome wrapper */}
      <div className="rounded-2xl overflow-hidden border border-gray-200/80 bg-gray-100 shadow-xl ring-1 ring-black/5">
        {/* Browser window chrome */}
        <div className="flex items-center gap-3 px-4 py-3 bg-gray-100 border-b border-gray-200/60">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
            <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
            <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
          </div>
          <div className="flex-1">
            <div className="bg-white/80 rounded-lg px-3 py-1 text-xs text-gray-400 text-center max-w-xs mx-auto">
              app.fitreport.co/reports/timmy-r
            </div>
          </div>
        </div>

        {/* Content area */}
        <div
          className="relative bg-white h-[640px]"
          role="tabpanel"
          aria-labelledby={`tab-${activeTab}`}
        >
          <AnimatePresence mode="wait">
            {activeTab === 'weekly' && (
              <motion.div key="weekly" {...motionProps} className="p-4 sm:p-5">
                <ReportHeader subtitle="Weekly Highlights: Feb 15 - Feb 21" />
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
              </motion.div>
            )}

            {activeTab === 'weight' && (
              <motion.div key="weight" {...motionProps} className="p-4 sm:p-5">
                <ReportHeader subtitle="Weight Progress: Jan 25 - Feb 21" />
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
                  chartHeight={220}
                />
              </motion.div>
            )}

            {activeTab === 'ai-notes' && (
              <motion.div key="ai-notes" {...motionProps} className="p-4 sm:p-5">
                <ReportHeader subtitle="AI Coaching Notes: Jan 25 - Feb 21" />
                <div className="rounded-xl border border-gray-100 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-5 h-5 text-amber-500" />
                    <h4 className="font-semibold text-gray-900">AI Coaching Notes</h4>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed mb-3">
                    {demoCoachingNotes.summary}
                  </p>
                  <div className="mb-3">
                    <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Key Insights</h5>
                    <ul className="space-y-1">
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
                    <ul className="space-y-1">
                      {demoCoachingNotes.actionItems.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                          <ArrowRight className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'workouts' && (
              <motion.div key="workouts" {...motionProps} className="p-4 sm:p-5">
                <ReportHeader subtitle="Workout Analysis: Feb 11 - Feb 19" />
                <div className="rounded-xl border border-gray-100 overflow-hidden">
                  <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                    <Dumbbell className="w-5 h-5 text-gray-500" />
                    <h4 className="font-semibold text-gray-900">Recent Workouts</h4>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {demoRecentWorkouts.map((workout, wi) => (
                      <div key={wi} className="p-4">
                        <h5 className="text-sm font-semibold text-gray-900 mb-2">{workout.name}</h5>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-100">
                              <th className="text-left py-1.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Exercise</th>
                              {workout.sessions.map((s, si) => (
                                <th key={si} className="text-right py-1.5 text-xs font-medium text-gray-400 uppercase tracking-wide">{s.date}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {workout.sessions[0].exercises.map((ex, ei) => (
                              <tr key={ei} className="border-b border-gray-50">
                                <td className="py-1.5 text-gray-700">{ex.name}</td>
                                {workout.sessions.map((s, si) => (
                                  <td key={si} className="text-right py-1.5 text-gray-500 text-xs">{s.exercises[ei].sets}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'week-v-week' && (
              <motion.div key="week-v-week" {...motionProps} className="p-4 sm:p-5">
                <ReportHeader subtitle="Period Trends: Jan 25 - Feb 21" />
                <div className="rounded-xl border border-gray-100 overflow-hidden">
                  <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                    <h4 className="font-semibold text-gray-900">Period Trends</h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Week</th>
                          <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Weight</th>
                          <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Calories</th>
                          <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Protein</th>
                          <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Steps</th>
                        </tr>
                      </thead>
                      <tbody>
                        {demoPeriodTrends.map((week, i) => (
                          <tr key={i} className="border-b border-gray-50">
                            <td className="px-4 py-2.5">
                              <div className="font-medium text-gray-900">{week.week}</div>
                              <div className="text-xs text-gray-400">{week.dates}</div>
                            </td>
                            <td className="text-right px-4 py-2.5 text-gray-700">{week.weight.toFixed(1)}</td>
                            <td className="text-right px-4 py-2.5 text-gray-700">{week.calories.toLocaleString()}</td>
                            <td className="text-right px-4 py-2.5 text-gray-700">{week.protein}g</td>
                            <td className="text-right px-4 py-2.5 text-gray-700">{week.steps.toLocaleString()}</td>
                          </tr>
                        ))}
                        {/* Change row */}
                        <tr className="bg-gray-50">
                          <td className="px-4 py-2.5 font-medium text-gray-500">Change</td>
                          <td className="text-right px-4 py-2.5 font-medium text-green-600">&darr; 4.4 lbs</td>
                          <td className="text-right px-4 py-2.5 font-medium text-gray-500">&rarr; -40</td>
                          <td className="text-right px-4 py-2.5 font-medium text-green-600">&uarr; +7g</td>
                          <td className="text-right px-4 py-2.5 font-medium text-green-600">&uarr; +600</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'photos' && (
              <motion.div key="photos" {...motionProps} className="p-4 sm:p-5">
                <ReportHeader subtitle="Progress Photos: Oct 15 - Feb 18" />
                <div className="rounded-xl border border-gray-100 overflow-hidden">
                  <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                    <Camera className="w-5 h-5 text-gray-500" />
                    <h4 className="font-semibold text-gray-900">Progress Photos</h4>
                  </div>
                  <div className="p-4 space-y-5">
                    {demoProgressPhotos.slice(0, 1).map((poseGroup) => (
                      <div key={poseGroup.pose}>
                        <h5 className="text-sm font-semibold text-gray-700 mb-2">{poseGroup.pose}</h5>
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
                              <div className="mt-1 text-center">
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
