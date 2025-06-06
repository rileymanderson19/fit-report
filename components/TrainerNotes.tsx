import React, { useState } from 'react';

interface DailyData {
  date: string;
  weight: number;
  steps: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  sleepHours: number;
  workouts?: any[];
}

interface WeeklyAverage {
  weekStart: string;
  weekEnd: string;
  avgWeight: number;
  avgSteps: number;
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFats: number;
  avgSleepHours: number;
}

interface TrainerNotesProps {
  dailyData: DailyData[];
  weeklyAverages: WeeklyAverage[];
  clientName: string;
  isScreenshotMode?: boolean;
}

export function TrainerNotes({ dailyData, weeklyAverages, clientName, isScreenshotMode = false }: TrainerNotesProps) {
  const [notes, setNotes] = useState('');
  const [showAISuggestions, setShowAISuggestions] = useState(false);

  // Generate AI coaching suggestions based on data patterns
  const generateCoachingSuggestions = React.useMemo(() => {
    if (dailyData.length === 0) return [];

    const suggestions: string[] = [];

    // Analyze patterns and generate specific suggestions
    const avgSteps = dailyData.reduce((sum, day) => sum + day.steps, 0) / dailyData.length;
    const avgSleep = dailyData.reduce((sum, day) => sum + day.sleepHours, 0) / dailyData.length;
    const avgProtein = dailyData.reduce((sum, day) => sum + day.protein, 0) / dailyData.length;
    const workoutDays = dailyData.filter(day => day.workouts && day.workouts.length > 0).length;
    const workoutConsistency = workoutDays / dailyData.length;

    // Sleep coaching
    if (avgSleep < 6.5) {
      suggestions.push(`${clientName} is averaging only ${avgSleep.toFixed(1)} hours of sleep. Recommend establishing a bedtime routine and discussing sleep hygiene practices.`);
    } else if (avgSleep >= 7.5 && avgSleep <= 9) {
      suggestions.push(`Excellent sleep habits! ${clientName} is consistently getting quality rest, which supports recovery and performance.`);
    }

    // Activity coaching
    if (avgSteps < 7000) {
      suggestions.push(`Daily activity is below optimal levels (${Math.round(avgSteps).toLocaleString()} steps). Suggest adding 2-3 short walks or increasing daily movement.`);
    } else if (avgSteps >= 10000) {
      suggestions.push(`Great job staying active! ${clientName} is consistently hitting step goals, showing excellent lifestyle habits.`);
    }

    // Workout consistency coaching
    if (workoutConsistency < 0.3) {
      suggestions.push(`Training frequency could improve. Consider discussing barriers to consistency and potentially adjusting the program schedule.`);
    } else if (workoutConsistency >= 0.5) {
      suggestions.push(`Excellent training consistency! ${clientName} is showing strong commitment to their fitness routine.`);
    }

    // Nutrition coaching
    if (avgProtein < 60) {
      suggestions.push(`Protein intake may be insufficient for goals (${avgProtein.toFixed(0)}g/day). Discuss protein sources and meal planning strategies.`);
    } else if (avgProtein >= 80) {
      suggestions.push(`Solid protein intake supporting muscle recovery and satiety goals.`);
    }

    // Weekly progress analysis
    if (weeklyAverages.length >= 2) {
      const latest = weeklyAverages[weeklyAverages.length - 1];
      const previous = weeklyAverages[weeklyAverages.length - 2];
      
      const weightChange = latest.avgWeight - previous.avgWeight;
      if (Math.abs(weightChange) > 2) {
        const direction = weightChange > 0 ? 'gained' : 'lost';
        suggestions.push(`Significant weight change: ${direction} ${Math.abs(weightChange).toFixed(1)} lbs this week. Monitor and discuss if this aligns with goals.`);
      }

      const stepsChange = ((latest.avgSteps - previous.avgSteps) / previous.avgSteps) * 100;
      if (stepsChange > 15) {
        suggestions.push(`Great improvement in daily activity! Steps increased by ${stepsChange.toFixed(0)}% this week.`);
      }
    }

    return suggestions;
  }, [dailyData, weeklyAverages, clientName]);

  const handleSaveNotes = () => {
    // In a real app, this would save to the database
    console.log('Saving trainer notes:', notes);
    // You could make an API call here to save the notes
  };

  return (
    <div className="card bg-base-200/50 shadow-lg">
      <div className="card-body">
        <div className="flex justify-between items-center mb-4">
          <h3 className="card-title text-xl flex items-center gap-2">
            📝 Trainer Notes & Coaching Suggestions
          </h3>
          {!isScreenshotMode && (
            <button
              className="btn btn-sm btn-outline"
              onClick={() => setShowAISuggestions(!showAISuggestions)}
            >
              {showAISuggestions ? 'Hide' : 'Show'} AI Suggestions
            </button>
          )}
        </div>

        {/* AI-Generated Coaching Suggestions */}
        {(showAISuggestions || isScreenshotMode) && generateCoachingSuggestions.length > 0 && (
          <div className="mb-6">
            <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
              🤖 AI Coaching Insights
            </h4>
            <div className="space-y-3">
              {generateCoachingSuggestions.map((suggestion, index) => (
                <div key={index} className="alert alert-info">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span className="text-sm">{suggestion}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Manual Trainer Notes */}
        <div>
          <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
            ✍️ Personal Trainer Notes
          </h4>
          
          {!isScreenshotMode ? (
            <div className="space-y-4">
              <textarea
                className="textarea textarea-bordered w-full h-32"
                placeholder={`Add your personal notes and coaching observations for ${clientName}...

Examples:
• Client mentioned feeling more energetic this week
• Discussed form improvements for squats
• Planning to increase training intensity next week
• Celebrating consistency improvements!`}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              
              <div className="flex justify-between items-center">
                <div className="text-sm text-base-content/60">
                  {notes.length} characters
                </div>
                <div className="flex gap-2">
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => setNotes('')}
                  >
                    Clear
                  </button>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={handleSaveNotes}
                    disabled={!notes.trim()}
                  >
                    Save Notes
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // Display mode for screenshots
            <div className="bg-base-100 p-4 rounded-lg border">
              {notes.trim() ? (
                <div className="whitespace-pre-wrap text-sm">
                  {notes}
                </div>
              ) : (
                <div className="text-base-content/60 italic text-sm">
                  No additional trainer notes for this period.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Action Buttons for Common Notes */}
        {!isScreenshotMode && (
          <div className="mt-4">
            <h5 className="font-medium mb-2">Quick Actions:</h5>
            <div className="flex flex-wrap gap-2">
              {[
                'Great progress this week! 💪',
                'Focus on consistency moving forward',
                'Excellent adherence to nutrition plan',
                'Consider increasing training intensity',
                'Sleep improvements showing results',
                'Celebrate non-scale victories!'
              ].map((quickNote, index) => (
                <button
                  key={index}
                  className="btn btn-xs btn-outline"
                  onClick={() => setNotes(prev => prev ? `${prev}\n\n• ${quickNote}` : `• ${quickNote}`)}
                >
                  {quickNote}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Report Summary for Trainer */}
        <div className="mt-6 p-4 bg-primary/10 rounded-lg">
          <h5 className="font-semibold mb-2">📊 Quick Report Summary</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div>
              <strong>Period:</strong> {dailyData.length} days
            </div>
            <div>
              <strong>Avg Daily Steps:</strong> {Math.round(dailyData.reduce((sum, day) => sum + day.steps, 0) / dailyData.length).toLocaleString()}
            </div>
            <div>
              <strong>Avg Sleep:</strong> {(dailyData.reduce((sum, day) => sum + day.sleepHours, 0) / dailyData.length).toFixed(1)} hrs
            </div>
            <div>
              <strong>Training Days:</strong> {dailyData.filter(day => day.workouts && day.workouts.length > 0).length}/{dailyData.length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 