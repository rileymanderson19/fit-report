import { createClient } from "@/libs/supabase/server";
import { encrypt, decrypt } from "@/libs/encryption";

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
  const supabase = createClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "trainerize_username, trainerize_password, trainerize_id, trainerize_username_encrypted, trainerize_password_encrypted"
    )
    .eq("id", userId)
    .single();

  if (error || !profile) {
    console.error("Error fetching profile for credentials:", error);
    return null;
  }

  // Try encrypted credentials first (if encryption is configured)
  if (
    hasEncryptionKey() &&
    profile.trainerize_username_encrypted &&
    profile.trainerize_password_encrypted
  ) {
    try {
      return {
        username: decrypt(profile.trainerize_username_encrypted),
        password: decrypt(profile.trainerize_password_encrypted),
        trainerId: profile.trainerize_id || "",
      };
    } catch (error) {
      console.error("Error decrypting credentials:", error);
      // Fall through to plaintext
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
 * Encrypts credentials if encryption key is available
 *
 * @param userId - The user's auth ID
 * @param credentials - The credentials to save
 */
export async function saveTrainerizeCredentials(
  userId: string,
  credentials: TrainerizeCredentials
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  const updates: Record<string, string | null> = {
    trainerize_id: credentials.trainerId,
  };

  if (hasEncryptionKey()) {
    // Save encrypted credentials
    try {
      updates.trainerize_username_encrypted = encrypt(credentials.username);
      updates.trainerize_password_encrypted = encrypt(credentials.password);
      // Clear plaintext if it exists
      updates.trainerize_username = null;
      updates.trainerize_password = null;
    } catch (error) {
      console.error("Error encrypting credentials:", error);
      return { success: false, error: "Failed to encrypt credentials" };
    }
  } else {
    // Save plaintext (no encryption key configured)
    console.warn(
      "ENCRYPTION_KEY not set - storing credentials in plaintext (insecure)"
    );
    updates.trainerize_username = credentials.username;
    updates.trainerize_password = credentials.password;
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
