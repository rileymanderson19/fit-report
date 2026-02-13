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
  mode?: 'default' | 'cache-only'; // cache-only returns 202 if no cache exists
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
  const startTime = performance.now();
  const timings: Record<string, number> = {};

  try {
    const supabase = createClient();

    // Get the authenticated user
    const authStart = performance.now();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    timings.auth = performance.now() - authStart;
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
      unitWeight = 'lbs',
      mode = 'default'
    } = body;

    // Validate required fields
    if (!clientId || !dateRange?.from || !dateRange?.to) {
      return NextResponse.json(
        { error: 'clientId and dateRange (from/to) are required' },
        { status: 400 }
      );
    }

    // Fetch client to verify access and get trainerize_id
    const clientFetchStart = performance.now();
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .eq('trainer_id', user.id)
      .single();
    timings.clientFetch = performance.now() - clientFetchStart;

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

    // Check for existing cache (ready or running)
    const cacheLookupStart = performance.now();
    const { data: cacheEntries } = await supabase
      .from('report_cache')
      .select('*')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);
    timings.cacheLookup = performance.now() - cacheLookupStart;

    const cacheEntry = cacheEntries && cacheEntries.length > 0 ? cacheEntries[0] : null;

    // Check if report generation is already running (request deduplication)
    if (cacheEntry?.status === 'running') {
      const totalTime = performance.now() - startTime;
      timings.total = totalTime;
      console.log('[PERF] Report generation already running - timings:', timings);

      return NextResponse.json({
        success: false,
        status: 'running',
        message: 'Report generation is already in progress. Please try again shortly.',
        cacheId: cacheEntry.id
      }, { status: 202 });
    }

    // If valid ready cache exists, return it
    if (cacheEntry?.status === 'ready') {
      const totalTime = performance.now() - startTime;
      timings.total = totalTime;
      console.log('[PERF] Cache hit - timings:', timings);

      return NextResponse.json({
        success: true,
        reportData: cacheEntry.report_data,
        cached: true,
        cacheId: cacheEntry.id,
        metadata: {
          clientId,
          clientName: `${client.first_name} ${client.last_name}`,
          dateRange: {
            from: dateRange.from,
            to: dateRange.to
          },
          template,
          repRange,
          generatedAt: cacheEntry.created_at,
          expiresAt: cacheEntry.expires_at
        }
      });
    }

    // No valid cache found
    // If cache-only mode, return 202 Accepted without generating
    if (mode === 'cache-only') {
      const totalTime = performance.now() - startTime;
      timings.total = totalTime;
      console.log('[PERF] Cache-only mode, no cache - timings:', timings);

      return NextResponse.json({
        success: false,
        status: 'pending',
        message: 'No cached report available. Use default mode to generate.'
      }, { status: 202 });
    }

    // No valid cache - generate new report (default mode)
    let runningCacheId: string | null = null;
    try {
      // Mark generation as running (for request deduplication)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const runningCacheStart = performance.now();
      const { data: runningCache, error: runningInsertError } = await supabase
        .from('report_cache')
        .insert({
          trainer_id: user.id,
          client_id: clientId,
          date_range_start: dateRange.from,
          date_range_end: dateRange.to,
          template,
          rep_range: repRange,
          cache_key: cacheKey,
          report_data: {}, // Empty placeholder
          status: 'running',
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single();
      timings.runningCacheInsert = performance.now() - runningCacheStart;

      if (runningInsertError) {
        console.error('Error inserting running cache entry:', runningInsertError);
        // Continue anyway - this is just for deduplication
      } else if (runningCache?.id) {
        runningCacheId = runningCache.id;
      }

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
      const generateStart = performance.now();
      const reportData: ReportData = await generateReportData(
        {
          trainerizeUserId: client.trainerize_id,
          startDate,
          endDate,
          repRange,
          trainerId: user.id,
          unitBodystats,
          unitWeight,
          clientId, // Enable Trainerize response caching
          enableTrainerizeCache: true
        },
        origin,
        headers
      );
      timings.generateReportData = performance.now() - generateStart;

      // Add template to report data
      reportData.template = template;

      // Update cache entry with report data and mark as ready
      const cacheUpdateStart = performance.now();
      let newCache = null;
      if (runningCacheId) {
        const { data: updatedCache, error: updateError } = await supabase
          .from('report_cache')
          .update({
            report_data: reportData,
            status: 'ready'
          })
          .eq('id', runningCacheId)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating cache to ready:', updateError);
        } else {
          newCache = updatedCache;
        }
      }
      timings.cacheUpdate = performance.now() - cacheUpdateStart;

      const totalTime = performance.now() - startTime;
      timings.total = totalTime;
      console.log('[PERF] Cache miss - timings:', timings);

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

      // Mark the cache entry as failed if we created one
      if (runningCacheId) {
        const { error: updateError } = await supabase
          .from('report_cache')
          .update({ status: 'error' })
          .eq('id', runningCacheId);

        if (updateError) {
          console.error('Error updating cache to error status:', updateError);
        }
      }

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
