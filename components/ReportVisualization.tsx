'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface ReportVisualizationProps {
  data: {
    bodyStats: {
      bodyStats: Array<{
        date: string;
        weight: number;
      }>;
    };
    healthData: {
      healthData: Array<{
        date: string;
        data: {
          steps: number;
        };
      }>;
    };
    nutritionData: {
      nutrition: Array<{
        date: string;
        calories: number;
        proteinGrams: number;
        carbsGrams: number;
        fatGrams: number;
      }>;
    };
  };
}

export function ReportVisualization({ data }: ReportVisualizationProps) {
  const processedBodyWeightData = useMemo(() => {
    if (!data?.bodyStats?.bodyStats?.length) return [];
    return data.bodyStats.bodyStats.map(item => ({
      date: new Date(item.date).toLocaleDateString(),
      weight: item.weight || 0,
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [data?.bodyStats]);

  const processedHealthData = useMemo(() => {
    if (!data?.healthData?.healthData?.length) return [];
    return data.healthData.healthData.map(item => ({
      date: new Date(item.date).toLocaleDateString(),
      steps: item.data?.steps || 0,
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [data?.healthData]);

  const processedNutritionData = useMemo(() => {
    if (!data?.nutritionData?.nutrition?.length) return [];
    return data.nutritionData.nutrition.map(item => ({
      date: new Date(item.date).toLocaleDateString(),
      calories: item.calories || 0,
      protein: item.proteinGrams || 0,
      carbs: item.carbsGrams || 0,
      fats: item.fatGrams || 0,
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [data?.nutritionData]);

  return (
    <div className="space-y-8">
      {/* Body Weight Chart */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Body Weight Trend</h2>
          {processedBodyWeightData.length > 0 ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={processedBodyWeightData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="#8884d8"
                    name="Weight (lbs)"
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="alert alert-info">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>No body weight data available for this period</span>
            </div>
          )}
        </div>
      </div>

      {/* Daily Steps Chart */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Daily Steps</h2>
          {processedHealthData.length > 0 ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={processedHealthData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="steps"
                    stroke="#82ca9d"
                    name="Steps"
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="alert alert-info">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>No step data available for this period</span>
            </div>
          )}
        </div>
      </div>

      {/* Nutrition Charts */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Nutrition Trends</h2>
          {processedNutritionData.length > 0 ? (
            <div className="space-y-8">
              {/* Calories Chart */}
              <div className="h-[300px]">
                <h3 className="text-lg font-semibold mb-4">Daily Calories</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={processedNutritionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="calories"
                      stroke="#8884d8"
                      name="Calories"
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Macros Chart */}
              <div className="h-[300px]">
                <h3 className="text-lg font-semibold mb-4">Daily Macronutrients</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={processedNutritionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="protein"
                      stroke="#82ca9d"
                      name="Protein (g)"
                    />
                    <Line
                      type="monotone"
                      dataKey="carbs"
                      stroke="#ffc658"
                      name="Carbs (g)"
                    />
                    <Line
                      type="monotone"
                      dataKey="fats"
                      stroke="#ff8042"
                      name="Fats (g)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="alert alert-info">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>No nutrition data available for this period</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 