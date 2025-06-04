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

    // Step 1: Get existing reports for this client, ordered by creation date (oldest first)
    const { data: existingReports, error: fetchError } = await supabase
      .from('reports')
      .select('id, created_at')
      .eq('client_id', clientId)
      .eq('trainer_id', user.id)
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('Error fetching existing reports:', fetchError);
      return NextResponse.json({ error: 'Failed to check existing reports' }, { status: 500 });
    }

    // Step 2: If we have 2 or more reports, we need to delete the oldest ones to make room
    const maxReports = 2;
    let cleanupSuccess = true;
    let deletedCount = 0;

    if (existingReports && existingReports.length >= maxReports) {
      // Calculate how many reports to delete (keep maxReports - 1 to make room for new one)
      const reportsToDelete = existingReports.length - maxReports + 1;
      const reportsToDeleteIds = existingReports.slice(0, reportsToDelete).map(report => report.id);

      console.log(`Cleaning up ${reportsToDelete} old reports for client ${clientId}`);

      // Delete the oldest reports
      const { error: deleteError } = await supabase
        .from('reports')
        .delete()
        .in('id', reportsToDeleteIds);

      if (deleteError) {
        console.error('Error deleting old reports:', deleteError);
        cleanupSuccess = false;
        // Continue with insertion anyway - the limit enforcement is best-effort
      } else {
        deletedCount = reportsToDelete;
        console.log(`Successfully deleted ${deletedCount} old reports for client ${clientId}`);
      }
    }

    // Step 3: Insert the new report
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

    // Step 4: Return success response with cleanup info
    const response = {
      message: 'Report stored successfully',
      data,
      cleanup: {
        deletedCount,
        cleanupSuccess
      }
    };

    if (deletedCount > 0) {
      console.log(`Report stored for client ${clientId}. Cleanup: deleted ${deletedCount} old reports.`);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in store report route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 