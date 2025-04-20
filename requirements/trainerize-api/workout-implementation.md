# Trainerize API Integration: Developer Guide

This document provides technical details for implementing workout data extraction from the Trainerize API.

## API Endpoints

We use the following Trainerize API endpoints:

1. **`/calendar/getList`** - Primary endpoint for getting basic workout data
2. **`/dailyWorkout/get`** - Secondary endpoint for fetching detailed exercise information

## Authentication

Trainerize API uses Basic Authentication:

```javascript
// Example authentication header creation
const encodedAuth = Buffer.from(`${username}:${password}`).toString('base64');
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Basic ${encodedAuth}`
};
```

## Implementation Steps

### 1. Fetch Basic Workout Data

First, call the `/calendar/getList` endpoint to get all workout IDs and basic information:

```javascript
// Example request to /calendar/getList
const response = await fetch('https://api.trainerize.com/v03/calendar/getList', {
  method: 'POST',
  headers,
  body: JSON.stringify({
    userID: clientId,
    startDate: '2025-03-05',  // Format: YYYY-MM-DD
    endDate: '2025-04-05',    // Format: YYYY-MM-DD
    unitDistance: 'miles',
    unitWeight: 'lbs'
  })
});

const data = await response.json();
```

### 2. Extract Workout Information

Filter the calendar items to focus on the workout data:

```javascript
const workouts = [];

data.calendar.forEach(day => {
  if (day.items) {
    day.items.forEach(item => {
      if (item.type === 'workoutRegular') {
        workouts.push({
          id: item.id,              // Daily workout ID
          title: item.title,        // Workout name
          date: day.date,           // Date of workout
          status: item.status,      // "tracked" or "scheduled"
          workoutID: item.detail?.workoutID  // Template ID
        });
      }
    });
  }
});
```

### 3. Fetch Exercise Details

For each workout, call the `/dailyWorkout/get` endpoint to fetch exercise details:

```javascript
// Example request to /dailyWorkout/get for a single workout
const detailsResponse = await fetch('https://api.trainerize.com/v03/dailyWorkout/get', {
  method: 'POST',
  headers,
  body: JSON.stringify({
    ids: [workoutId]  // Array of daily workout IDs
  })
});

const detailsData = await detailsResponse.json();
```

### 4. Process Exercise Data

Extract sets, reps, and weights from the response:

```javascript
// Example processing exercise data
if (detailsData.dailyWorkouts && detailsData.dailyWorkouts.length > 0) {
  const dailyWorkout = detailsData.dailyWorkouts[0];
  
  // Add exercises to the workout object
  const workout = workouts.find(w => w.id === dailyWorkout.id);
  if (workout) {
    workout.exercises = dailyWorkout.exercises;
  }
}
```

### 5. Group Workouts by Template

For progress tracking, group workouts by template ID:

```javascript
// Group workouts by template ID
const workoutsByTemplate = new Map();

workouts.forEach(workout => {
  if (workout.workoutID) {
    if (!workoutsByTemplate.has(workout.workoutID)) {
      workoutsByTemplate.set(workout.workoutID, []);
    }
    workoutsByTemplate.get(workout.workoutID)?.push(workout);
  }
});

// Create grouped objects
const groupedWorkouts = [];
workoutsByTemplate.forEach((workouts, templateId) => {
  if (workouts.length > 0) {
    groupedWorkouts.push({
      templateId,
      title: workouts[0].title,
      workouts: workouts.sort((a, b) => a.date.localeCompare(b.date))
    });
  }
});
```

## Key Data Structures

### Workout Item

```typescript
interface WorkoutItem {
  id: number;
  title: string;
  date: string;
  status: string;
  workoutID?: number;
  exercises?: ExerciseItem[];
}
```

### Exercise Item

```typescript
interface ExerciseItem {
  dailyExerciseID: number;
  def: {
    id: number;
    name: string;
    description?: string;
    sets?: number;
    target?: string;
    recordType?: string;
  };
  stats: ExerciseSetStats[];
}
```

### Exercise Set Stats

```typescript
interface ExerciseSetStats {
  setID: number;
  reps?: number;
  weight?: number;
  time?: number;
  distance?: number;
}
```

## API Limitations

- The `/dailyWorkout/get` endpoint requires the daily workout ID, not the template ID
- Some data like RPE (Rate of Perceived Exertion) is not directly accessible through the API
- There's no batch endpoint for getting all workouts for a client in a single request

## Error Handling

Our implementation includes the following error handling strategies:

1. Validating required credentials and parameters
2. Handling network errors with appropriate status codes
3. Gracefully continuing even if some workout details cannot be fetched
4. Providing detailed error messages to aid in troubleshooting

## Performance Considerations

- For large date ranges, consider fetching data in smaller chunks
- Implement caching to reduce API calls
- Process workouts in batches when fetching details
- Filter out non-essential data like warm-up exercises (e.g., walking) 