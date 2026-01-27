import { createClient } from '@/libs/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { generateReportData, type ReportData, type RepRange } from '@/lib/report-generator';
import { rateLimitMiddleware, getClientIdentifier, RateLimitPresets } from '@/libs/rateLimit';
import crypto from 'crypto';

interface GenerateReportRequest {
  clientId: string;
  dateRange: {
    from: string; // ISO date string
    to: string;   // ISO date string
  };
  template?: 'daily' | 'enhanced';
  repRange?: RepRange;
  unitBodystats?: 'inches' | 'cm';
  unitWeight?: 'lbs' | 'kg';
}

/**
 * Generates a cache key based on report parameters
 */
function generateCacheKey(params: {
  trainerId: string;
  clientId: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  template: string;
  repRange: RepRange;
}): string {
  const input = JSON.stringify(params);
  return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * POST /api/reports/generate
 * Generates a report for a client with caching support.
 * Returns cached report if available and not expired, otherwise generates new report.
 */
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

    // Apply rate limiting (moderate: 30 requests per minute for authenticated users)
    const rateLimitResult = await rateLimitMiddleware(
      getClientIdentifier(req, user.id),
      {
        ...RateLimitPresets.moderate,
        message: 'Too many report generation requests. Please wait before trying again.'
      }
    );

    if (rateLimitResult) {
      return rateLimitResult;
    }

    // Parse request body
    const body: GenerateReportRequest = await req.json();
    const {
      clientId,
      dateRange,
      template = 'enhanced',
      repRange = { min: 6, max: 10 },
      unitBodystats = 'inches',
      unitWeight = 'lbs'
    } = body;

    // Validate required fields
    if (!clientId || !dateRange?.from || !dateRange?.to) {
      return NextResponse.json(
        { error: 'clientId and dateRange (from/to) are required' },
        { status: 400 }
      );
    }

    // Fetch client to verify access and get trainerize_id
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .eq('trainer_id', user.id)
      .single();

    if (clientError || !client) {
      return NextResponse.json(
        { error: 'Client not found or access denied' },
        { status: 404 }
      );
    }

    if (!client.trainerize_id) {
      return NextResponse.json(
        { error: 'Client does not have a Trainerize ID' },
        { status: 400 }
      );
    }

    // Generate cache key
    const cacheKey = generateCacheKey({
      trainerId: user.id,
      clientId,
      dateRangeStart: dateRange.from,
      dateRangeEnd: dateRange.to,
      template,
      repRange
    });

    // Check for existing valid cache
    const { data: cachedReport, error: cacheError } = await supabase
      .from('report_cache')
      .select('*')
      .eq('cache_key', cacheKey)
      .eq('status', 'ready')
      .gt('expires_at', new Date().toISOString())
      .single();

    // If valid cache exists, return it
    if (cachedReport && !cacheError) {
      return NextResponse.json({
        success: true,
        reportData: cachedReport.report_data,
        cached: true,
        cacheId: cachedReport.id,
        metadata: {
          clientId,
          clientName: `${client.first_name} ${client.last_name}`,
          dateRange: {
            from: dateRange.from,
            to: dateRange.to
          },
          template,
          repRange,
          generatedAt: cachedReport.created_at,
          expiresAt: cachedReport.expires_at
        }
      });
    }

    // No valid cache - generate new report
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

      // Convert date strings to ISO date format (YYYY-MM-DD)
      const startDate = new Date(dateRange.from).toISOString().split('T')[0];
      const endDate = new Date(dateRange.to).toISOString().split('T')[0];

      // Generate report data using shared module
      const reportData: ReportData = await generateReportData(
        {
          trainerizeUserId: client.trainerize_id,
          startDate,
          endDate,
          repRange,
          trainerId: user.id,
          unitBodystats,
          unitWeight
        },
        origin,
        headers
      );

      // Add template to report data
      reportData.template = template;

      // Calculate expiration (24 hours from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      // Store in cache
      const { data: newCache, error: insertError } = await supabase
        .from('report_cache')
        .insert({
          trainer_id: user.id,
          client_id: clientId,
          date_range_start: dateRange.from,
          date_range_end: dateRange.to,
          template,
          rep_range: repRange,
          cache_key: cacheKey,
          report_data: reportData,
          status: 'ready',
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error caching report:', insertError);
        // Continue anyway - we have the report data
      }

      return NextResponse.json({
        success: true,
        reportData,
        cached: false,
        cacheId: newCache?.id,
        metadata: {
          clientId,
          clientName: `${client.first_name} ${client.last_name}`,
          dateRange: {
            from: dateRange.from,
            to: dateRange.to
          },
          template,
          repRange,
          generatedAt: new Date().toISOString(),
          expiresAt: expiresAt.toISOString()
        }
      });

    } catch (generateError) {
      console.error('Error generating report:', generateError);
      return NextResponse.json(
        { error: 'Failed to generate report', details: generateError instanceof Error ? generateError.message : 'Unknown error' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in /api/reports/generate:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
