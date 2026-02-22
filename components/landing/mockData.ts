import { BrandConfig } from '@/hooks/useBrandConfig';

// Sample brand for landing page demos
export const demoBrand: BrandConfig = {
  logo_url: null,
  business_name: 'Peak Performance Coaching',
  primary_color: '#2563EB',
  accent_color: '#1D4ED8',
  footer_text: null,
  show_fitreport_badge: true,
};

// 28 days of realistic weight data trending down
export const demoDailyWeightData = [
  { date: '2026-01-25', weight: 172.0 },
  { date: '2026-01-26', weight: 171.6 },
  { date: '2026-01-27', weight: 172.2 },
  { date: '2026-01-28', weight: 171.4 },
  { date: '2026-01-29', weight: 171.0 },
  { date: '2026-01-30', weight: 170.8 },
  { date: '2026-01-31', weight: 171.2 },
  { date: '2026-02-01', weight: 170.6 },
  { date: '2026-02-02', weight: 170.2 },
  { date: '2026-02-03', weight: 170.8 },
  { date: '2026-02-04', weight: 169.8 },
  { date: '2026-02-05', weight: 169.4 },
  { date: '2026-02-06', weight: 170.0 },
  { date: '2026-02-07', weight: 169.6 },
  { date: '2026-02-08', weight: 169.2 },
  { date: '2026-02-09', weight: 169.0 },
  { date: '2026-02-10', weight: 168.6 },
  { date: '2026-02-11', weight: 168.8 },
  { date: '2026-02-12', weight: 168.2 },
  { date: '2026-02-13', weight: 168.4 },
  { date: '2026-02-14', weight: 167.8 },
  { date: '2026-02-15', weight: 167.4 },
  { date: '2026-02-16', weight: 167.6 },
  { date: '2026-02-17', weight: 167.0 },
  { date: '2026-02-18', weight: 167.2 },
  { date: '2026-02-19', weight: 166.6 },
  { date: '2026-02-20', weight: 166.8 },
  { date: '2026-02-21', weight: 166.2 },
];

export const demoWeeklyAverages = [
  { weekStart: '2026-01-25', avgWeight: 171.5 },
  { weekStart: '2026-02-01', avgWeight: 170.1 },
  { weekStart: '2026-02-08', avgWeight: 168.9 },
  { weekStart: '2026-02-15', avgWeight: 167.1 },
];

export const demoWeightData = {
  startWeight: 172.0,
  currentWeight: 166.2,
  lowestWeight: 166.2,
  trend: 'down' as const,
  weeklyChange: -1.45,
};

export const demoGoalWeight = 160;

export const demoWeeklyData = {
  workoutsCompleted: 4,
  workoutsScheduled: 5,
  avgDailySteps: 9247,
  stepsGoal: 10000,
  avgCalories: 2180,
  caloriesGoal: 2200,
  avgProtein: 168,
  proteinGoal: 170,
  avgCarbs: 215,
  avgFats: 72,
};

// AI Coaching Notes
export const demoCoachingNotes = {
  summary: "Timmy had a strong 4-week block. Weight is trending down consistently at ~1.4 lbs/week, hitting protein targets most days, and workout attendance is solid at 4x/week. Sleep could use some attention — a few nights dipped below 6 hours which may be impacting recovery.",
  keyInsights: [
    "Weight loss is steady and sustainable — no crash patterns",
    "Protein averaging 168g/day (99% of target) — excellent compliance",
    "Steps averaging 9,247/day — just under 10k goal, weekends are the weak spot",
    "Sleep dropped below 6hrs on 4 nights — correlates with higher weigh-ins the next day",
  ],
  actionItems: [
    "Keep current calorie target — the deficit is working well",
    "Add a 10-min evening walk on weekends to close the steps gap",
    "Discuss sleep hygiene — aim for 7+ hrs consistently",
    "Consider adding a deload week after next block to support recovery",
  ],
};

// Period Trends (week-by-week averages)
export const demoPeriodTrends = [
  { week: 'Week 1', dates: 'Jan 25 - 31', weight: 171.5, calories: 2210, protein: 165, carbs: 220, fats: 74, steps: 8940 },
  { week: 'Week 2', dates: 'Feb 1 - 7', weight: 170.1, calories: 2190, protein: 170, carbs: 218, fats: 71, steps: 9120 },
  { week: 'Week 3', dates: 'Feb 8 - 14', weight: 168.9, calories: 2160, protein: 168, carbs: 210, fats: 72, steps: 9380 },
  { week: 'Week 4', dates: 'Feb 15 - 21', weight: 167.1, calories: 2170, protein: 172, carbs: 212, fats: 70, steps: 9540 },
];

// Recent Workouts
export const demoRecentWorkouts = [
  {
    name: 'Upper Body A',
    sessions: [
      { date: 'Feb 18', exercises: [
        { name: 'Bench Press', sets: '4 × 8 @ 185 lbs' },
        { name: 'Barbell Row', sets: '4 × 8 @ 155 lbs' },
        { name: 'Overhead Press', sets: '3 × 10 @ 95 lbs' },
        { name: 'Face Pulls', sets: '3 × 15 @ 30 lbs' },
      ]},
      { date: 'Feb 11', exercises: [
        { name: 'Bench Press', sets: '4 × 8 @ 180 lbs' },
        { name: 'Barbell Row', sets: '4 × 8 @ 150 lbs' },
        { name: 'Overhead Press', sets: '3 × 10 @ 90 lbs' },
        { name: 'Face Pulls', sets: '3 × 15 @ 30 lbs' },
      ]},
    ],
  },
  {
    name: 'Lower Body A',
    sessions: [
      { date: 'Feb 19', exercises: [
        { name: 'Back Squat', sets: '4 × 6 @ 225 lbs' },
        { name: 'Romanian Deadlift', sets: '3 × 10 @ 165 lbs' },
        { name: 'Leg Press', sets: '3 × 12 @ 360 lbs' },
        { name: 'Calf Raises', sets: '4 × 15 @ 135 lbs' },
      ]},
      { date: 'Feb 12', exercises: [
        { name: 'Back Squat', sets: '4 × 6 @ 220 lbs' },
        { name: 'Romanian Deadlift', sets: '3 × 10 @ 160 lbs' },
        { name: 'Leg Press', sets: '3 × 12 @ 350 lbs' },
        { name: 'Calf Raises', sets: '4 × 15 @ 135 lbs' },
      ]},
    ],
  },
];

// Progress Photos
export const demoProgressPhotos = [
  {
    pose: 'Front',
    photos: [
      { label: 'Initial', date: 'Oct 15', src: '/images/demo/timmyfront1.jpeg' },
      { label: 'Previous', date: 'Jan 20', src: '/images/demo/timmyfront2.jpeg' },
      { label: 'Latest', date: 'Feb 18', src: '/images/demo/timmyfront3.jpeg' },
    ],
  },
  {
    pose: 'Side',
    photos: [
      { label: 'Initial', date: 'Oct 15', src: '/images/demo/timmyside1.jpeg' },
      { label: 'Previous', date: 'Jan 20', src: '/images/demo/timmyside2.jpeg' },
      { label: 'Latest', date: 'Feb 18', src: '/images/demo/timmyside3.jpeg' },
    ],
  },
  {
    pose: 'Back',
    photos: [
      { label: 'Initial', date: 'Oct 15', src: '/images/demo/timmyback1.jpeg' },
      { label: 'Previous', date: 'Jan 20', src: '/images/demo/timmyback2.jpeg' },
      { label: 'Latest', date: 'Feb 18', src: '/images/demo/timmyback3.jpeg' },
    ],
  },
];

// Client list mockup data for the "at a glance" feature visual
export const demoClientList = [
  { name: 'Timmy R.', status: 'On Track', goal: 'Fat Loss', change: '-1.4 lbs' },
  { name: 'James R.', status: 'On Track', goal: 'Muscle Gain', change: '+0.8 lbs' },
  { name: 'Emily T.', status: 'Watch', goal: 'Fat Loss', change: '-0.2 lbs' },
  { name: 'Mike D.', status: 'Needs Attention', goal: 'Maintenance', change: '+2.1 lbs' },
  { name: 'Lisa K.', status: 'On Track', goal: 'Fat Loss', change: '-1.8 lbs' },
];
