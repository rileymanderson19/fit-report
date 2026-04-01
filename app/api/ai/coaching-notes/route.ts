import { createClient } from "@/libs/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import {
  rateLimitMiddleware,
  getClientIdentifier,
  RateLimitPresets,
} from "@/libs/rateLimit";
import {
  generateCoachingMessage,
  fetchCoachProfile,
  type MetricsInput,
} from "@/lib/generate-coaching-message";

/**
 * POST /api/ai/coaching-notes
 * Generates a brief AI coaching summary for a client based on their metrics.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResult = await rateLimitMiddleware(
      getClientIdentifier(req, user.id),
      {
        ...RateLimitPresets.strict,
        message:
          "Too many AI requests. Please wait before generating more coaching notes.",
      }
    );
    if (rateLimitResult) return rateLimitResult;

    const body = await req.json();
    const { clientId, clientName, goal, notes, metrics } = body as {
      clientId: string;
      clientName: string;
      goal: string | null;
      notes: string | null;
      metrics: MetricsInput;
    };

    if (!clientId || !clientName) {
      return NextResponse.json(
        { error: "clientId and clientName are required" },
        { status: 400 }
      );
    }

    // Verify client belongs to this trainer
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id")
      .eq("id", clientId)
      .eq("trainer_id", user.id)
      .single();

    if (clientError || !client) {
      return NextResponse.json(
        { error: "Client not found or access denied" },
        { status: 404 }
      );
    }

    const { profile: coachProfile } = await fetchCoachProfile(supabase, user.id);

    let parsed;
    try {
      parsed = await generateCoachingMessage({
        clientName,
        goal,
        notes,
        metrics,
        coachProfile,
      });
    } catch (aiError: any) {
      console.error("AI generation failed:", aiError.message);
      return NextResponse.json(
        { error: aiError.message || "Failed to generate coaching notes" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ...parsed,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error in /api/ai/coaching-notes:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
