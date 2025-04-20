# Feature Requirements

### MVP

### Dashboard Copy

On the [dashboard page] I want the following copy to be displayed:

Welcome to FitReport.

(If the user does not have an active plan, show this message):

No active subscription
You need to subscribe to generate reports.

[Subscribe Now]

(If the user does have an active plan, show this):

Here's how to generate reports:

1. Enter your trainerize credentials
2. Import your clients from trainerize
3. Schedule & run your report


### Account logic

now what steps should I take to test this? I would like to make sure that the following logic is in place:

1. A user must have a subscription prior to doing anything on the app. This means the dashboard should be the only option available to them until they are subscribed.
2. Once they are subscribed, they should be able to access all other pages (clients, reports, trainerize configuration).
3. The data should be stored in supabase under the profiles table: customer_id, price_id, has_access.
4. They should have access as long as their subscription is active.


### trainerize connection

379136
aJeIYzJNUKTNIwU3hgyg
11974482

On the @page.tsx I want to be able to enter the required credentials:

1. Username
2. Password
3. Trainer ID

When "Save Configuration" is pressed, it will test the connection and display "Credentials Verified" or "Invalid Credentials" depending on the response.

It will use the following api authentication from trainerize @api-auth.md


Additionally, I want these credentials stored in supabase under the profile table.

Username = trainerize_username
Password = trainerize_password
Trainer ID = trainerize_id


### importing clients

Ok, now I want to work on the "Import Selected" functionality to import the user into FitReport and store them in our supabase database.

We will need to create a "clients" table. My initial thoughts on the table structure would be this:

id = unique id
trainer_id = trainer's id (this would be the trainer Id in the @page)
trainerize_id = client's user id
first_name = clients first name
last_name = cliesnt last name

Do you think this table set up is correct? Is there anything else you would add?


### reporting step 1

Now I want to work on the client reporting. To start let's just generate 1 report for a client at a time. Once we have that in place we can implement it for all clients.

Here's what I want to start with.

1. We will select a client to generate a report for.
2. We will select a time frame for the report.
3. We will select generate report.
4. We will then use the Trainerize API to fetch client details for that specific time period (weight, steps, calories, protein, carbs, and fats)
5. We will then display the weekly trend for each of those metrics.

Let's start with that.

Here are the api calls needed:

## Step 2: Fetch Client Body Stats

After verifying basic auth, test fetching a specific client's body stats.

### Request:
```bash
curl -X POST "https://api.trainerize.com/v03/bodystats/get" \
  -H "Authorization: Basic YOUR_BASE64_ENCODED_CREDENTIALS" \
  -H "Content-Type: application/json" \
  -d '{
    "userID": CLIENT_ID,
    "date": "2024-03-20",
    "unitBodystats": "inches",
    "unitWeight": "lbs"
  }'
```

Replace:
- `CLIENT_ID` with an actual client ID from the previous response

### Expected Successful Response:
```json
{
  "bodyMeasures": {
    "bodyWeight": 175.5,
    "measurements": {
      "chest": 42,
      "waist": 34,
      "hips": 40
    }
  }
}
```

## Step 3: Fetch Client Health Data

Test retrieving health metrics like steps.

### Request:
```bash
curl -X POST "https://api.trainerize.com/v03/healthData/getList" \
  -H "Authorization: Basic YOUR_BASE64_ENCODED_CREDENTIALS" \
  -H "Content-Type: application/json" \
  -d '{
    "userID": CLIENT_ID,
    "type": "step",
    "startDate": "2024-03-01",
    "endDate": "2024-03-20"
  }'
```

### Expected Successful Response:
```json
{
  "healthData": [
    {
      "date": "2024-03-20",
      "steps": 8500,
      "source": "fitbit"
    }
  ]
}
```

## Step 4: Fetch Nutrition Data

Verify nutrition data retrieval.

### Request:
```bash
curl -X POST "https://api.trainerize.com/v03/dailyNutrition/getList" \
  -H "Authorization: Basic YOUR_BASE64_ENCODED_CREDENTIALS" \
  -H "Content-Type: application/json" \
  -d '{
    "userID": CLIENT_ID,
    "startDate": "2024-03-20 00:00:00",
    "endDate": "2024-03-20 23:59:59"
  }'
```

### Expected Successful Response:
```json
{
  "nutrition": [
    {
      "date": "2024-03-20",
      "calories": 2100,
      "protein": 150,
      "carbs": 200,
      "fats": 70
    }
  ]
}
```

### Workout data

Let's work on grabbing client workout data and adding it to our report. this should be very similar to how we're grabbing our current information (weight, steps, calories, protein, carbs, fats).

Once we get the basic authentication like we've done prior (in the trainierize folder).

We will add 2 api posts.

The first is /calendar/getList

https://api.trainerize.com/v03/calendar/getList

Example Request:

const options = {
  method: 'POST',
  headers: {
    accept: 'application/json',
    'content-type': 'application/json',
    authorization: 'Basic Mzc5MTM2OmFKZUlZekpOVUtUTkl3VTNoZ3ln'
  },
  body: JSON.stringify({
    userID: 19823484,
    startDate: '2025-01-02',
    endDate: '2025-01-02',
    unitDistance: 'miles',
    unitWeight: 'lbs'
  })
};

fetch('https://api.trainerize.com/v03/calendar/getList', options)
  .then(res => res.json())
  .then(res => console.log(res))
  .catch(err => console.error(err));

  Example Response:

{
  "calendar": [
    {
      "date": "2025-01-02",
      "items": [
        {
          "id": 754259108,
          "type": "workoutRegular",
          "title": "Steve's Upper B",
          "status": "tracked",
          "subtitle": null,
          "sort": 10,
          "fromProgram": false,
          "userProgramID": null,
          "isAddon": false,
          "createdBy": {
            "id": 13076649,
            "firstName": null,
            "lastName": null
          },
          "numberOfComments": 1,
          "detail": {
            "workoutID": 169189272,
            "rpe": 1
          }
        },
        {
          "id": 756136349,
          "type": "cardio",
          "title": "General",
          "status": "tracked",
          "subtitle": null,
          "sort": 10,
          "fromProgram": false,
          "userProgramID": null,
          "isAddon": false,
          "createdBy": {
            "id": 19823484,
            "firstName": null,
            "lastName": null
          },
          "numberOfComments": 0,
          "detail": {
            "exerciseID": 327,
            "time": 3705,
            "distance": null,
            "targetDetail": null
          }
        },
        {
          "id": 756412727,
          "type": "cardio",
          "title": "Walking",
          "status": "tracked",
          "subtitle": null,
          "sort": 10,
          "fromProgram": false,
          "userProgramID": null,
          "isAddon": false,
          "createdBy": {
            "id": 19823484,
            "firstName": null,
            "lastName": null
          },
          "numberOfComments": 0,
          "detail": {
            "exerciseID": 136,
            "time": 1096,
            "distance": 0.9646583850931677,
            "targetDetail": null
          }
        },
        {
          "id": 756522747,
          "type": "cardio",
          "title": "Running",
          "status": "tracked",
          "subtitle": null,
          "sort": 10,
          "fromProgram": false,
          "userProgramID": null,
          "isAddon": false,
          "createdBy": {
            "id": 19823484,
            "firstName": null,
            "lastName": null
          },
          "numberOfComments": 0,
          "detail": {
            "exerciseID": 137,
            "time": 1015,
            "distance": 1.814472049689441,
            "targetDetail": null
          }
        },
        {
          "id": 195692123,
          "type": "bodyStat",
          "title": "182.5 lbs",
          "status": "tracked",
          "subtitle": null,
          "sort": 30,
          "fromProgram": false,
          "userProgramID": null,
          "isAddon": false,
          "createdBy": null,
          "numberOfComments": 0,
          "detail": {
            "weight": 182.5,
            "fat": null,
            "restingHeartRate": null,
            "bloodPressureDiastolic": 0,
            "bloodPressureSystolic": 0
          }
        },
        {
          "id": 247143445,
          "type": "nutrition",
          "title": "3 Meals Added",
          "status": "tracked",
          "subtitle": "Protein 195g, Carbs 94g, Fat 65g",
          "sort": 50,
          "fromProgram": false,
          "userProgramID": null,
          "isAddon": false,
          "createdBy": null,
          "numberOfComments": 0,
          "detail": {
            "meetGoal": true,
            "numberOfMeal": 3,
            "calories": 1648.25,
            "carbsGrams": 93.58,
            "proteinGrams": 195.22,
            "fatGrams": 65.09,
            "meals": null,
            "mealPhoto": null
          }
        },
        {
          "id": 740129347,
          "type": "habit",
          "title": "10k Steps",
          "status": "tracked",
          "subtitle": null,
          "sort": 55,
          "fromProgram": false,
          "userProgramID": null,
          "isAddon": false,
          "createdBy": null,
          "numberOfComments": 0,
          "detail": {
            "type": "customHabit"
          }
        },
        {
          "id": 740129727,
          "type": "habit",
          "title": "90 Oz of Water",
          "status": "tracked",
          "subtitle": null,
          "sort": 55,
          "fromProgram": false,
          "userProgramID": null,
          "isAddon": false,
          "createdBy": null,
          "numberOfComments": 0,
          "detail": {
            "type": "customHabit"
          }
        }
      ]
    }
  ]
}

We will extract the following data: If the "type" = "workoutRegular" we want to grab the "id": 754259108 and the "title": "Steve's Upper B"

And we will store this in an arrary of other workouts.

We will then use that array for the next post.

The next post is /dailyWorkout/get

https://api.trainerize.com/v03/dailyWorkout/get

The body params are an array of daily workout ids

Example Request:

const options = {
  method: 'POST',
  headers: {
    accept: 'application/json',
    'content-type': 'application/json',
    authorization: 'Basic Mzc5MTM2OmFKZUlZekpOVUtUTkl3VTNoZ3ln'
  }
};

fetch('https://api.trainerize.com/v03/dailyWorkout/get', options)
  .then(res => res.json())
  .then(res => console.log(res))
  .catch(err => console.error(err));

Example Response:

{
  "code": 0,
  "statusMsg": "OK",
  "dailyWorkouts": [
    {
      "id": 0,
      "fromProgram": true,
      "name": "string",
      "date": "2025-04-03",
      "startTime": "2025-04-03",
      "endTime": "2025-04-03",
      "duration": 10,
      "workDuration": 10,
      "type": "string",
      "media": {
        "id": 0,
        "type": "string",
        "status": "string",
        "duration": 100,
        "usage": 0,
        "closeCaptionFileName": "string",
        "videoUrl": {
          "hls": "string",
          "hlssd": "string",
          "hlshd": "string"
        },
        "thumbnailUrl": {
          "hd": "string",
          "sd": "string"
        }
      },
      "instructions": "string",
      "hasOverride": true,
      "status": "string",
      "style": "string",
      "workoutID": 0,
      "notes": "string",
      "intervalProgress": 10,
      "numberOfComments": 10,
      "trackingStats": {
        "stats": {
          "maxHeartRate": 0,
          "avgHeartRate": 0,
          "calories": 0,
          "activeCalories": 0
        }
      },
      "exercises": [
        {
          "dailyExerciseID": 0,
          "def": {
            "id": 0,
            "name": "string",
            "description": "string",
            "sets": 0,
            "target": "string",
            "targetDetail": "string",
            "side": "string",
            "superSetID": 0,
            "supersetType": "string",
            "intervalTime": 0,
            "restTime": 0,
            "recordType": "string",
            "type": "string",
            "videoType": "string",
            "videoUrl": "string",
            "videoStatus": "string",
            "numPhotos": 0,
            "media": {
              "type": "string",
              "status": "string",
              "default": {
                "videoToken": "string",
                "loopVideoToken": "string",
                "videoUrl": {
                  "fhd": "string",
                  "hd": "string",
                  "hls": "string",
                  "sd": "string",
                  "hlshd": "string",
                  "hlssd": "string"
                },
                "loopVideoUrl": {
                  "fhd": "string",
                  "hd": "string",
                  "hls": "string",
                  "sd": "string"
                },
                "thumbnailUrl": {
                  "hd": "string",
                  "sd": "string"
                }
              },
              "female": {
                "videoToken": "string",
                "loopVideoToken": "string",
                "videoUrl": {
                  "fhd": "string",
                  "hd": "string",
                  "hls": "string",
                  "sd": "string",
                  "hlshd": "string",
                  "hlssd": "string"
                },
                "loopVideoUrl": {
                  "fhd": "string",
                  "hd": "string",
                  "hls": "string",
                  "sd": "string"
                },
                "thumbnailUrl": {
                  "hd": "string",
                  "sd": "string"
                }
              }
            },
            "stats": [
              {
                "setID": 0,
                "reps": 0,
                "weight": 0,
                "distance": 0,
                "time": 0,
                "calories": 0,
                "level": 0,
                "speed": 0
              }
            ]
          }
        }
      ],
      "dateUpdated": "2015-07-22 01:01:55"
    }
  ]
}

We will take the exercises and the sets, reps, and weight for each exercise. And add them to our report to be displayed.

