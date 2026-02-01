import { createClient } from "@/libs/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { encrypt, decrypt } from "@/libs/encryption";

// Admin client to bypass RLS for reading credentials
function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export interface TrainerizeCredentials {
  username: string;
  password: string;
  trainerId: string;
}

/**
 * Check if encrypted credentials are available
 * Falls back to plaintext during migration period
 */
function hasEncryptionKey(): boolean {
  return !!process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length === 64;
}

/**
 * Get Trainerize credentials for a user
 * Automatically handles encrypted vs plaintext credentials during migration
 *
 * @param userId - The user's auth ID
 * @returns Credentials or null if not found/invalid
 */
export async function getTrainerizeCredentials(
  userId: string
): Promise<TrainerizeCredentials | null> {
  // Use admin client to bypass RLS - credentials should always be readable for authenticated users
  const supabase = getAdminClient();

  // First, try to get plaintext credentials (always available)
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("trainerize_username, trainerize_password, trainerize_id")
    .eq("id", userId)
    .single();

  console.log("[getTrainerizeCredentials] userId:", userId);
  console.log("[getTrainerizeCredentials] profile:", JSON.stringify(profile));
  console.log("[getTrainerizeCredentials] error:", error);

  if (error || !profile) {
    console.error("Error fetching profile for credentials:", error);
    return null;
  }

  // Try encrypted credentials if encryption is configured
  if (hasEncryptionKey()) {
    try {
      // Query encrypted columns separately in case they don't exist yet
      const { data: encryptedProfile } = await supabase
        .from("profiles")
        .select("trainerize_username_encrypted, trainerize_password_encrypted")
        .eq("id", userId)
        .single();

      if (
        encryptedProfile?.trainerize_username_encrypted &&
        encryptedProfile?.trainerize_password_encrypted
      ) {
        return {
          username: decrypt(encryptedProfile.trainerize_username_encrypted),
          password: decrypt(encryptedProfile.trainerize_password_encrypted),
          trainerId: profile.trainerize_id || "",
        };
      }
    } catch (error) {
      // Encrypted columns might not exist yet - fall through to plaintext
      console.log("Encrypted credentials not available, using plaintext");
    }
  }

  // Fall back to plaintext credentials (during migration)
  if (profile.trainerize_username && profile.trainerize_password) {
    return {
      username: profile.trainerize_username,
      password: profile.trainerize_password,
      trainerId: profile.trainerize_id || "",
    };
  }

  return null;
}

/**
 * Save Trainerize credentials for a user
 * Encrypts credentials if encryption key is available and columns exist
 *
 * @param userId - The user's auth ID
 * @param credentials - The credentials to save
 */
export async function saveTrainerizeCredentials(
  userId: string,
  credentials: TrainerizeCredentials
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  // Always save plaintext for now (encrypted column migration may not be complete)
  const updates: Record<string, string | null> = {
    trainerize_id: credentials.trainerId,
    trainerize_username: credentials.username,
    trainerize_password: credentials.password,
  };

  // Try to also save encrypted if available
  if (hasEncryptionKey()) {
    try {
      const encryptedUsername = encrypt(credentials.username);
      const encryptedPassword = encrypt(credentials.password);

      // Try to update encrypted columns separately (they may not exist)
      const { error: encryptError } = await supabase
        .from("profiles")
        .update({
          trainerize_username_encrypted: encryptedUsername,
          trainerize_password_encrypted: encryptedPassword,
        })
        .eq("id", userId);

      if (!encryptError) {
        // Clear plaintext if encrypted save succeeded
        updates.trainerize_username = null;
        updates.trainerize_password = null;
      }
    } catch (error) {
      // Encrypted columns may not exist - continue with plaintext
      console.log("Could not save encrypted credentials, using plaintext");
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId);

  if (error) {
    console.error("Error saving credentials:", error);
    return { success: false, error: "Failed to save credentials" };
  }

  return { success: true };
}

/**
 * Create Basic Auth header value from credentials
 */
export function createBasicAuthHeader(credentials: TrainerizeCredentials): string {
  return Buffer.from(`${credentials.username}:${credentials.password}`).toString(
    "base64"
  );
}

/**
 * Check if a user has Trainerize credentials configured
 */
export async function hasTrainerizeCredentials(userId: string): Promise<boolean> {
  const credentials = await getTrainerizeCredentials(userId);
  return credentials !== null && !!credentials.username && !!credentials.password;
}
