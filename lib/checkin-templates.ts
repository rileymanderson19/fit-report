export interface CheckinTemplate {
  id: string;
  name: string;
  description: string;
  promptModifier: string;
}

const DETAIL_INSTRUCTIONS = `Reference actual numbers from the data naturally, like you're reading their training log out loud. "Upper 1 and Running done this week, squat went up 5lbs" not "your workouts have been going well." "Averaging 1,669 cals" not "your nutrition." Specific beats generic every time.`;

export const CHECKIN_TEMPLATES: CheckinTemplate[] = [
  {
    id: "friday-review",
    name: "Friday Weekly Review",
    description: "Summarize the week + ask about weekend plans",
    promptModifier:
      `Write a Friday end-of-week message like a real coach texting their client. Mention specific workouts they did by name, any weight PRs or rep improvements, their calorie/protein averages if available, and step counts. If something was off this week, say it plainly. Ask one casual question about their weekend. Keep it 2-3 short paragraphs max. Write like you're texting, not writing an essay. Short sentences. Fragments ok. No motivational speeches. ${DETAIL_INSTRUCTIONS} Write in the coaching tone and voice described above. Do NOT include a subject line or greeting. Do NOT include a signature.`,
  },
  {
    id: "midweek-pulse",
    name: "Mid-week Check-in",
    description: "Review last couple days + general encouragement",
    promptModifier:
      `Write a quick mid-week text like a coach checking in. Mention what they've done so far this week (name the workouts). If anything looks off, flag it. Ask how the rest of their week is looking. Keep it short, 1-2 paragraphs. Casual tone, like a text message. ${DETAIL_INSTRUCTIONS} Write in the coaching tone and voice described above. Do NOT include a subject line or greeting. Do NOT include a signature.`,
  },
  {
    id: "monday-kickoff",
    name: "Monday Kickoff",
    description: "Brief last-week review + set tone for new week",
    promptModifier:
      `Write a Monday message like a coach setting up the week. One line about how last week went (with numbers). Then 1-2 things to focus on this week based on their data. Keep it tight, 2 short paragraphs. No pep talks, just what to do. ${DETAIL_INSTRUCTIONS} Write in the coaching tone and voice described above. Do NOT include a subject line or greeting. Do NOT include a signature.`,
  },
  {
    id: "quick-encouragement",
    name: "Quick Encouragement",
    description: "Positive reinforcement based on recent activity",
    promptModifier:
      `Write a quick encouragement text. Pick ONE specific thing they did well (a PR, hitting their protein, consistent steps) and call it out with the actual number. Keep it to 2-3 sentences. Don't pile on praise. Just acknowledge the one thing and move on. ${DETAIL_INSTRUCTIONS} Write in the coaching tone and voice described above. Do NOT include a subject line or greeting. Do NOT include a signature.`,
  },
];

export function getTemplateById(id: string): CheckinTemplate | undefined {
  return CHECKIN_TEMPLATES.find((t) => t.id === id);
}
