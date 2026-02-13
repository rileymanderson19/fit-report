import { createClient } from '@/libs/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Initialize Supabase client
    const supabase = createClient();

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's Trainerize credentials from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('trainerize_username, trainerize_password')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.trainerize_username || !profile?.trainerize_password) {
      console.error('Profile error:', profileError);
      return NextResponse.json({ error: 'Trainerize credentials not found' }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const { userID, startDate, endDate } = body;

    console.log('Nutrition request body:', { userID, startDate, endDate });

    // Format dates for Trainerize API
    const formattedStartDate = `${startDate} 00:00:00`;
    const formattedEndDate = `${endDate} 23:59:59`;

    console.log('Formatted dates:', { formattedStartDate, formattedEndDate });

    // Create Basic Auth header
    const credentials = Buffer.from(`${profile.trainerize_username}:${profile.trainerize_password}`).toString('base64');

    // Make request to Trainerize API
    const response = await fetch('https://api.trainerize.com/v03/dailyNutrition/getList', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userID,
        startDate: formattedStartDate,
        endDate: formattedEndDate,
      }),
    });

    console.log('Nutrition API response status:', response.status);

    if (!response.ok) {
      const error = await response.json();
      console.error('Nutrition API error:', error);
      return NextResponse.json({ error: error.message || 'Failed to fetch nutrition data' }, { status: response.status });
    }

    const data = await response.json();
    console.log('Nutrition API response data:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in nutrition route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 