import { createClient } from '@/libs/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { sendOpenAi } from '@/libs/gpt';
import { rateLimitMiddleware, getClientIdentifier, RateLimitPresets } from '@/libs/rateLimit';
import { z } from 'zod';

// Zod schema for validating AI-generated tasks
const TaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  rationale: z.string().optional(),
  category: z.enum(['training', 'nutrition', 'recovery', 'mindset', 'lifestyle', 'general']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  due_date: z.string().optional(), // ISO date string
});

const TasksResponseSchema = z.object({
  tasks: z.array(TaskSchema)
});

interface GenerateTasksRequest {
  clientId: string;
  dateRange?: {
    from: string;
    to: string;
  };
  goal?: 'fat loss' | 'maintenance' | 'muscle gain';
}

/**
 * POST /api/automations/generate-tasks
 * Generates AI-powered action items for a client based on their report data and notes
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Apply rate limiting (strict: 3 requests per minute for AI generation)
    const rateLimitResult = await rateLimitMiddleware(
      getClientIdentifier(req, user.id),
      {
        ...RateLimitPresets.strict,
        message: 'Too many AI task generation requests. This feature uses AI and is rate limited. Please wait before trying again.'
      }
    );

    if (rateLimitResult) {
      return rateLimitResult;
    }

    // Parse request body
    const body: GenerateTasksRequest = await req.json();
    const { clientId, dateRange, goal } = body;

    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId is required' },
        { status: 400 }
      );
    }

    // Fetch client with notes
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .eq('trainer_id', user.id)
      .single();

    if (clientError || !client) {
      return NextResponse.json(
        { error: 'Client not found or access denied' },
        { status: 404 }
      );
    }

    // Fetch coach profile
    const { data: coachProfile } = await supabase
      .from('coach_profiles')
      .select('*')
      .eq('trainer_id', user.id)
      .single();

    // Fetch or generate report data
    let reportData: any = null;
    let cacheId: string | null = null;

    if (dateRange?.from && dateRange?.to) {
      // Try to get cached report first
      const origin = req.nextUrl.origin || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      const authHeader = req.headers.get('authorization') || req.headers.get('cookie');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authHeader) {
        if (authHeader.startsWith('Bearer')) {
          headers['authorization'] = authHeader;
        } else {
          headers['cookie'] = authHeader;
        }
      }

      try {
        const reportResponse = await fetch(`${origin}/api/reports/generate`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            clientId,
            dateRange
          })
        });

        if (reportResponse.ok) {
          const reportResult = await reportResponse.json();
          reportData = reportResult.reportData;
          cacheId = reportResult.cacheId;
        }
      } catch (error) {
        console.error('Error fetching report data:', error);
        // Continue without report data
      }
    }

    // Build context for LLM
    const clientName = `${client.first_name} ${client.last_name}`;
    const clientNotes = client.notes || 'No notes available';
    const coachingStyle = coachProfile?.coaching_tone || 'professional and motivating';
    const preferredGoal = goal || coachProfile?.preferred_goal || 'fat loss';

    // Prepare report summary for LLM
    let reportSummary = 'No report data available';
    if (reportData) {
      const summaryParts: string[] = [];

      // Workout summary
      if (reportData.workoutData?.workouts?.length > 0) {
        summaryParts.push(`Workouts: ${reportData.workoutData.workouts.length} sessions completed`);
      }

      // Body stats summary
      if (reportData.bodyStats?.measurements) {
        const measurements = reportData.bodyStats.measurements;
        if (measurements.weight) {
          summaryParts.push(`Weight tracking: ${measurements.weight.length} measurements`);
        }
      }

      // Nutrition summary
      if (reportData.nutritionData?.entries?.length > 0) {
        summaryParts.push(`Nutrition: ${reportData.nutritionData.entries.length} logged days`);
      }

      // Sleep summary
      if (reportData.sleepData?.entries?.length > 0) {
        summaryParts.push(`Sleep: ${reportData.sleepData.entries.length} tracked nights`);
      }

      reportSummary = summaryParts.join('. ') || 'Limited data available';
    }

    // Create prompt for LLM
    const systemPrompt = `You are an expert fitness coach AI assistant helping to generate actionable tasks for clients. Your role is to analyze client data and create specific, actionable to-do items.

Coaching style: ${coachingStyle}
Client goal: ${preferredGoal}

Generate 3-5 specific, actionable tasks based on the client's data. Each task should:
- Be specific and measurable
- Have a clear rationale based on the data
- Be categorized appropriately (training, nutrition, recovery, mindset, lifestyle, or general)
- Have an appropriate priority level

Return your response as valid JSON matching this structure:
{
  "tasks": [
    {
      "title": "Brief task title (max 200 chars)",
      "description": "Detailed description of what to do",
      "rationale": "Why this task is important based on the data",
      "category": "training|nutrition|recovery|mindset|lifestyle|general",
      "priority": "low|medium|high|urgent",
      "due_date": "YYYY-MM-DD (optional, use if there's a time-sensitive aspect)"
    }
  ]
}`;

    const userPrompt = `Client: ${clientName}

Client Notes:
${clientNotes}

Report Summary:
${reportSummary}

Based on this information, generate 3-5 actionable tasks for this client. Focus on areas where they can improve or need attention.`;

    // Call OpenAI
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const aiResponse = await sendOpenAi(messages, client.trainerize_id || 0, 2000, 0.7);

    if (!aiResponse) {
      return NextResponse.json(
        { error: 'Failed to generate tasks from AI' },
        { status: 500 }
      );
    }

    // Parse and validate AI response
    let parsedResponse: any;
    try {
      // Try to extract JSON from the response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }
      parsedResponse = JSON.parse(jsonMatch[0]);

      // Validate with Zod
      const validatedResponse = TasksResponseSchema.parse(parsedResponse);
      parsedResponse = validatedResponse;
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.error('AI response:', aiResponse);
      return NextResponse.json(
        { error: 'Failed to parse AI response', details: parseError instanceof Error ? parseError.message : 'Unknown error' },
        { status: 500 }
      );
    }

    // Insert tasks into database
    const tasksToInsert = parsedResponse.tasks.map((task: any) => ({
      trainer_id: user.id,
      client_id: clientId,
      title: task.title,
      description: task.description || null,
      rationale: task.rationale || null,
      category: task.category,
      priority: task.priority || 'medium',
      status: 'pending',
      due_date: task.due_date ? new Date(task.due_date).toISOString() : null,
      generated_from_cache_id: cacheId,
      generated_by_llm: true
    }));

    const { data: insertedTasks, error: insertError } = await supabase
      .from('client_tasks')
      .insert(tasksToInsert)
      .select();

    if (insertError) {
      console.error('Error inserting tasks:', insertError);
      return NextResponse.json(
        { error: 'Failed to save tasks', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      tasks: insertedTasks,
      metadata: {
        clientId,
        clientName,
        generatedAt: new Date().toISOString(),
        taskCount: insertedTasks?.length || 0
      }
    });

  } catch (error) {
    console.error('Error in /api/automations/generate-tasks:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
