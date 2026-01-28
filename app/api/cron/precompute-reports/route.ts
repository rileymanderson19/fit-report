import { createClient } from '@/libs/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Vercel Cron job to precompute reports for active clients
 *
 * To enable this cron job, add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/precompute-reports",
 *     "schedule": "0 2 * * *"
 *   }]
 * }
 *
 * This runs daily at 2 AM UTC, precomputing reports for the last 7 and 14 days
 * for all active clients, ensuring fast cache hits during business hours.
 */
export async function GET(req: NextRequest) {
  const startTime = performance.now();

  // Verify cron secret to prevent unauthorized access
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const supabase = createClient();

    // Get all active clients
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, trainer_id, first_name, last_name, active')
      .eq('active', true)
      .not('trainerize_id', 'is', null);

    if (clientsError) {
      console.error('Error fetching clients:', clientsError);
      return NextResponse.json(
        { error: 'Failed to fetch clients', details: clientsError.message },
        { status: 500 }
      );
    }

    if (!clients || clients.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active clients found',
        precomputed: 0,
        duration: performance.now() - startTime
      });
    }

    console.log(`[PRECOMPUTE] Starting precompute for ${clients.length} active clients`);

    // Define standard date ranges to precompute
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(23, 59, 59, 999);

    const ranges = [
      {
        name: '7 days',
        from: new Date(yesterday.getTime() - 6 * 24 * 60 * 60 * 1000),
        to: yesterday
      },
      {
        name: '14 days',
        from: new Date(yesterday.getTime() - 13 * 24 * 60 * 60 * 1000),
        to: yesterday
      }
    ];

    const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const results = {
      total: 0,
      success: 0,
      failed: 0,
      cached: 0
    };

    // Precompute reports for each client and range
    // Process in batches to avoid overwhelming the system
    const batchSize = 5;
    for (let i = 0; i < clients.length; i += batchSize) {
      const batch = clients.slice(i, i + batchSize);

      await Promise.all(
        batch.flatMap(client =>
          ranges.map(async range => {
            results.total++;
            try {
              const response = await fetch(`${origin}/api/reports/generate`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  // Note: This requires server-side auth context
                  // In production, you'd need to use a service account or admin token
                },
                body: JSON.stringify({
                  clientId: client.id,
                  dateRange: {
                    from: range.from.toISOString(),
                    to: range.to.toISOString()
                  },
                  template: 'enhanced',
                  repRange: { min: 6, max: 10 }
                })
              });

              if (response.ok) {
                const data = await response.json();
                if (data.cached) {
                  results.cached++;
                } else {
                  results.success++;
                }
                console.log(`[PRECOMPUTE] ✓ ${client.first_name} ${client.last_name} - ${range.name}`);
              } else {
                results.failed++;
                console.error(`[PRECOMPUTE] ✗ ${client.first_name} ${client.last_name} - ${range.name}: ${response.status}`);
              }
            } catch (error) {
              results.failed++;
              console.error(`[PRECOMPUTE] ✗ ${client.first_name} ${client.last_name} - ${range.name}:`, error);
            }
          })
        )
      );

      // Small delay between batches
      if (i + batchSize < clients.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const duration = performance.now() - startTime;
    console.log(`[PRECOMPUTE] Complete: ${results.success} generated, ${results.cached} cached, ${results.failed} failed in ${(duration / 1000).toFixed(2)}s`);

    return NextResponse.json({
      success: true,
      message: 'Precompute job completed',
      clients: clients.length,
      results,
      duration
    });

  } catch (error) {
    console.error('Error in precompute cron:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
