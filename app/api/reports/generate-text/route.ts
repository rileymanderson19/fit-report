import { createClient } from '@/libs/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { formatReportAsText } from '@/lib/report-text-formatter';
import { generateReportData } from '@/lib/report-generator';

interface GenerateTextRequest {
  reportId?: string;  // Optional: use existing report
  clientId?: string;   // Required if no reportId
  dateRange?: {       // Required if no reportId
    from: string;
    to: string;
  };
  template?: 'daily' | 'weekly' | 'enhanced';  // Default: 'enhanced'
  weightUnit?: 'lbs' | 'kg';  // Default: 'lbs'
  goal?: 'fat loss' | 'maintenance' | 'muscle gain';  // Default: 'fat loss'
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get request body
    const body: GenerateTextRequest = await req.json();
    const { reportId, clientId, dateRange, template = 'enhanced', weightUnit = 'lbs', goal = 'fat loss' } = body;

    let reportData: any = null;
    let client: any = null;
    let dateRangeStart: string | undefined;
    let dateRangeEnd: string | undefined;

    // Option 1: Load existing report from database
    if (reportId) {
      const { data: report, error: reportError } = await supabase
        .from('reports')
        .select(`
          id,
          client_id,
          trainer_id,
          report_data,
          date_range_start,
          date_range_end,
          clients (
            id,
            first_name,
            last_name,
            email,
            notes
          )
        `)
        .eq('id', reportId)
        .eq('trainer_id', user.id)
        .single();

      if (reportError || !report) {
        return NextResponse.json(
          { error: 'Report not found or access denied' },
          { status: 404 }
        );
      }

      reportData = report.report_data;
      client = Array.isArray(report.clients) ? report.clients[0] : report.clients;
      dateRangeStart = report.date_range_start;
      dateRangeEnd = report.date_range_end;
    }
    // Option 2: Generate report data on-the-fly
    else if (clientId && dateRange?.from && dateRange?.to) {
      // Fetch client info
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .eq('trainer_id', user.id)
        .single();

      if (clientError || !clientData) {
        return NextResponse.json(
          { error: 'Client not found or access denied' },
          { status: 404 }
        );
      }

      if (!clientData.trainerize_id) {
        return NextResponse.json(
          { error: 'Client does not have a Trainerize ID' },
          { status: 400 }
        );
      }

      client = clientData;
      dateRangeStart = dateRange.from;
      dateRangeEnd = dateRange.to;

      // Fetch report data from Trainerize APIs using shared generator
      const startDate = new Date(dateRange.from).toISOString().split('T')[0];
      const endDate = new Date(dateRange.to).toISOString().split('T')[0];

      try {
        // Get the origin from the request URL
        const origin = req.nextUrl.origin || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

        // Get auth headers to pass through
        const authHeader = req.headers.get('authorization') || req.headers.get('cookie');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (authHeader) {
          if (authHeader.startsWith('Bearer')) {
            headers['authorization'] = authHeader;
          } else {
            headers['cookie'] = authHeader;
          }
        }

        // Use shared report generation module
        reportData = await generateReportData(
          {
            trainerizeUserId: clientData.trainerize_id,
            startDate,
            endDate,
            repRange: { min: 6, max: 10 }, // Default rep range
            trainerId: user.id,
            unitBodystats: 'inches',
            unitWeight: weightUnit,
          },
          origin,
          headers
        );

        // Add template to report data
        reportData.template = template;
      } catch (fetchError) {
        console.error('Error fetching Trainerize data:', fetchError);
        return NextResponse.json(
          { error: 'Failed to fetch client data from Trainerize' },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Either reportId or (clientId and dateRange) must be provided' },
        { status: 400 }
      );
    }

    if (!reportData || !client) {
      return NextResponse.json(
        { error: 'Failed to load report data' },
        { status: 500 }
      );
    }

    // Format report as text
    const clientName = `${client.first_name} ${client.last_name}`;
    const clientNotes = 'notes' in client ? client.notes : null;
    const text = formatReportAsText(reportData, clientName, {
      template,
      weightUnit,
      dateRangeStart,
      dateRangeEnd,
      goal,
      clientNotes
    });

    return NextResponse.json({
      text,
      metadata: {
        clientName,
        dateRange: {
          from: dateRangeStart || '',
          to: dateRangeEnd || ''
        },
        template,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error generating text report:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

