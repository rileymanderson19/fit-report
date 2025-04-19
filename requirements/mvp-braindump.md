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