#!/usr/bin/env node

/**
 * Security Secrets Generator
 *
 * Generates cryptographically secure secrets for the FitReport application.
 * Run this script to generate new secrets when rotating credentials.
 *
 * Usage: node scripts/generate-secrets.js
 */

const crypto = require('crypto');

console.log('\n🔐 FitReport Security Secrets Generator\n');
console.log('=' .repeat(60));

// Generate CRON_SECRET (32 bytes = 64 hex characters)
const cronSecret = crypto.randomBytes(32).toString('hex');
console.log('\n📅 CRON_SECRET (for scheduled job authentication):');
console.log(cronSecret);

// Generate ENCRYPTION_KEY (32 bytes = 64 hex characters for AES-256)
const encryptionKey = crypto.randomBytes(32).toString('hex');
console.log('\n🔑 ENCRYPTION_KEY (for encrypting sensitive data):');
console.log(encryptionKey);

// Generate additional secrets if needed
const apiSecret = crypto.randomBytes(32).toString('hex');
console.log('\n🌐 API_SECRET (optional - for API authentication):');
console.log(apiSecret);

console.log('\n' + '='.repeat(60));
console.log('\n📋 Next Steps:\n');
console.log('1. Copy these secrets to a secure password manager');
console.log('2. Add them to your production environment variables:');
console.log('   - Vercel: Settings → Environment Variables');
console.log('   - Other platforms: Check their documentation');
console.log('\n3. Update the following environment variables:');
console.log('   - CRON_SECRET');
console.log('   - ENCRYPTION_KEY (NEW - add this)');
console.log('\n4. Also rotate these credentials manually:');
console.log('   - SUPABASE_SERVICE_ROLE_KEY (Supabase Dashboard)');
console.log('   - STRIPE_SECRET_KEY (Stripe Dashboard)');
console.log('   - STRIPE_WEBHOOK_SECRET (Stripe Dashboard)');
console.log('\n⚠️  WARNING: Keep these secrets secure!');
console.log('   - Never commit them to git');
console.log('   - Never share them publicly');
console.log('   - Store them in a password manager');
console.log('\n');
