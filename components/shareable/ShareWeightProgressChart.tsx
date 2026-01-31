'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart
} from 'recharts';

interface WeightDataPoint {
  date: string;
  weight: number;
}

interface WeeklyAveragePoint {
  weekStart: string;
  avgWeight: number;
}

interface ShareWeightProgressChartProps {
  dailyData: WeightDataPoint[];
  weeklyAverages: WeeklyAveragePoint[];
  goalWeight?: number;
  clientName: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  isScreenshotMode?: boolean;
}

export default function ShareWeightProgressChart({
  dailyData,
  weeklyAverages,
  goalWeight,
  clientName,
  dateRangeStart,
  dateRangeEnd,
  isScreenshotMode = false
}: ShareWeightProgressChartProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Filter to only days with weight data and format for chart
  const chartData = dailyData
    .filter(d => d.weight > 0)
    .map(d => ({
      date: d.date,
      displayDate: formatDate(d.date),
      weight: d.weight
    }));

  // Calculate min/max for Y axis with padding
  const weights = chartData.map(d => d.weight);
  const minWeight = Math.min(...weights, goalWeight || Infinity);
  const maxWeight = Math.max(...weights);
  const padding = (maxWeight - minWeight) * 0.1 || 5;
  const yMin = Math.floor(minWeight - padding);
  const yMax = Math.ceil(maxWeight + padding);

  // Calculate weight change for summary
  const startWeight = chartData.length > 0 ? chartData[0].weight : 0;
  const endWeight = chartData.length > 0 ? chartData[chartData.length - 1].weight : 0;
  const totalChange = endWeight - startWeight;

  // Calculate average change per week using weekly averages (smooths out daily noise)
  // This matches the Weekly Progress Summary calculation
  let avgChangePerWeek = 0;
  if (weeklyAverages.length >= 2) {
    const firstWeekAvg = weeklyAverages[0].avgWeight;
    const lastWeekAvg = weeklyAverages[weeklyAverages.length - 1].avgWeight;
    avgChangePerWeek = (lastWeekAvg - firstWeekAvg) / (weeklyAverages.length - 1);
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length && !isScreenshotMode) {
      return (
        <div className="bg-white shadow-lg rounded-lg p-3 border border-gray-100">
          <p className="text-sm font-medium text-gray-900">{label}</p>
          <p className="text-sm text-purple-600">
            {payload[0].value.toFixed(1)} lbs
          </p>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <div
        id="share-weight-chart"
        className="bg-white rounded-2xl shadow-lg p-6"
        style={{ width: isScreenshotMode ? '600px' : '100%', maxWidth: '600px' }}
      >
        <div className="text-center py-12 text-gray-500">
          No weight data available for this period
        </div>
      </div>
    );
  }

  return (
    <div
      id="share-weight-chart"
      className={`bg-white rounded-2xl shadow-lg overflow-hidden ${isScreenshotMode ? 'p-8' : 'p-6'}`}
      style={{ width: isScreenshotMode ? '600px' : '100%', maxWidth: '600px' }}
    >
      {/* Header */}
      <div className="mb-6">
        <div className="h-1 w-16 bg-gradient-to-r from-purple-500 to-violet-500 rounded-full mb-4" />
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Weight Progress</h2>
            <p className="text-sm text-gray-500">
              {formatDate(dateRangeStart)} - {formatDate(dateRangeEnd)}
            </p>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${totalChange <= 0 ? 'text-green-600' : 'text-orange-600'}`}>
              {totalChange > 0 ? '+' : ''}{totalChange.toFixed(1)} lbs
            </div>
            <div className="text-xs text-gray-500">total change</div>
            <div className={`text-sm font-medium mt-1 ${avgChangePerWeek <= 0 ? 'text-green-600' : 'text-orange-600'}`}>
              {avgChangePerWeek > 0 ? '+' : ''}{avgChangePerWeek.toFixed(2)} lbs/week
            </div>
            <div className="text-xs text-gray-500">avg change</div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer>
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#A855F7" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#A855F7" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
            <XAxis
              dataKey="displayDate"
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              tickLine={false}
              axisLine={{ stroke: '#E5E7EB' }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}`}
              width={45}
            />
            {!isScreenshotMode && <Tooltip content={<CustomTooltip />} />}

            {/* Goal weight reference line */}
            {goalWeight && (
              <ReferenceLine
                y={goalWeight}
                stroke="#10B981"
                strokeDasharray="5 5"
                label={{
                  value: `Goal: ${goalWeight} lbs`,
                  position: 'right',
                  fill: '#10B981',
                  fontSize: 11
                }}
              />
            )}

            {/* Area under the line */}
            <Area
              type="monotone"
              dataKey="weight"
              stroke="transparent"
              fill="url(#weightGradient)"
            />

            {/* Main weight line */}
            <Line
              type="monotone"
              dataKey="weight"
              stroke="#A855F7"
              strokeWidth={3}
              dot={{ fill: '#A855F7', strokeWidth: 0, r: 4 }}
              activeDot={{ fill: '#A855F7', strokeWidth: 2, stroke: '#fff', r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Stats Row */}
      <div className="mt-6 pt-4 border-t border-gray-100 grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-xs text-gray-500 mb-1">Start</div>
          <div className="text-lg font-semibold text-gray-900">{startWeight.toFixed(1)} lbs</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Current</div>
          <div className="text-lg font-semibold text-gray-900">{endWeight.toFixed(1)} lbs</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Lowest</div>
          <div className="text-lg font-semibold text-green-600">{Math.min(...weights).toFixed(1)} lbs</div>
        </div>
      </div>

      {/* Branding Footer */}
      <div className="mt-4 flex items-center justify-center">
        <span className="text-xs text-gray-400">Powered by FitReport</span>
      </div>
    </div>
  );
}
