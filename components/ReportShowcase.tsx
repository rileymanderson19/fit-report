'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, TrendingDown, BarChart3 } from 'lucide-react';
import ShareProgressSummaryCard from '@/components/shareable/ShareProgressSummaryCard';
import ShareWeightProgressChart from '@/components/shareable/ShareWeightProgressChart';
import ShareWeeklyHighlightsCard from '@/components/shareable/ShareWeeklyHighlightsCard';
import {
  demoBrand,
  demoDailyWeightData,
  demoWeeklyAverages,
  demoWeightData,
  demoGoalWeight,
  demoWeeklyData,
} from '@/components/landing/mockData';

const tabs = [
  { id: 'summary', label: 'Progress Summary', icon: FileText },
  { id: 'weight', label: 'Weight Trends', icon: TrendingDown },
  { id: 'weekly', label: 'Weekly Highlights', icon: BarChart3 },
] as const;

type TabId = typeof tabs[number]['id'];

export default function ReportShowcase() {
  const [activeTab, setActiveTab] = useState<TabId>('summary');

  return (
    <section className="w-full">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-10"
      >
        <h2 className="text-4xl lg:text-5xl font-display font-bold mb-5 tracking-tight text-gray-900">
          Professional Reports, <span className="gradient-text">Ready in Seconds</span>
        </h2>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
          Generate polished, branded reports without touching a spreadsheet.
        </p>
      </motion.div>

      {/* Tab Buttons */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex bg-gray-100 rounded-lg p-1 gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-md transition-all ${
                  isActive
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex justify-center">
        <AnimatePresence mode="wait">
          {activeTab === 'summary' && (
            <motion.div
              key="summary"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="flex justify-center"
            >
              <ShareProgressSummaryCard
                clientName="Timmy R."
                dateRangeStart="2026-01-25"
                dateRangeEnd="2026-02-21"
                weightData={demoWeightData}
                workoutsCompleted={16}
                consistencyScore={87}
                brand={demoBrand}
              />
            </motion.div>
          )}

          {activeTab === 'weight' && (
            <motion.div
              key="weight"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-[600px]"
            >
              <ShareWeightProgressChart
                dailyData={demoDailyWeightData}
                weeklyAverages={demoWeeklyAverages}
                goalWeight={demoGoalWeight}
                clientName="Timmy R."
                dateRangeStart="2026-01-25"
                dateRangeEnd="2026-02-21"
                brand={demoBrand}
              />
            </motion.div>
          )}

          {activeTab === 'weekly' && (
            <motion.div
              key="weekly"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="flex justify-center"
            >
              <ShareWeeklyHighlightsCard
                clientName="Timmy R."
                dateRangeStart="2026-02-15"
                dateRangeEnd="2026-02-21"
                weeklyData={demoWeeklyData}
                weightChange={-1.45}
                brand={demoBrand}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
