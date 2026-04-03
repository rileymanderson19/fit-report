export interface CheckinTemplate {
  id: string;
  name: string;
  description: string;
  promptModifier: string;
}

const DETAIL_INSTRUCTIONS = `Be specific and data-driven. Reference actual numbers from the data: name specific exercises and weights, cite exact workout completion counts, mention specific calorie/protein averages, and reference step counts. Never say "your workouts" generically when you can say "your Upper 1 and Running sessions." Never say "your nutrition" when you can say "averaging 1,669 calories." The more specific you are, the more the client feels seen.`;

export const CHECKIN_TEMPLATES: CheckinTemplate[] = [
  {
    id: "friday-review",
    name: "Friday Weekly Review",
    description: "Summarize the week + ask about weekend plans",
    promptModifier:
      `Write a Friday check-in message. Summarize their training week with specific detail: name the workouts they completed, reference specific exercises and any weight increases, cite their nutrition averages, and mention step counts. Acknowledge what went well with specifics. Ask how their weekend is looking and if they have any active plans. Keep it 3-4 short paragraphs. ${DETAIL_INSTRUCTIONS} Write in the coaching tone and voice described above. Do NOT include a subject line or greeting. Do NOT include a signature.`,
  },
  {
    id: "midweek-pulse",
    name: "Mid-week Check-in",
    description: "Review last couple days + general encouragement",
    promptModifier:
      `Write a mid-week check-in message. Reference their last couple days of activity with specifics: name the workouts they did, mention any standout exercises or PRs, cite nutrition numbers. Ask how their week is going. Keep it conversational, 2-3 short paragraphs. ${DETAIL_INSTRUCTIONS} Write in the coaching tone and voice described above. Do NOT include a subject line or greeting. Do NOT include a signature.`,
  },
  {
    id: "monday-kickoff",
    name: "Monday Kickoff",
    description: "Brief last-week review + set tone for new week",
    promptModifier:
      `Write a Monday kickoff message. Mention last week's highlights with specific numbers (workouts completed, key lifts, nutrition consistency). Set an encouraging tone for the new week. Mention 1-2 specific things to focus on based on their data (e.g., "let's get that protein closer to 150g" or "aim for 4 training sessions this week"). Keep it 2-3 short paragraphs. ${DETAIL_INSTRUCTIONS} Write in the coaching tone and voice described above. Do NOT include a subject line or greeting. Do NOT include a signature.`,
  },
  {
    id: "quick-encouragement",
    name: "Quick Encouragement",
    description: "Positive reinforcement based on recent activity",
    promptModifier:
      `Write a brief encouragement message. Highlight something specific they did well recently: a workout PR with the actual weight, consistent nutrition with the actual numbers, a good step count streak. Be precise, not generic. Keep it 1-2 short paragraphs. Warm and genuine. ${DETAIL_INSTRUCTIONS} Write in the coaching tone and voice described above. Do NOT include a subject line or greeting. Do NOT include a signature.`,
  },
];

export function getTemplateById(id: string): CheckinTemplate | undefined {
  return CHECKIN_TEMPLATES.find((t) => t.id === id);
}
