import { createClient } from "@/libs/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { sendOpenAi } from "@/libs/gpt";
import {
  rateLimitMiddleware,
  getClientIdentifier,
  RateLimitPresets,
} from "@/libs/rateLimit";
import { z } from "zod";

const CoachingNotesSchema = z.object({
  summary: z.string(),
  keyInsights: z.array(z.string()),
  actionItems: z.array(z.string()),
  checkInMessage: z.string(),
});

interface MetricsInput {
  latestWeight: number | null;
  weightChange: number | null;
  avgCalories: number | null;
  avgProtein: number | null;
  avgDailySteps: number | null;
  avgSleep: number | null;
  totalWorkouts: number;
  scheduledWorkouts: number;
  workoutDays: number;
}

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

    // Fetch coach profile
    const { data: coachProfile } = await supabase
      .from("coach_profiles")
      .select("*")
      .eq("trainer_id", user.id)
      .single();

    const coachingTone =
      coachProfile?.coaching_tone || "professional and motivating";
    const coachingVoice = coachProfile?.coaching_voice || "";
    const communicationStyle =
      coachProfile?.communication_style || "direct and actionable";
    const focusAreas =
      coachProfile?.focus_areas?.length > 0
        ? coachProfile.focus_areas.join(", ")
        : "general fitness";
    const constraints = coachProfile?.constraints || "";
    const clientGoal = goal || coachProfile?.preferred_goal || "general";

    // Build metrics summary
    const metricLines: string[] = [];
    if (metrics?.latestWeight != null) {
      metricLines.push(`Latest weight: ${metrics.latestWeight.toFixed(1)} lbs`);
    }
    if (metrics?.weightChange != null) {
      metricLines.push(
        `Weight change this period: ${metrics.weightChange > 0 ? "+" : ""}${metrics.weightChange.toFixed(1)} lbs`
      );
    }
    if (metrics?.scheduledWorkouts > 0) {
      metricLines.push(
        `Training sessions: ${metrics.totalWorkouts} completed out of ${metrics.scheduledWorkouts} scheduled (${metrics.workoutDays} training days)`
      );
    } else if (metrics?.totalWorkouts > 0) {
      metricLines.push(
        `Training sessions: ${metrics.totalWorkouts} completed (${metrics.workoutDays} training days)`
      );
    } else {
      metricLines.push("Training sessions: None logged");
    }
    if (metrics?.avgCalories != null) {
      metricLines.push(
        `Avg daily calories: ${Math.round(metrics.avgCalories)}`
      );
    }
    if (metrics?.avgProtein != null) {
      metricLines.push(
        `Avg daily protein: ${Math.round(metrics.avgProtein)}g`
      );
    }
    if (metrics?.avgDailySteps != null) {
      metricLines.push(
        `Avg daily steps: ${Math.round(metrics.avgDailySteps).toLocaleString()}`
      );
    }
    if (metrics?.avgSleep != null) {
      metricLines.push(`Avg sleep: ${metrics.avgSleep.toFixed(1)} hrs`);
    }

    const metricsSummary =
      metricLines.length > 0
        ? metricLines.join("\n")
        : "No tracking data available";

    const systemPrompt = `You are a coaching assistant for a fitness trainer. Generate a brief coaching summary for a client.

Coaching tone: ${coachingTone}
Communication style: ${communicationStyle}
Focus areas: ${focusAreas}
${coachingVoice ? `Coach's voice: ${coachingVoice}` : ""}
${constraints ? `Rules to follow: ${constraints}` : ""}

## Progress Benchmarks

Use these benchmarks to evaluate whether the client is on track:

**Weight change targets:**
- Fat loss: aim for 0.5–1% of body weight lost per week. Faster than that may mean they need to eat more. Slower may mean adjustments are needed.
- Muscle gain: aim for roughly 0.25 lbs gained per week on their rolling average.
- Maintenance: weight should stay relatively stable (within ±1 lb week to week).

**Daily nutrition targets:**
- Calories: if the client is hitting their weight trend target, their calorie intake is solid. If losing too fast, they may need to eat more. If not losing, a deficit adjustment may be needed.
- Protein: aim for 0.8–1g per lb of body weight per day.
- Fat: aim for at least 0.3g per lb of body weight per day.

**Activity & recovery targets:**
- Steps: aim for 8,000–10,000 steps per day. If progress has stalled, increasing steps is a good lever.
- Sleep: aim for 7–8 hours per night. Flag if consistently under 7.

**Workout performance:**
- If a client is consistently hitting 12+ reps on all sets of an exercise, they should consider increasing the weight on that movement (assuming good form). High reps across the board usually means the load is too light to drive progress.
- If reps are very low (under 5) on most sets, the weight may be too heavy for hypertrophy goals — consider reducing weight and aiming for 6–12 reps.
- Look for progressive overload signals: are they lifting more weight or doing more reps over time? If not, flag it.

Use these benchmarks to give specific, data-driven feedback. Compare the client's actual numbers against these targets and call out what's on track and what needs adjustment.

## Response Format

Respond with valid JSON:
{
  "summary": "2-3 sentence coaching overview of where this client stands",
  "keyInsights": ["3-5 specific observations from the data"],
  "actionItems": ["1-3 concrete next steps for the coach to take with this client"],
  "checkInMessage": "A friendly check-in message addressed directly to the client (using 'you') that: (1) acknowledges their progress with specific numbers from the data, (2) highlights 1-2 things they're doing well, (3) suggests 1-2 adjustments if the data warrants it, and (4) ends with encouragement. Keep it 3-5 short paragraphs. Write in the coaching tone and voice described above. Do NOT include a subject line or greeting like 'Hey [name]'. Do NOT include a signature — just the body of the message."
}

Be specific, reference actual numbers from the data. Keep it concise and actionable. Do not use generic advice.`;

    const userPrompt = `Client: ${clientName}
Goal: ${clientGoal}
${notes ? `Coach notes: ${notes}` : ""}

Recent data:
${metricsSummary}

Generate coaching notes for this client.`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    let aiResponse: string;
    try {
      aiResponse = await sendOpenAi(messages, 0, 1500, 0.7);
    } catch (aiError: any) {
      console.error("AI generation failed:", aiError.message);
      return NextResponse.json(
        { error: aiError.message || "Failed to generate coaching notes" },
        { status: 502 }
      );
    }

    // Parse and validate
    let parsed;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in AI response");
      parsed = CoachingNotesSchema.parse(JSON.parse(jsonMatch[0]));
    } catch (parseError) {
      console.error("Error parsing AI coaching notes:", parseError);
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 }
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
