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
    const { userID, type, startDate, endDate } = body;

    // Create Basic Auth header
    const credentials = Buffer.from(`${profile.trainerize_username}:${profile.trainerize_password}`).toString('base64');

    // Make request to Trainerize API
    const response = await fetch('https://api.trainerize.com/v03/healthData/getList', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userID,
        type,
        startDate,
        endDate,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json({ error: error.message || 'Failed to fetch health data' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in health-data route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 