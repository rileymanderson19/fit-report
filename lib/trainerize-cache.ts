import { createClient } from '@/libs/supabase/server';
import crypto from 'crypto';

/**
 * Cache TTL for Trainerize responses (2 hours)
 */
const TRAINERIZE_CACHE_TTL_HOURS = 2;

/**
 * Generates a cache key for Trainerize API responses
 */
function generateTrainerizeCacheKey(params: {
  trainerId: string;
  clientId: string | number;
  type: string;
  startDate?: string;
  endDate?: string;
  additionalParams?: Record<string, any>;
}): string {
  const input = JSON.stringify(params);
  return crypto.createHash('sha256').update(input).digest('hex');
}

export interface TrainerizeCacheParams {
  trainerId: string;
  clientId: string | number;
  type: 'workouts' | 'bodystats' | 'health-data' | 'nutrition' | 'sleep-data' | 'goals';
  startDate?: string;
  endDate?: string;
  additionalParams?: Record<string, any>;
}

/**
 * Fetches Trainerize data with caching support.
 * Checks cache first, then falls back to actual API call if cache miss or expired.
 *
 * @param params Cache parameters
 * @param fetchFn Function to call if cache miss
 * @param enableCache Whether to use caching (default: true)
 * @returns Trainerize API response data
 */
export async function getTrainerizeDataWithCache<T>(
  params: TrainerizeCacheParams,
  fetchFn: () => Promise<T>,
  enableCache: boolean = true
): Promise<T> {
  if (!enableCache) {
    return fetchFn();
  }

  const supabase = createClient();
  const cacheKey = generateTrainerizeCacheKey(params);

  try {
    // Check for existing valid cache
    const { data: cacheEntry, error: cacheError } = await supabase
      .from('trainerize_cache')
      .select('*')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .single();

    // Return cached data if available
    if (cacheEntry && !cacheError) {
      console.log(`[TRAINERIZE CACHE] Cache hit for ${params.type}`);
      return cacheEntry.response_data as T;
    }

    console.log(`[TRAINERIZE CACHE] Cache miss for ${params.type}, fetching...`);
  } catch (error) {
    // Cache lookup failed, continue with fresh fetch
    console.warn('[TRAINERIZE CACHE] Cache lookup error:', error);
  }

  // Fetch fresh data
  const data = await fetchFn();

  // Store in cache (fire and forget - don't block on cache write)
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + TRAINERIZE_CACHE_TTL_HOURS);

  supabase
    .from('trainerize_cache')
    .upsert({
      trainer_id: params.trainerId,
      client_id: String(params.clientId),
      type: params.type,
      start_date: params.startDate || null,
      end_date: params.endDate || null,
      cache_key: cacheKey,
      response_data: data,
      expires_at: expiresAt.toISOString()
    }, {
      onConflict: 'cache_key'
    })
    .then(({ error }) => {
      if (error) {
        console.error('[TRAINERIZE CACHE] Error caching response:', error);
      } else {
        console.log(`[TRAINERIZE CACHE] Cached ${params.type} until ${expiresAt.toISOString()}`);
      }
    });

  return data;
}

/**
 * Clears expired Trainerize cache entries.
 * Can be called periodically via cron job.
 */
export async function clearExpiredTrainerizeCache(): Promise<{ deleted: number }> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('trainerize_cache')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .select('id');

  if (error) {
    console.error('[TRAINERIZE CACHE] Error clearing expired cache:', error);
    return { deleted: 0 };
  }

  const deleted = data?.length || 0;
  console.log(`[TRAINERIZE CACHE] Cleared ${deleted} expired entries`);
  return { deleted };
}

/**
 * Invalidates all cache entries for a specific client.
 * Useful when client data has been updated and you want to force a refresh.
 */
export async function invalidateClientCache(clientId: string | number): Promise<{ deleted: number }> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('trainerize_cache')
    .delete()
    .eq('client_id', String(clientId))
    .select('id');

  if (error) {
    console.error('[TRAINERIZE CACHE] Error invalidating client cache:', error);
    return { deleted: 0 };
  }

  const deleted = data?.length || 0;
  console.log(`[TRAINERIZE CACHE] Invalidated ${deleted} entries for client ${clientId}`);
  return { deleted };
}
