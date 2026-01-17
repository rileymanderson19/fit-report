# Security Documentation

## Overview
This document outlines the security measures implemented in the FitReport application and provides guidance for maintaining security best practices.

## Recent Security Improvements

### ✅ Implemented (Current Version)

1. **Debug Endpoint Protection**
   - All debug endpoints now blocked in production
   - Returns 404 for production environment requests
   - Files: `app/api/debug/*`, `app/api/trainerize/debug-*`

2. **Input Validation**
   - Zod schemas for all API inputs
   - Type-safe validation with detailed error messages
   - See: `libs/validations.ts`

3. **Rate Limiting**
   - In-memory rate limiting for all public endpoints
   - Different limits based on endpoint sensitivity:
     - Strict (3/min): Lead capture
     - Standard (10/min): Public reports
     - Moderate (30/min): Authenticated uploads
   - See: `libs/rateLimit.ts`

4. **File Upload Security**
   - Magic byte validation for images
   - 5MB file size limit
   - Allowed formats: PNG, JPG, JPEG, WebP
   - Filename sanitization
   - See: `app/api/upload/temp-image/route.ts`

5. **Security Headers**
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `X-XSS-Protection: 1; mode=block`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy` for camera/microphone/geolocation
   - See: `middleware.ts`

6. **Centralized Error Handling**
   - Production-safe error messages (no sensitive data leakage)
   - Detailed errors in development only
   - Server-side logging for all errors
   - See: `libs/errorHandler.ts`

7. **Encryption Utilities**
   - AES-256-GCM encryption for sensitive data
   - Ready for encrypting Trainerize credentials
   - See: `libs/encryption.ts`

## Row Level Security (RLS)

All database tables have RLS enabled:

### Profiles Table
- **SELECT**: Public (all profiles viewable)
- **INSERT**: Self-only (`auth.uid() = id`)
- **UPDATE**: Self-only (`auth.uid() = id`)

### Clients Table
- **All Operations**: Trainer-owned only (`trainer_id = auth.uid()`)

### Reports Table
- **All Operations**: Trainer-owned only (`trainer_id = auth.uid()`)

### Scheduled Reports Table
- **All Operations**: Trainer-owned only (`trainer_id = auth.uid()`)

### Report Deliveries Table
- **SELECT, INSERT, UPDATE**: Trainer-owned only (`trainer_id = auth.uid()`)
- **DELETE**: No policy (intentional for audit trail)

### Report Configurations Table
- **All Operations**: Trainer-owned only (`trainer_id = auth.uid()`)

## Critical Security Tasks

### 🔴 IMMEDIATE ACTIONS REQUIRED

**1. Rotate Exposed Credentials**

The following credentials in `.env.local` must be rotated IMMEDIATELY:

```bash
# Generate new Supabase service role key
# 1. Go to Supabase Dashboard → Settings → API
# 2. Generate new service_role key
# 3. Update SUPABASE_SERVICE_ROLE_KEY in production environment

# Generate new Stripe keys
# 1. Go to Stripe Dashboard → Developers → API Keys
# 2. Roll live secret key
# 3. Update STRIPE_SECRET_KEY in production environment
# 4. Update webhook secret if needed

# Generate new CRON_SECRET
openssl rand -hex 32
# Update CRON_SECRET in production environment

# Generate new ENCRYPTION_KEY (for credential encryption)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Add ENCRYPTION_KEY to production environment
```

**2. Remove .env.local from Git History**

```bash
# Install git-filter-repo
brew install git-filter-repo  # macOS
# or: pip install git-filter-repo

# Remove .env.local from all commits
git filter-repo --path .env.local --invert-paths

# Force push (coordinate with team first!)
git push origin --force --all
git push origin --force --tags
```

**3. Verify .gitignore**

Ensure `.env.local` is in `.gitignore` (already done ✅):
```
.env*.local
```

### ⚡ HIGH PRIORITY (This Week)

**4. Encrypt Trainerize Credentials**

Current state: Credentials stored in plaintext in `profiles` table

Migration steps:
1. Generate encryption key (see above)
2. Add to production environment variables
3. Create migration to add encrypted column:

```sql
-- supabase/migrations/YYYYMMDD_encrypt_trainerize_credentials.sql
ALTER TABLE profiles
ADD COLUMN trainerize_credentials_encrypted TEXT;
```

4. Update all Trainerize API routes to use encryption:
   - `app/api/trainerize/verify/route.ts`
   - `app/api/trainerize/fetch-clients/route.ts`
   - Any other routes accessing credentials

Example usage:
```typescript
import { encrypt, decrypt } from '@/libs/encryption';

// When saving credentials
const encrypted = encrypt(password);
await supabase.from('profiles').update({
  trainerize_credentials_encrypted: encrypted
});

// When using credentials
const { data: profile } = await supabase
  .from('profiles')
  .select('trainerize_credentials_encrypted')
  .single();

const password = decrypt(profile.trainerize_credentials_encrypted);
```

5. After migration, drop old plaintext columns:
```sql
ALTER TABLE profiles
DROP COLUMN trainerize_password;
```

## Environment Variables

### Required Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=  # Server-only, never expose

# Stripe
STRIPE_PUBLIC_KEY=
STRIPE_SECRET_KEY=          # Server-only, never expose
STRIPE_WEBHOOK_SECRET=      # Server-only, never expose

# Email
RESEND_API_KEY=             # Server-only, never expose

# Security
ENCRYPTION_KEY=             # Server-only, never expose - 64 hex chars (32 bytes)
CRON_SECRET=                # Server-only, never expose

# Optional: Production flag
NODE_ENV=production
```

### Security Best Practices for Environment Variables

1. **Never commit** `.env.local` or `.env.production` to git
2. **Use different keys** for development and production
3. **Rotate secrets** regularly (every 90 days minimum)
4. **Prefix public keys** with `NEXT_PUBLIC_` only if they're safe to expose
5. **Store production secrets** in your hosting platform's secure environment variable storage

## API Security Checklist

When creating new API routes:

- [ ] Add authentication check using `supabase.auth.getUser()`
- [ ] Validate input using Zod schemas from `libs/validations.ts`
- [ ] Apply rate limiting using `libs/rateLimit.ts`
- [ ] Use centralized error handler from `libs/errorHandler.ts`
- [ ] Verify resource ownership before mutations
- [ ] Never expose sensitive data in error messages (production)
- [ ] Add endpoint to API documentation

Example template:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/libs/supabase/server';
import { rateLimitMiddleware, getClientIdentifier, RateLimitPresets } from '@/libs/rateLimit';
import { MySchema, validateRequest } from '@/libs/validations';
import { handleApiError, requireAuth } from '@/libs/errorHandler';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();

    // 1. Authentication
    const { data: { user } } = await supabase.auth.getUser();
    const authError = requireAuth(user);
    if (authError) return authError;

    // 2. Rate limiting
    const rateLimitResponse = await rateLimitMiddleware(
      getClientIdentifier(req, user.id),
      RateLimitPresets.moderate
    );
    if (rateLimitResponse) return rateLimitResponse;

    // 3. Input validation
    const body = await req.json();
    const validation = validateRequest(MySchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error },
        { status: 400 }
      );
    }

    // 4. Business logic here...

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'my-endpoint');
  }
}
```

## Storage Bucket Security

### temp-images Bucket

**Current Configuration:**
- Used for temporary report images
- Cleanup: Manual via `/api/cleanup/temp-images` (7-day retention)

**Recommended Actions:**
1. Verify bucket is not publicly writable
2. Add RLS policies for storage objects
3. Configure lifecycle policy for automatic cleanup

```sql
-- Storage RLS policies
CREATE POLICY "Authenticated users can upload to temp-images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'temp-images');

CREATE POLICY "Public read access for temp-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'temp-images');

CREATE POLICY "Users can delete their own uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'temp-images' AND owner = auth.uid());
```

## Public Report Sharing

### Security Model
- Reports are private by default
- Explicit opt-in required via `generated_link_url`
- 7-day expiration (configurable)
- Rate limited (10 requests/minute per IP)

### Recommendations
1. Consider shortening expiration to 48 hours for sensitive data
2. Use cryptographically secure tokens instead of UUIDs
3. Add view tracking/analytics
4. Consider password protection for extra sensitive reports

## Monitoring & Logging

### Current Logging
- All API errors logged server-side via `console.error`
- Rate limit violations logged with identifier

### Recommended Additions
1. Implement structured logging (e.g., Winston, Pino)
2. Add audit logging for sensitive operations:
   - Credential changes
   - Report deletions
   - Client data access
3. Set up error tracking (e.g., Sentry)
4. Monitor for suspicious patterns:
   - Failed authentication attempts
   - Rate limit violations
   - Unusual access patterns

## Compliance

### GDPR Considerations
- ✅ Data isolation via RLS
- ✅ Cascading deletes support data removal
- ⚠️ Need data export functionality
- ⚠️ Need consent tracking

### Data Retention
- Temporary images: 7 days
- Report links: 7 days (expires automatically)
- User data: Retained until account deletion
- Audit logs: Recommended 90 days minimum

## Security Contacts

For security issues:
1. **DO NOT** open a public GitHub issue
2. Email: [your-security-email@example.com]
3. For critical vulnerabilities, include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

## Version History

- **v1.1.0** (Current) - Security hardening implementation
  - Added debug endpoint protection
  - Implemented input validation and rate limiting
  - Added file upload security
  - Added security headers
  - Created encryption utilities

- **v1.0.0** - Initial release
  - Basic authentication with Supabase
  - RLS policies on all tables
  - Stripe webhook signature verification
