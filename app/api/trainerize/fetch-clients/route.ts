import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@/libs/supabase/server";
import {
  getTrainerizeCredentials,
  TrainerizeCredentials,
} from "@/libs/trainerize/credentials";
import {
  createTrainerizeClient,
  TrainerizeClientError,
} from "@/libs/trainerize/client";
import { rateLimitMiddleware, getClientIdentifier } from "@/libs/rateLimit";

// Force dynamic to prevent static optimization
export const dynamic = "force-dynamic";

// Trainerize API response format
interface TrainerizeApiResponse {
  users?: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    photoUrl?: string;
  }>;
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "You must be logged in to fetch clients" },
        { status: 401 }
      );
    }

    // Rate limiting
    const rateLimitResult = await rateLimitMiddleware(
      getClientIdentifier(req, user.id),
      {
        max: 20,
        windowMs: 60 * 1000,
        message: "Too many requests. Please try again later.",
      }
    );
    if (rateLimitResult) return rateLimitResult;

    console.log("[fetch-clients] Getting credentials for user:", user.id, "email:", user.email);

    // Get Trainerize credentials (handles encrypted vs plaintext automatically)
    const credentials: TrainerizeCredentials | null =
      await getTrainerizeCredentials(user.id);

    console.log("[fetch-clients] credentials result:", credentials ? "found" : "null");

    if (!credentials || !credentials.username) {
      console.log("[fetch-clients] No credentials found, returning 400");
      return NextResponse.json(
        { error: "Trainerize credentials not found" },
        { status: 400 }
      );
    }

    // Create client with retry/backoff
    const client = createTrainerizeClient(credentials);

    // Make request to Trainerize API
    const { data } = await client.request<TrainerizeApiResponse>(
      "/v03/user/getClientList",
      {
        method: "POST",
        body: {
          userID: credentials.trainerId,
          view: "allActive",
          sort: "name",
        },
      }
    );

    console.log("[fetch-clients] Trainerize API response:", JSON.stringify(data));

    // Transform the response to our normalized format
    const clients = (data.users || []).map(user => ({
      id: user.id,
      displayName: `${user.firstName} ${user.lastName}`.trim(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      photoUrl: user.photoUrl,
    }));

    console.log("[fetch-clients] Transformed clients count:", clients.length);

    return NextResponse.json({ clients });
  } catch (error) {
    console.error("Error fetching Trainerize clients:", error);

    if (error instanceof TrainerizeClientError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 });
  }
}
