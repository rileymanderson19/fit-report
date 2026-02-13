import { createClient } from '@/libs/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Initialize Supabase client
    const supabase = createClient();

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's Trainerize credentials from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('trainerize_username, trainerize_password')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.trainerize_username || !profile?.trainerize_password) {
      return NextResponse.json({ error: 'Trainerize credentials not found' }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const { userID, startDate, endDate } = body;

    console.log('Sleep API Request Details:', {
      userID,
      startDate,
      endDate,
      username: profile.trainerize_username,
      hasPassword: !!profile.trainerize_password
    });

    // Create Basic Auth header
    const credentials = Buffer.from(`${profile.trainerize_username}:${profile.trainerize_password}`).toString('base64');

    // Format dates for sleep API (requires datetime format) - match working example exactly
    const formattedStartTime = `${startDate} 12:12:12`;
    const formattedEndDate = `${endDate} 12:12:12`;

    // Use the exact format with userID (userID is required)
    // Try endTime instead of endDate since error mentions "Invalid EndTime"
    const requestPayload = {
      userID: parseInt(userID), // Ensure it's a number
      startTime: formattedStartTime,
      endTime: formattedEndDate,
    };

    console.log('Sleep API Payload (with userID):', requestPayload);
    console.log('UserID type:', typeof userID, 'Value:', userID);

    // Make request to Trainerize Sleep API using the correct endpoint and parameters
    const response = await fetch('https://api.trainerize.com/v03/healthData/getListSleep', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestPayload),
    });

    console.log('Sleep API Response Status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('Sleep API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        errorText
      });
      return NextResponse.json({ 
        error: `Failed to fetch sleep data: ${response.status} ${response.statusText}`,
        details: errorText 
      }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in sleep-data route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 