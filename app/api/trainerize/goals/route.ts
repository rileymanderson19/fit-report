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
    const { userID } = body;

    if (!userID) {
      return NextResponse.json({ error: 'userID is required' }, { status: 400 });
    }

    console.log('Goals API request:', { userID });

    // Create Basic Auth header
    const credentials = Buffer.from(`${profile.trainerize_username}:${profile.trainerize_password}`).toString('base64');

    // Make request to Trainerize API
    const response = await fetch('https://api.trainerize.com/v03/goal/getList', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userID: parseInt(userID),
      }),
    });

    console.log('Goals API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('Goals API error:', {
        status: response.status,
        statusText: response.statusText,
        errorText
      });
      return NextResponse.json(
        { error: `Failed to fetch goals: ${response.status} ${response.statusText}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Goals API response data:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in goals route:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

