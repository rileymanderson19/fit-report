### 1. Get All Active Clients

This endpoint retrieves all currently active clients.

#### Request:
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

#### Expected Response:
```json
{
  "users": [
    {
      "id": 123456,
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "status": "active",
      "profileIconUrl": "https://...",
      "lastSignInDate": "2024-03-20T15:30:00Z"
    }
  ]
}
```