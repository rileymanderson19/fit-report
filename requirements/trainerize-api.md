# Verifying Trainerize API Integration

This technical guide outlines the steps to verify the Trainerize API integration at the API level.

## API Endpoints Overview

FitReport uses the following Trainerize API endpoints:
- `https://api.trainerize.com/v03/user/getClientList` - Fetch client list
- `https://api.trainerize.com/v03/bodystats/get` - Get client body stats
- `https://api.trainerize.com/v03/healthData/getList` - Get health data
- `https://api.trainerize.com/v03/dailyNutrition/getList` - Get nutrition data
- `https://api.trainerize.com/v03/habits/getList` - Get habits data

## Authentication Verification

### 1. Test Basic Authentication

```bash
# Replace with actual credentials
USERNAME="your_username"
PASSWORD="your_password"
AUTH_HEADER=$(echo -n "${USERNAME}:${PASSWORD}" | base64)

# Test authentication
curl -X POST "https://api.trainerize.com/v03/user/getClientList" \
  -H "Authorization: Basic ${AUTH_HEADER}" \
  -H "Content-Type: application/json" \
  -d '{
    "userID": YOUR_TRAINER_ID,
    "view": "allActive",
    "sort": "name"
  }'
```

Expected successful response:
```json
{
  "users": [
    {
      "id": number,
      "firstName": string,
      "lastName": string,
      "email": string,
      "status": string,
      "profileIconUrl": string
    }
  ]
}
```

## API Endpoint Verification

### 1. Client List Endpoint

```bash
# Test client list retrieval
curl -X POST "/api/trainerize/clients" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "your_username",
    "password": "your_password",
    "trainerId": "your_trainer_id"
  }'
```

Expected response code: 200
Expected response format:
```json
{
  "users": [
    {
      "id": number,
      "firstName": string,
      "lastName": string,
      "email": string,
      "status": string,
      "profileIconUrl": string
    }
  ]
}
```

### 2. Client Metrics Endpoint

```bash
# Test client metrics retrieval
curl -X POST "/api/trainerize/sync-client-data" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "your_username",
    "password": "your_password",
    "trainerId": "your_trainer_id",
    "clientId": "target_client_id",
    "fromDate": "2024-01-01",
    "toDate": "2024-01-31"
  }'
```

Expected response code: 200
Expected response format:
```json
{
  "success": true,
  "metricsToSave": [
    {
      "date": string,
      "weight": number | null,
      "steps": number | null,
      "calories": number | null,
      "protein": number | null,
      "carbs": number | null,
      "fats": number | null
    }
  ]
}
```

### 3. Client Habits Endpoint

```bash
# Test habits retrieval
curl -X POST "/api/trainerize/habits" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "your_username",
    "password": "your_password",
    "clientId": "target_client_id"
  }'
```

Expected response code: 200
Expected response format:
```json
{
  "habits": [
    {
      "habitId": number,
      "name": string,
      "currentStreak": number,
      "longestStreak": number
    }
  ]
}
```

## Error Response Verification

Test error handling by sending invalid requests:

### 1. Invalid Credentials

```bash
curl -X POST "/api/trainerize/clients" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "invalid_username",
    "password": "invalid_password",
    "trainerId": "your_trainer_id"
  }'
```

Expected response code: 401
Expected response:
```json
{
  "error": "Authentication failed"
}
```

### 2. Missing Required Parameters

```bash
curl -X POST "/api/trainerize/sync-client-data" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "your_username",
    "password": "your_password"
  }'
```

Expected response code: 400
Expected response:
```json
{
  "error": "Missing required parameters"
}
```

## Database Sync Verification

### 1. Check Client Data Storage

```sql
-- Check if clients are stored in database
SELECT * FROM clients 
WHERE user_id = 'your_user_id' 
LIMIT 1;
```

Expected: At least one client record

### 2. Verify Metrics Storage

```sql
-- Check if metrics are stored
SELECT * FROM client_metrics 
WHERE user_id = 'your_user_id' 
  AND client_id = 'target_client_id' 
  AND date >= '2024-01-01' 
LIMIT 1;
```

Expected: Metrics records if client has data

## Common API Error Codes

- `400`: Bad Request - Missing or invalid parameters
- `401`: Unauthorized - Invalid credentials
- `403`: Forbidden - Valid credentials but insufficient permissions
- `404`: Not Found - Resource doesn't exist
- `429`: Too Many Requests - Rate limit exceeded
- `500`: Internal Server Error - Server-side issue
- `503`: Service Unavailable - Trainerize API temporarily unavailable

## Rate Limiting

- Base rate limit: 100 requests per minute
- Burst limit: 150 requests per minute
- Recommended: Implement exponential backoff for retries

## Monitoring Integration Health

1. Monitor API response times:
```javascript
const startTime = Date.now();
const response = await fetch('/api/trainerize/clients', {...});
const duration = Date.now() - startTime;
console.log(`API call took ${duration}ms`);
```

2. Track error rates:
```javascript
try {
  const response = await fetch('/api/trainerize/clients', {...});
  if (!response.ok) {
    // Log error to monitoring system
    console.error(`API error: ${response.status}`);
  }
} catch (error) {
  // Log error to monitoring system
  console.error(`API call failed: ${error.message}`);
}
```

## Security Considerations

1. Always use HTTPS for API calls
2. Never log complete API responses (may contain sensitive data)
3. Implement request timeout (recommended: 30 seconds)
4. Store credentials securely (use environment variables)
5. Implement API key rotation schedule

## Troubleshooting Tools

1. Network monitoring:
```javascript
// Enable detailed network logging
await fetch('/api/trainerize/clients', {
  signal: AbortSignal.timeout(30000), // 30s timeout
}).catch(error => {
  if (error.name === 'AbortError') {
    console.error('Request timed out');
  }
});
```

2. Response validation:
```javascript
function validateClientResponse(data) {
  if (!data.users || !Array.isArray(data.users)) {
    throw new Error('Invalid response format');
  }
  return data;
}
``` 