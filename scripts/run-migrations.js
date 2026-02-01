/**
 * Run database migrations using Supabase client
 *
 * Usage: node scripts/run-migrations.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration(filename) {
  console.log(`\n📦 Running migration: ${filename}`);

  const filePath = path.join(__dirname, '..', 'supabase', 'migrations', filename);
  const sql = fs.readFileSync(filePath, 'utf-8');

  // Split by semicolons but be careful about strings containing semicolons
  // For safety, run the whole file as one statement using rpc if needed
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    // If exec_sql doesn't exist, we need to run statements individually
    console.log('  Note: exec_sql not available, running via REST API...');

    // Use the REST API directly
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`
      },
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
      // Migrations need to be run via SQL editor or psql
      console.log('  ⚠️  Cannot run raw SQL via REST API.');
      console.log('  Please run this migration in Supabase Dashboard → SQL Editor');
      return false;
    }
  }

  console.log(`  ✅ Migration complete`);
  return true;
}

async function main() {
  console.log('🚀 FitReport Database Migration');
  console.log('================================');

  const migrations = [
    '20260201000000_add_invite_system.sql',
    '20260201000001_encrypt_trainerize_credentials.sql'
  ];

  let allSuccess = true;

  for (const migration of migrations) {
    const success = await runMigration(migration);
    if (!success) allSuccess = false;
  }

  if (!allSuccess) {
    console.log('\n📋 Manual Steps Required:');
    console.log('1. Go to your Supabase Dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste each migration file and run it');
    console.log('\nMigration files are in: supabase/migrations/');
  }

  console.log('\n✨ Done!');
}

main().catch(console.error);
