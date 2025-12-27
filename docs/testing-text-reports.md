# Testing Text-Based Reports API

This guide explains how to test the `/api/reports/generate-text` endpoint.

## Prerequisites

1. Make sure your development server is running:
   ```bash
   npm run dev
   ```

2. You need to be logged in (the endpoint requires authentication)

## Testing Methods

### Method 1: Using Browser DevTools Console

1. Open your app in the browser and log in
2. Open DevTools (F12) and go to the Console tab
3. Run this code:

```javascript
// Test with existing report ID
async function testWithReportId() {
  const response = await fetch('/api/reports/generate-text', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      reportId: 'YOUR_REPORT_ID_HERE', // Replace with actual report ID
      template: 'enhanced',
      weightUnit: 'lbs'
    })
  });
  
  const data = await response.json();
  console.log('Response:', data);
  console.log('Text Preview:', data.text.substring(0, 500));
  return data;
}

// Test with client ID and date range (generates on-the-fly)
async function testWithClientId() {
  const response = await fetch('/api/reports/generate-text', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      clientId: 'YOUR_CLIENT_ID_HERE', // Replace with actual client ID
      dateRange: {
        from: '2024-01-01T00:00:00Z',
        to: '2024-01-07T23:59:59Z'
      },
      template: 'enhanced',
      weightUnit: 'lbs'
    })
  });
  
  const data = await response.json();
  console.log('Response:', data);
  console.log('Text Preview:', data.text.substring(0, 500));
  return data;
}

// Run the test
testWithClientId();
```

### Method 2: Using cURL (requires auth token)

First, get your session cookie or auth token from the browser:

1. Open DevTools → Application/Storage → Cookies
2. Copy your session cookie value

Then run:

```bash
# Test with report ID
curl -X POST http://localhost:3000/api/reports/generate-text \
  -H "Content-Type: application/json" \
  -H "Cookie: YOUR_SESSION_COOKIE_HERE" \
  -d '{
    "reportId": "YOUR_REPORT_ID",
    "template": "enhanced",
    "weightUnit": "lbs"
  }'

# Test with client ID
curl -X POST http://localhost:3000/api/reports/generate-text \
  -H "Content-Type: application/json" \
  -H "Cookie: YOUR_SESSION_COOKIE_HERE" \
  -d '{
    "clientId": "YOUR_CLIENT_ID",
    "dateRange": {
      "from": "2024-01-01T00:00:00Z",
      "to": "2024-01-07T23:59:59Z"
    },
    "template": "daily",
    "weightUnit": "kg"
  }'
```

### Method 3: Create a Test Page

Create a simple test page in your dashboard to test the endpoint with a UI.

## Test Scenarios

### 1. Test All Templates

```javascript
const templates = ['daily', 'weekly', 'enhanced'];

for (const template of templates) {
  const response = await fetch('/api/reports/generate-text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: 'YOUR_CLIENT_ID',
      dateRange: {
        from: '2024-01-01T00:00:00Z',
        to: '2024-01-07T23:59:59Z'
      },
      template: template,
      weightUnit: 'lbs'
    })
  });
  
  const data = await response.json();
  console.log(`\n=== ${template.toUpperCase()} TEMPLATE ===`);
  console.log(data.text);
}
```

### 2. Test Weight Unit Conversion

```javascript
const units = ['lbs', 'kg'];

for (const unit of units) {
  const response = await fetch('/api/reports/generate-text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: 'YOUR_CLIENT_ID',
      dateRange: {
        from: '2024-01-01T00:00:00Z',
        to: '2024-01-07T23:59:59Z'
      },
      template: 'enhanced',
      weightUnit: unit
    })
  });
  
  const data = await response.json();
  console.log(`\n=== ${unit.toUpperCase()} ===`);
  console.log(data.text.substring(0, 300));
}
```

### 3. Test with Existing Report

```javascript
// First, get a report ID from your database or UI
const reportId = 'YOUR_REPORT_ID';

const response = await fetch('/api/reports/generate-text', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    reportId: reportId,
    template: 'enhanced',
    weightUnit: 'lbs'
  })
});

const data = await response.json();
console.log('Report Text:', data.text);
console.log('Metadata:', data.metadata);
```

### 4. Test Error Cases

```javascript
// Test missing required fields
const test1 = await fetch('/api/reports/generate-text', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({})
});
console.log('Missing fields:', await test1.json());

// Test invalid report ID
const test2 = await fetch('/api/reports/generate-text', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    reportId: 'invalid-id'
  })
});
console.log('Invalid report:', await test2.json());
```

## Getting Test Data

### Find a Report ID

1. Go to your dashboard reports page
2. Open DevTools → Network tab
3. Click on a report
4. Look for API calls that include a report ID
5. Or query your database directly

### Find a Client ID

1. Go to your dashboard clients page
2. Open DevTools → Network tab
3. Look for API calls that include client IDs
4. Or check the URL when viewing a client: `/dashboard/clients/[id]`

## Verifying Output

1. **Check the response structure:**
   - Should have `text` (string) and `metadata` (object)

2. **Check markdown formatting:**
   - Headers should use `#`, `##`, `###`
   - Tables should use `|` syntax
   - Bold text should use `**text**`

3. **Test in Discord:**
   - Copy the `text` field from the response
   - Paste it into a Discord message
   - Verify it renders correctly

4. **Check template differences:**
   - `daily`: Should show daily metrics table and daily workouts
   - `weekly`: Should show weekly workout summaries
   - `enhanced`: Should include analytics, trends, and improvement areas

## Quick Test Script

Save this as `test-text-report.js` and run it in your browser console:

```javascript
// Quick test function
async function quickTest() {
  // Replace these with your actual IDs
  const CLIENT_ID = 'your-client-id-here';
  const REPORT_ID = 'your-report-id-here'; // Optional
  
  console.log('🧪 Testing Text Report API...\n');
  
  // Test 1: With report ID
  if (REPORT_ID && REPORT_ID !== 'your-report-id-here') {
    console.log('Test 1: Testing with report ID...');
    try {
      const res1 = await fetch('/api/reports/generate-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: REPORT_ID,
          template: 'enhanced',
          weightUnit: 'lbs'
        })
      });
      const data1 = await res1.json();
      console.log('✅ Success! Text length:', data1.text.length);
      console.log('Preview:', data1.text.substring(0, 200));
    } catch (error) {
      console.error('❌ Error:', error);
    }
  }
  
  // Test 2: With client ID (on-the-fly generation)
  if (CLIENT_ID && CLIENT_ID !== 'your-client-id-here') {
    console.log('\nTest 2: Testing with client ID (on-the-fly)...');
    try {
      const today = new Date();
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 7);
      
      const res2 = await fetch('/api/reports/generate-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: CLIENT_ID,
          dateRange: {
            from: weekAgo.toISOString(),
            to: today.toISOString()
          },
          template: 'enhanced',
          weightUnit: 'lbs'
        })
      });
      const data2 = await res2.json();
      console.log('✅ Success! Text length:', data2.text.length);
      console.log('Preview:', data2.text.substring(0, 200));
      console.log('\nFull text:', data2.text);
    } catch (error) {
      console.error('❌ Error:', error);
    }
  }
}

// Run the test
quickTest();
```

## Expected Response Format

```json
{
  "text": "# Fitness Report: John Doe\n\n**Date Range:** Jan 1 - Jan 7\n\n## Consistency Analysis\n...",
  "metadata": {
    "clientName": "John Doe",
    "dateRange": {
      "from": "2024-01-01T00:00:00Z",
      "to": "2024-01-07T23:59:59Z"
    },
    "template": "enhanced",
    "generatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

## Troubleshooting

1. **401 Unauthorized**: Make sure you're logged in
2. **404 Not Found**: Check that the report/client ID exists and belongs to you
3. **500 Internal Server Error**: Check server logs for details
4. **Empty text**: Check if the client has data for the date range

