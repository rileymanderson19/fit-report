import { createClient } from '@/libs/supabase/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

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
    const { userID, startDate, endDate, unitBodystats, unitWeight } = body;

    // Create Basic Auth header
    const credentials = Buffer.from(`${profile.trainerize_username}:${profile.trainerize_password}`).toString('base64');

    // Create an array of dates between startDate and endDate
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dates = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d).toISOString().split('T')[0]);
    }

    // Fetch body stats for each date
    const promises = dates.map(date => 
      fetch('https://api.trainerize.com/v03/bodystats/get', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userID,
          date,
          unitBodystats,
          unitWeight,
        }),
      }).then(res => res.json().catch((): null => null))
    );

    const results = await Promise.all(promises);

    // Process results to only include dates with data
    const bodyStats = dates.map((date, index) => ({
      date,
      weight: results[index]?.bodyMeasures?.bodyWeight || null
    })).filter(stat => stat.weight !== null);

    return NextResponse.json({ bodyStats });
  } catch (error) {
    console.error('Error in bodystats route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 