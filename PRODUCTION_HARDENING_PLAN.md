# Production Hardening Plan

## Overview
This document outlines the security hardening measures needed before scaling to $15k+/mo coaches.

## ✅ Completed

### 1. Server-Side Report Generation
- **Status**: ✅ Complete
- **Implementation**: Created shared `lib/report-generator.ts` module
- **Impact**: Eliminates browser-side fan-out to Trainerize APIs, reducing credential exposure
- **Files**:
  - [lib/report-generator.ts](lib/report-generator.ts)
  - [app/api/reports/generate/route.ts](app/api/reports/generate/route.ts)
  - [app/api/reports/generate-text/route.ts](app/api/reports/generate-text/route.ts)

### 2. Rate Limiting on Critical Endpoints
- **Status**: ✅ Complete
- **Implementation**: Applied rate limiting middleware to report and automation endpoints
- **Configuration**:
  - `/api/reports/generate`: 30 requests/minute (moderate)
  - `/api/automations/generate-tasks`: 3 requests/minute (strict, AI-powered)
- **Files**:
  - [libs/rateLimit.ts](libs/rateLimit.ts) - In-memory rate limiter
  - [app/api/reports/generate/route.ts](app/api/reports/generate/route.ts#L47-L57)
  - [app/api/automations/generate-tasks/route.ts](app/api/automations/generate-tasks/route.ts#L46-L56)

### 3. Report Caching
- **Status**: ✅ Complete
- **Implementation**: Created `report_cache` table with 24-hour TTL
- **Benefits**: Reduces redundant API calls, improves response time
- **Files**:
  - [supabase/migrations/20250127000000_create_report_cache.sql](supabase/migrations/20250127000000_create_report_cache.sql)

## 🔄 Pending Implementation

### 4. Trainerize Credential Encryption at Rest

**Priority**: High
**Complexity**: High (requires migration and backward compatibility)

#### Current State
- Trainerize credentials stored plaintext in `profiles` table
- Fields: `trainerize_username`, `trainerize_password`
- Migration: [supabase/migrations/20240324000000_fix_profiles.sql](supabase/migrations/20240324000000_fix_profiles.sql#L20-22)

#### Implementation Plan

##### Phase 1: Add Encrypted Columns
```sql
-- Migration: add_encrypted_trainerize_credentials.sql
ALTER TABLE public.profiles
  ADD COLUMN trainerize_username_encrypted TEXT,
  ADD COLUMN trainerize_password_encrypted TEXT,
  ADD COLUMN credentials_encrypted_at TIMESTAMPTZ;
```

##### Phase 2: Create Encryption Wrapper Service
```typescript
// libs/trainerize-credentials.ts
import { encrypt, decrypt } from '@/libs/encryption';
import { createClient } from '@/libs/supabase/server';

export async function getTrainerizeCredentials(userId: string) {
  const supabase = createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('trainerize_username_encrypted, trainerize_password_encrypted, trainerize_username, trainerize_password')
    .eq('id', userId)
    .single();

  if (!profile) return null;

  // Try encrypted first, fall back to plaintext for backward compatibility
  if (profile.trainerize_username_encrypted && profile.trainerize_password_encrypted) {
    return {
      username: decrypt(profile.trainerize_username_encrypted),
      password: decrypt(profile.trainerize_password_encrypted)
    };
  }

  // Return plaintext (backward compatibility during migration)
  return {
    username: profile.trainerize_username,
    password: profile.trainerize_password
  };
}

export async function setTrainerizeCredentials(userId: string, username: string, password: string) {
  const supabase = createClient();

  await supabase
    .from('profiles')
    .update({
      trainerize_username_encrypted: encrypt(username),
      trainerize_password_encrypted: encrypt(password),
      credentials_encrypted_at: new Date().toISOString()
    })
    .eq('id', userId);
}
```

##### Phase 3: Update All Credential Access Points
**Files to Update** (grep results):
- [x] Rate limiting endpoints (already done)
- [ ] `app/api/trainerize/goals/route.ts`
- [ ] `app/api/trainerize/bodystats/route.ts`
- [ ] `app/api/trainerize/sleep-data/route.ts`
- [ ] `app/api/trainerize/workouts/route.ts`
- [ ] `app/api/trainerize/health-data/route.ts`
- [ ] `app/api/trainerize/nutrition/route.ts`
- [ ] `app/api/trainerize/fetch-clients/route.ts`
- [ ] `app/dashboard/trainerize/page.tsx` (credential input form)

##### Phase 4: Data Migration
```typescript
// scripts/migrate-encrypt-credentials.ts
// One-time script to encrypt existing plaintext credentials
// Should be run manually by admin
```

##### Phase 5: Remove Plaintext Columns (v2)
Once all credentials are encrypted and verified:
```sql
ALTER TABLE public.profiles
  DROP COLUMN trainerize_username,
  DROP COLUMN trainerize_password;
```

#### Environment Setup Required
```bash
# .env.local
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=<64-character-hex-string>
```

#### Testing Checklist
- [ ] Test encryption/decryption round-trip
- [ ] Test backward compatibility (plaintext → encrypted)
- [ ] Test all Trainerize API endpoints with encrypted credentials
- [ ] Test credential update flow
- [ ] Verify no credentials logged in server logs
- [ ] Load test with encrypted credentials (performance check)

---

### 5. Upgrade to Redis-Based Rate Limiting (Production)

**Priority**: Medium
**Complexity**: Medium

#### Current State
- In-memory rate limiting works for single-server deployments
- Will not work correctly with multiple server instances (Vercel Edge, etc.)

#### Implementation Plan
```bash
npm install @upstash/ratelimit @upstash/redis
```

```typescript
// libs/rateLimitRedis.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '1 m'), // 30 requests per minute
  analytics: true,
});
```

#### Environment Setup Required
```bash
# .env.local
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...
```

---

### 6. Additional Security Measures

#### API Request Logging (High Priority)
- Log all Trainerize API requests with:
  - User ID
  - Endpoint
  - Response status
  - Duration
  - Rate limit headers
- Helps identify abuse, debugging, and compliance

#### Webhook Signature Verification (Medium Priority)
If using Trainerize webhooks:
```typescript
import crypto from 'crypto';

function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}
```

#### Environment Variable Validation (High Priority)
```typescript
// lib/env.ts
import { z } from 'zod';

const envSchema = z.object({
  ENCRYPTION_KEY: z.string().length(64),
  OPENAI_API_KEY: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

export const env = envSchema.parse(process.env);
```

#### Content Security Policy Headers (Medium Priority)
```typescript
// next.config.js
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  }
];
```

---

## Deployment Checklist

Before going to production with $15k+/mo coaches:

### Required
- [ ] Apply Trainerize credential encryption (Phase 1-4)
- [ ] Set `ENCRYPTION_KEY` environment variable
- [ ] Migrate existing credentials to encrypted format
- [ ] Test all Trainerize integrations
- [ ] Monitor rate limit violations
- [ ] Set up error tracking (Sentry, LogRocket, etc.)

### Recommended
- [ ] Upgrade to Redis-based rate limiting
- [ ] Set up API request logging
- [ ] Add environment variable validation
- [ ] Implement webhook signature verification (if using webhooks)
- [ ] Add security headers
- [ ] Set up monitoring/alerting for:
  - Failed authentication attempts
  - Rate limit violations
  - API errors
  - Slow response times

### Nice to Have
- [ ] Add request ID tracking for debugging
- [ ] Implement audit log for sensitive operations
- [ ] Add health check endpoint
- [ ] Set up automated security scanning (Snyk, Dependabot)

---

## Monitoring Metrics

### Key Metrics to Track
1. **Rate Limit Violations**
   - Endpoint
   - User ID
   - Frequency

2. **API Performance**
   - P50, P95, P99 latencies
   - Error rates by endpoint
   - Cache hit rates

3. **Security Events**
   - Failed login attempts
   - Invalid tokens
   - Suspicious access patterns

---

## Cost Considerations

### Current Architecture
- **Supabase**: Free tier or Pro ($25/mo)
- **Vercel**: Hobby or Pro ($20/mo per member)
- **OpenAI API**: Pay-per-use (~$0.01-0.03 per task generation)

### Recommended for Production
- **Upstash Redis**: ~$10/mo (for rate limiting)
- **Sentry**: ~$26/mo (error tracking)
- **Total**: ~$36/mo additional infrastructure

---

## Support & Resources

- Encryption utility: [libs/encryption.ts](libs/encryption.ts)
- Rate limiting utility: [libs/rateLimit.ts](libs/rateLimit.ts)
- Supabase RLS examples: [supabase/migrations/](supabase/migrations/)
