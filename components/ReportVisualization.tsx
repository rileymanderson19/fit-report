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
      bodyMeasures: {
        bodyWeight: number;
        measurements: {
          chest: number;
          waist: number;
          hips: number;
        };
      };
    };
    healthData: {
      healthData: Array<{
        date: string;
        steps: number;
        source: string;
      }>;
    };
    nutritionData: {
      nutrition: Array<{
        date: string;
        calories: number;
        protein: number;
        carbs: number;
        fats: number;
      }>;
    };
  };
}

export function ReportVisualization({ data }: ReportVisualizationProps) {
  const processedNutritionData = useMemo(() => {
    return data.nutritionData.nutrition.map(item => ({
      date: new Date(item.date).toLocaleDateString(),
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fats: item.fats,
    }));
  }, [data.nutritionData]);

  const processedHealthData = useMemo(() => {
    return data.healthData.healthData.map(item => ({
      date: new Date(item.date).toLocaleDateString(),
      steps: item.steps,
    }));
  }, [data.healthData]);

  return (
    <div className="space-y-8">
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Body Measurements</h2>
          <div className="grid grid-cols-4 gap-4">
            <div className="stat">
              <div className="stat-title">Weight</div>
              <div className="stat-value">{data.bodyStats.bodyMeasures.bodyWeight} lbs</div>
            </div>
            <div className="stat">
              <div className="stat-title">Chest</div>
              <div className="stat-value">{data.bodyStats.bodyMeasures.measurements.chest}"</div>
            </div>
            <div className="stat">
              <div className="stat-title">Waist</div>
              <div className="stat-value">{data.bodyStats.bodyMeasures.measurements.waist}"</div>
            </div>
            <div className="stat">
              <div className="stat-title">Hips</div>
              <div className="stat-value">{data.bodyStats.bodyMeasures.measurements.hips}"</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Daily Steps</h2>
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
                  stroke="#8884d8"
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Nutrition Trends</h2>
          <div className="h-[300px]">
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
                />
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
      </div>
    </div>
  );
} 