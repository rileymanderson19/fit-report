'use client';

import React from 'react';
import {
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
import { BrandConfig } from '@/hooks/useBrandConfig';

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
  hideFooter?: boolean;
  hideHeader?: boolean;
  hideWeightChange?: boolean;
  unitPreference?: 'lbs' | 'kg';
  brand?: BrandConfig | null;
}

export default function ShareWeightProgressChart({
  dailyData,
  weeklyAverages: _weeklyAverages,
  goalWeight,
  clientName: _clientName,
  dateRangeStart,
  dateRangeEnd,
  isScreenshotMode = false,
  hideFooter = false,
  hideHeader = false,
  hideWeightChange = false,
  unitPreference = 'lbs',
  brand
}: ShareWeightProgressChartProps) {
  const primaryColor = brand?.primary_color || '#2563EB';
  // Unit conversion helpers
  const convertWeight = (lbs: number): number => unitPreference === 'kg' ? lbs * 0.453592 : lbs;
  const weightUnit = unitPreference === 'kg' ? 'kg' : 'lbs';

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Filter to only days with weight data and format for chart (convert units)
  const chartData = dailyData
    .filter(d => d.weight > 0)
    .map(d => ({
      date: d.date,
      displayDate: formatDate(d.date),
      weight: convertWeight(d.weight)
    }));

  // Convert goal weight if present
  const convertedGoalWeight = goalWeight ? convertWeight(goalWeight) : undefined;

  // Calculate min/max for Y axis with padding
  const weights = chartData.map(d => d.weight);
  const minWeight = Math.min(...weights, convertedGoalWeight || Infinity);
  const maxWeight = Math.max(...weights);
  const padding = (maxWeight - minWeight) * 0.1 || 5;
  const yMin = Math.floor(minWeight - padding);
  const yMax = Math.ceil(maxWeight + padding);

  // Calculate weight change for summary
  const startWeight = chartData.length > 0 ? chartData[0].weight : 0;
  const endWeight = chartData.length > 0 ? chartData[chartData.length - 1].weight : 0;
  const totalChange = endWeight - startWeight;

  // Calculate average change per week using actual first/last weight measurements
  // This avoids issues where weeklyAverages may have entries with avgWeight = 0
  // (weeks that have nutrition/steps data but no weight measurements)
  let avgChangePerWeek = 0;
  if (chartData.length >= 2) {
    // chartData already filters for weight > 0 and has converted weights
    const firstWeight = chartData[0].weight;
    const lastWeight = chartData[chartData.length - 1].weight;
    const firstDate = new Date(chartData[0].date);
    const lastDate = new Date(chartData[chartData.length - 1].date);
    const daysBetween = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);
    const weeksBetween = daysBetween / 7;

    if (weeksBetween > 0) {
      // chartData weights are already in display units (converted)
      avgChangePerWeek = (lastWeight - firstWeight) / weeksBetween;
    }
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length && !isScreenshotMode) {
      return (
        <div className="bg-white shadow-lg rounded-lg p-3 border border-gray-100">
          <p className="text-sm font-medium text-gray-900">{label}</p>
          <p className="text-sm" style={{ color: primaryColor }}>
            {payload[0].value.toFixed(1)} {weightUnit}
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
      className={`bg-white overflow-hidden ${hideHeader ? '' : 'rounded-2xl shadow-lg'} ${isScreenshotMode ? 'p-8' : 'p-6'}`}
      style={{ width: hideHeader ? '100%' : (isScreenshotMode ? '600px' : '100%'), maxWidth: hideHeader ? 'none' : '600px' }}
    >
      {/* Header */}
      <div className="mb-6">
        {!hideHeader && (
          <div
            className="h-1 w-16 rounded-full mb-4"
            style={{ background: `linear-gradient(to right, ${primaryColor}, ${brand?.accent_color || '#1D4ED8'})` }}
          />
        )}
        <div className="flex justify-between items-start">
          {!hideHeader && (
            <div>
              <h2 className="text-xl font-bold text-gray-900">Weight Progress</h2>
              <p className="text-sm text-gray-500">
                {formatDate(dateRangeStart)} - {formatDate(dateRangeEnd)}
              </p>
            </div>
          )}
          {!hideWeightChange && (
            <div className={`text-right ${hideHeader ? 'ml-auto' : ''}`}>
              <div className={`text-2xl font-bold ${totalChange <= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                {totalChange > 0 ? '+' : ''}{totalChange.toFixed(1)} {weightUnit}
              </div>
              <div className="text-xs text-gray-500">total change</div>
              <div className={`text-sm font-medium mt-1 ${avgChangePerWeek <= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                {avgChangePerWeek > 0 ? '+' : ''}{avgChangePerWeek.toFixed(2)} {weightUnit}/week
              </div>
              <div className="text-xs text-gray-500">avg change</div>
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer>
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={primaryColor} stopOpacity={0.15} />
                <stop offset="95%" stopColor={primaryColor} stopOpacity={0} />
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
            {convertedGoalWeight && (
              <ReferenceLine
                y={convertedGoalWeight}
                stroke="#10B981"
                strokeDasharray="5 5"
                label={{
                  value: `Goal: ${convertedGoalWeight.toFixed(0)} ${weightUnit}`,
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
              stroke={primaryColor}
              strokeWidth={3}
              dot={{ fill: primaryColor, strokeWidth: 0, r: 4 }}
              activeDot={{ fill: primaryColor, strokeWidth: 2, stroke: '#fff', r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Stats Row */}
      <div className="mt-6 pt-4 border-t border-gray-100 grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-xs text-gray-500 mb-1">Start</div>
          <div className="text-lg font-semibold text-gray-900">{startWeight.toFixed(1)} {weightUnit}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Current</div>
          <div className="text-lg font-semibold text-gray-900">{endWeight.toFixed(1)} {weightUnit}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Lowest</div>
          <div className="text-lg font-semibold text-green-600">{Math.min(...weights).toFixed(1)} {weightUnit}</div>
        </div>
      </div>

      {/* Branding Footer */}
      {!hideFooter && (
        <div className="mt-4">
          {brand?.footer_text && (
            <p className="text-xs text-gray-500 text-center whitespace-pre-line mb-1">{brand.footer_text}</p>
          )}
          {(brand?.show_fitreport_badge !== false) && (
            <div className="flex items-center justify-center">
              <span className="text-xs text-gray-400">Powered by FitReport</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
