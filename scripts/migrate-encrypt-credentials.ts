/**
 * Credential Encryption Migration Script
 *
 * This script migrates existing plaintext Trainerize credentials to encrypted format.
 *
 * Usage:
 *   npx tsx scripts/migrate-encrypt-credentials.ts
 *
 * Prerequisites:
 *   - ENCRYPTION_KEY environment variable must be set (64 hex characters)
 *   - SUPABASE_SERVICE_ROLE_KEY must be set for admin access
 *   - NEXT_PUBLIC_SUPABASE_URL must be set
 *
 * What it does:
 *   1. Fetches all profiles with plaintext credentials
 *   2. Encrypts username and password using AES-256-GCM
 *   3. Stores encrypted values in new columns
 *   4. Verifies decryption works correctly
 *   5. Optionally clears plaintext columns (with --clear-plaintext flag)
 */

import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import fs from "fs";
import path from "path";

// Load environment variables from .env.local
function loadEnvFile() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    content.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...valueParts] = trimmed.split("=");
        const value = valueParts.join("=");
        if (key && value && !process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }
}

loadEnvFile();

const ALGORITHM = "aes-256-gcm";

function encrypt(text: string, encryptionKey: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    Buffer.from(encryptionKey, "hex"),
    iv
  );
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

function decrypt(encryptedText: string, encryptionKey: string): string {
  const parts = encryptedText.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted data format");
  }
  const [ivHex, authTagHex, encrypted] = parts;
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(encryptionKey, "hex"),
    Buffer.from(ivHex, "hex")
  );
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

async function main() {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!encryptionKey || encryptionKey.length !== 64) {
    console.error(
      "Error: ENCRYPTION_KEY must be set and be 64 hex characters (32 bytes)"
    );
    console.log(
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
    process.exit(1);
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error(
      "Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set"
    );
    process.exit(1);
  }

  const clearPlaintext = process.argv.includes("--clear-plaintext");
  const dryRun = process.argv.includes("--dry-run");

  console.log("=== Trainerize Credential Encryption Migration ===");
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
  console.log(`Clear plaintext after migration: ${clearPlaintext}`);
  console.log("");

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Fetch profiles with plaintext credentials
  const { data: profiles, error: fetchError } = await supabase
    .from("profiles")
    .select("id, trainerize_username, trainerize_password, trainerize_username_encrypted")
    .not("trainerize_username", "is", null)
    .not("trainerize_password", "is", null);

  if (fetchError) {
    console.error("Error fetching profiles:", fetchError);
    process.exit(1);
  }

  if (!profiles || profiles.length === 0) {
    console.log("No profiles with plaintext credentials found. Nothing to migrate.");
    return;
  }

  // Filter to only those that haven't been migrated yet
  const toMigrate = profiles.filter((p) => !p.trainerize_username_encrypted);

  console.log(`Found ${profiles.length} profiles with credentials`);
  console.log(`${toMigrate.length} profiles need migration`);
  console.log(
    `${profiles.length - toMigrate.length} profiles already migrated`
  );
  console.log("");

  if (toMigrate.length === 0) {
    console.log("All credentials already encrypted!");
    return;
  }

  let successCount = 0;
  let errorCount = 0;

  for (const profile of toMigrate) {
    try {
      console.log(`Processing profile ${profile.id}...`);

      // Encrypt credentials
      const encryptedUsername = encrypt(profile.trainerize_username, encryptionKey);
      const encryptedPassword = encrypt(profile.trainerize_password, encryptionKey);

      // Verify decryption works
      const decryptedUsername = decrypt(encryptedUsername, encryptionKey);
      const decryptedPassword = decrypt(encryptedPassword, encryptionKey);

      if (
        decryptedUsername !== profile.trainerize_username ||
        decryptedPassword !== profile.trainerize_password
      ) {
        throw new Error("Decryption verification failed");
      }

      if (dryRun) {
        console.log(`  [DRY RUN] Would encrypt credentials for ${profile.id}`);
        successCount++;
        continue;
      }

      // Update profile with encrypted credentials
      const updates: Record<string, string | null> = {
        trainerize_username_encrypted: encryptedUsername,
        trainerize_password_encrypted: encryptedPassword,
      };

      // Clear plaintext if requested
      if (clearPlaintext) {
        updates.trainerize_username = null;
        updates.trainerize_password = null;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", profile.id);

      if (updateError) {
        throw updateError;
      }

      console.log(`  Successfully migrated credentials`);
      successCount++;
    } catch (error) {
      console.error(`  Error processing profile ${profile.id}:`, error);
      errorCount++;
    }
  }

  console.log("");
  console.log("=== Migration Complete ===");
  console.log(`Success: ${successCount}`);
  console.log(`Errors: ${errorCount}`);

  if (!clearPlaintext && !dryRun && successCount > 0) {
    console.log("");
    console.log("Note: Plaintext credentials were NOT cleared.");
    console.log(
      "After verifying the migration, run again with --clear-plaintext to remove them."
    );
  }
}

main().catch(console.error);
