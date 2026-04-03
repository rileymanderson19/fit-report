import { z } from "zod";
import { sendOpenAi } from "@/libs/gpt";

// ── Types ──────────────────────────────────────────────────

export interface MetricsInput {
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

export const CoachingNotesSchema = z.object({
  summary: z.string(),
  keyInsights: z.array(z.string()),
  actionItems: z.array(z.string()),
  checkInMessage: z.string(),
});

export type CoachingNotes = z.infer<typeof CoachingNotesSchema>;

export interface CoachProfile {
  coaching_tone: string;
  coaching_voice: string;
  communication_style: string;
  focus_areas: string;
  constraints: string;
  preferred_goal: string;
}

// ── Coach Profile ──────────────────────────────────────────

const DEFAULT_COACH_PROFILE: CoachProfile = {
  coaching_tone: "professional and motivating",
  coaching_voice: "",
  communication_style: "direct and actionable",
  focus_areas: "general fitness",
  constraints: "",
  preferred_goal: "general",
};

export async function fetchCoachProfile(
  supabase: any,
  trainerId: string
): Promise<{ profile: CoachProfile; exists: boolean }> {
  const { data: coachProfile } = await supabase
    .from("coach_profiles")
    .select("*")
    .eq("trainer_id", trainerId)
    .single();

  if (!coachProfile) {
    return { profile: DEFAULT_COACH_PROFILE, exists: false };
  }

  return {
    profile: {
      coaching_tone: coachProfile.coaching_tone || DEFAULT_COACH_PROFILE.coaching_tone,
      coaching_voice: coachProfile.coaching_voice || "",
      communication_style: coachProfile.communication_style || DEFAULT_COACH_PROFILE.communication_style,
      focus_areas:
        coachProfile.focus_areas?.length > 0
          ? coachProfile.focus_areas.join(", ")
          : DEFAULT_COACH_PROFILE.focus_areas,
      constraints: coachProfile.constraints || "",
      preferred_goal: coachProfile.preferred_goal || "general",
    },
    exists: true,
  };
}

// ── Metrics Summary ────────────────────────────────────────

export function buildMetricsSummary(metrics: MetricsInput): string {
  const lines: string[] = [];

  if (metrics?.latestWeight != null) {
    lines.push(`Latest weight: ${metrics.latestWeight.toFixed(1)} lbs`);
  }
  if (metrics?.weightChange != null) {
    lines.push(
      `Weight change this period: ${metrics.weightChange > 0 ? "+" : ""}${metrics.weightChange.toFixed(1)} lbs`
    );
  }
  if (metrics?.scheduledWorkouts > 0) {
    lines.push(
      `Training sessions: ${metrics.totalWorkouts} completed out of ${metrics.scheduledWorkouts} scheduled (${metrics.workoutDays} training days)`
    );
  } else if (metrics?.totalWorkouts > 0) {
    lines.push(
      `Training sessions: ${metrics.totalWorkouts} completed (${metrics.workoutDays} training days)`
    );
  } else {
    lines.push("Training sessions: None logged");
  }
  if (metrics?.avgCalories != null) {
    lines.push(`Avg daily calories: ${Math.round(metrics.avgCalories)}`);
  }
  if (metrics?.avgProtein != null) {
    lines.push(`Avg daily protein: ${Math.round(metrics.avgProtein)}g`);
  }
  if (metrics?.avgDailySteps != null) {
    lines.push(
      `Avg daily steps: ${Math.round(metrics.avgDailySteps).toLocaleString()}`
    );
  }
  if (metrics?.avgSleep != null) {
    lines.push(`Avg sleep: ${metrics.avgSleep.toFixed(1)} hrs`);
  }

  return lines.length > 0 ? lines.join("\n") : "No tracking data available";
}

// ── System Prompt ──────────────────────────────────────────

const PROGRESS_BENCHMARKS = `## Progress Benchmarks

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

Use these benchmarks to give specific, data-driven feedback. Compare the client's actual numbers against these targets and call out what's on track and what needs adjustment.`;

function buildSystemPrompt(profile: CoachProfile, promptModifier?: string): string {
  const checkInInstruction = promptModifier
    ? `"checkInMessage": "${promptModifier}"`
    : `"checkInMessage": "A friendly check-in message addressed directly to the client (using 'you') that: (1) acknowledges their progress with specific numbers from the data, (2) highlights 1-2 things they're doing well, (3) suggests 1-2 adjustments if the data warrants it, and (4) ends with encouragement. Keep it 3-5 short paragraphs. Write in the coaching tone and voice described above. Do NOT include a subject line or greeting like 'Hey [name]'. Do NOT include a signature — just the body of the message."`;

  return `You are a coaching assistant for a fitness trainer. Generate a brief coaching summary for a client.

Coaching tone: ${profile.coaching_tone}
Communication style: ${profile.communication_style}
Focus areas: ${profile.focus_areas}
${profile.coaching_voice ? `Coach's voice: ${profile.coaching_voice}` : ""}
${profile.constraints ? `Rules to follow: ${profile.constraints}` : ""}

${PROGRESS_BENCHMARKS}

## Response Format

Respond with valid JSON:
{
  "summary": "2-3 sentence coaching overview of where this client stands",
  "keyInsights": ["3-5 specific observations from the data"],
  "actionItems": ["1-3 concrete next steps for the coach to take with this client"],
  ${checkInInstruction}
}

Be specific, reference actual numbers from the data. Keep it concise and actionable. Do not use generic advice.

## CRITICAL: Anti-AI Writing Rules for checkInMessage

The checkInMessage must sound like a real human coach typing a message to their client, NOT like AI-generated content. Follow these rules strictly:

NEVER use these AI-sounding words/phrases:
- "crucial", "vital", "significant", "essential", "key", "pivotal"
- "ensure", "foster", "showcase", "commitment to", "dedication to"
- "let's make sure", "it's really important", "I noticed that"
- "reflects broader", "contributing to", "aligns with your goals"
- "journey", "endeavor", "strive", "thrive", "empower"
- "great job", "amazing work", "fantastic", "incredible" (generic praise)
- "moving in the right direction", "on the right track" (vague encouragement)
- Any sentence starting with "I noticed" or "Let's make sure"
- Exclamation marks more than once per message

INSTEAD write like a real coach texting:
- Short, casual sentences. Fragments are fine. "Solid week."
- Reference specific data points naturally, like you're reading their log. "4 out of 5 sessions done, squat went up 10lbs"
- If something needs work, say it directly. "Protein is low, try to get closer to 150g"
- Sound like you actually know this person, not like a form letter
- Use contractions (you're, don't, let's, wasn't)
- One thought per sentence. No compound sentences with semicolons.
- End with a simple question, not a motivational speech`;

}

// ── Generate Coaching Message ──────────────────────────────

export interface GenerateCoachingMessageInput {
  clientName: string;
  goal: string | null;
  notes: string | null;
  metrics: MetricsInput;
  coachProfile: CoachProfile;
  promptModifier?: string;
}

export async function generateCoachingMessage(
  input: GenerateCoachingMessageInput
): Promise<CoachingNotes> {
  const { clientName, goal, notes, metrics, coachProfile, promptModifier } = input;

  const clientGoal = goal || coachProfile.preferred_goal || "general";
  const metricsSummary = buildMetricsSummary(metrics);
  const systemPrompt = buildSystemPrompt(coachProfile, promptModifier);

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

  const aiResponse = await sendOpenAi(messages, 0, 1500, 0.7);

  const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in AI response");

  return CoachingNotesSchema.parse(JSON.parse(jsonMatch[0]));
}
