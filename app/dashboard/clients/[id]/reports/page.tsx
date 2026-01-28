import ClientReportsClient from './ClientReportsClient';
import { createClient } from '@/libs/supabase/server';
import { redirect } from 'next/navigation';
import crypto from 'crypto';

/**
 * Generates a cache key for report caching (matching the API logic)
 */
function generateCacheKey(params: {
  trainerId: string;
  clientId: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  template: string;
  repRange: { min: number; max: number };
}): string {
  const input = JSON.stringify(params);
  return crypto.createHash('sha256').update(input).digest('hex');
}

export default async function ClientReportsPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  // Get the authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/sign-in');
  }

  // Fetch client data
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .eq('id', params.id)
    .eq('trainer_id', user.id)
    .single();

  // Fetch reports for this client
  const { data: reports, error: reportsError } = await supabase
    .from('reports')
    .select('*')
    .eq('client_id', params.id)
    .order('created_at', { ascending: false });

  // Try to preload a cached report for the default 14-day range
  let initialLiveReportData = null;
  let initialLiveReportMetadata = null;

  if (client && !clientError) {
    // Calculate default date range (last 14 days ending yesterday)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(23, 59, 59, 999);

    const fourteenDaysAgo = new Date(yesterday);
    fourteenDaysAgo.setDate(yesterday.getDate() - 13);
    fourteenDaysAgo.setHours(0, 0, 0, 0);

    // Generate cache key for default configuration
    const cacheKey = generateCacheKey({
      trainerId: user.id,
      clientId: params.id,
      dateRangeStart: fourteenDaysAgo.toISOString(),
      dateRangeEnd: yesterday.toISOString(),
      template: 'enhanced',
      repRange: { min: 6, max: 10 }
    });

    // Look up cached report
    const { data: cachedReport } = await supabase
      .from('report_cache')
      .select('*')
      .eq('cache_key', cacheKey)
      .eq('status', 'ready')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (cachedReport) {
      initialLiveReportData = cachedReport.report_data;
      initialLiveReportMetadata = {
        clientId: params.id,
        clientName: `${client.first_name} ${client.last_name}`,
        dateRange: {
          from: cachedReport.date_range_start,
          to: cachedReport.date_range_end
        },
        template: cachedReport.template,
        repRange: cachedReport.rep_range,
        generatedAt: cachedReport.created_at,
        expiresAt: cachedReport.expires_at,
        cached: true
      };
    }
  }

  return (
    <ClientReportsClient
      clientId={params.id}
      initialClient={client || null}
      initialReports={reports || []}
      initialError={clientError || reportsError ? 'Failed to load client data' : null}
      initialLiveReportData={initialLiveReportData}
      initialLiveReportMetadata={initialLiveReportMetadata}
    />
  );
} 