# Step-by-Step Trainerize API Verification Guide

This guide will walk you through verifying your Trainerize API connection step by step.

## Prerequisites

You'll need:
- Your Trainerize username
- Your Trainerize password
- Your Trainerize trainer ID
- A tool like Postman, cURL, or Thunder Client

## Step 1: Basic Authentication Test

First, let's verify basic authentication with the client list endpoint.

### Request:
```bash
curl -X POST "https://api.trainerize.com/v03/user/getClientList" \
  -H "Authorization: Basic YOUR_BASE64_ENCODED_CREDENTIALS" \
  -H "Content-Type: application/json" \
  -d '{
    "userID": YOUR_TRAINER_ID,
    "view": "allActive",
    "sort": "name"
  }'
```

Replace:
- `YOUR_BASE64_ENCODED_CREDENTIALS` with Base64 encoded `username:password`
- `YOUR_TRAINER_ID` with your numeric trainer ID

### Expected Successful Response:
```json
{
  "users": [
    {
      "id": 123456,
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "status": "active",
      "profileIconUrl": "https://..."
    }
  ]
}
```

### Common Error Responses:
```json
// 401 Unauthorized
{
  "error": "Invalid credentials"
}

// 403 Forbidden
{
  "error": "Access denied"
}
```