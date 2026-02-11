import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import {
  createTrainerizeClient,
  TrainerizeClientError,
} from "@/libs/trainerize/client";

export const dynamic = "force-dynamic";

interface TrainerizeApiResponse {
  users?: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    photoUrl?: string;
  }>;
}

/**
 * POST /api/admin/setup/fetch-clients
 * Fetch Trainerize clients using provided credentials (admin only).
 * Unlike the regular fetch-clients endpoint, this doesn't read from the user's profile.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Verify admin auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse credentials from request body
    const body = await request.json();
    const { username, password, trainerId } = body;

    if (!username || !password || !trainerId) {
      return NextResponse.json(
        { error: "Username, password, and trainerId are required" },
        { status: 400 }
      );
    }

    // Create Trainerize client with provided credentials
    const client = createTrainerizeClient({ username, password, trainerId });

    const { data } = await client.request<TrainerizeApiResponse>(
      "/v03/user/getClientList",
      {
        method: "POST",
        body: {
          userID: trainerId,
          view: "allActive",
          sort: "name",
        },
      }
    );

    const clients = (data.users || []).map((u) => ({
      id: u.id,
      displayName: `${u.firstName} ${u.lastName}`.trim(),
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      photoUrl: u.photoUrl,
    }));

    return NextResponse.json({ clients });
  } catch (error) {
    console.error("Error fetching clients for admin setup:", error);

    if (error instanceof TrainerizeClientError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch clients" },
      { status: 500 }
    );
  }
}
