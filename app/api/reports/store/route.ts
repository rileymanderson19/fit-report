import { createClient } from '@/libs/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = createClient();

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const { clientId, reportData, dateRange } = body;

    if (!clientId || !reportData || !dateRange?.from || !dateRange?.to) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Store the report in the database
    const { data, error } = await supabase
      .from('reports')
      .insert({
        client_id: clientId,
        trainer_id: user.id,
        report_data: reportData,
        date_range_start: dateRange.from,
        date_range_end: dateRange.to,
      })
      .select()
      .single();

    if (error) {
      console.error('Error storing report:', error);
      return NextResponse.json({ error: 'Failed to store report' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Report stored successfully',
      data
    });
  } catch (error) {
    console.error('Error in store report route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 