export interface CheckinTemplate {
  id: string;
  name: string;
  description: string;
  promptModifier: string;
}

export const CHECKIN_TEMPLATES: CheckinTemplate[] = [
  {
    id: "friday-review",
    name: "Friday Weekly Review",
    description: "Summarize the week + ask about weekend plans",
    promptModifier:
      "Write a Friday check-in message. Summarize their training week (workouts completed, key lifts, nutrition trends). Acknowledge what went well. Ask how their weekend is looking and if they have any active plans. Keep it 3-4 short paragraphs. Write in the coaching tone and voice described above. Do NOT include a subject line or greeting. Do NOT include a signature.",
  },
  {
    id: "midweek-pulse",
    name: "Mid-week Check-in",
    description: "Review last couple days + general encouragement",
    promptModifier:
      "Write a mid-week check-in message. Reference their last couple days of activity. Ask how their week is going. Keep it brief and conversational, 2-3 short paragraphs. Write in the coaching tone and voice described above. Do NOT include a subject line or greeting. Do NOT include a signature.",
  },
  {
    id: "monday-kickoff",
    name: "Monday Kickoff",
    description: "Brief last-week review + set tone for new week",
    promptModifier:
      "Write a Monday kickoff message. Briefly mention last week's highlights (1 sentence). Set an encouraging tone for the new week. Mention 1-2 specific things to focus on based on their data. Keep it 2-3 short paragraphs. Write in the coaching tone and voice described above. Do NOT include a subject line or greeting. Do NOT include a signature.",
  },
  {
    id: "quick-encouragement",
    name: "Quick Encouragement",
    description: "Positive reinforcement based on recent activity",
    promptModifier:
      "Write a brief encouragement message. Highlight something specific they did well recently (a workout PR, consistent nutrition, good step count). Keep it 1-2 short paragraphs. Warm and genuine. Write in the coaching tone and voice described above. Do NOT include a subject line or greeting. Do NOT include a signature.",
  },
];

export function getTemplateById(id: string): CheckinTemplate | undefined {
  return CHECKIN_TEMPLATES.find((t) => t.id === id);
}
