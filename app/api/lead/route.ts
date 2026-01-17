import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { rateLimitMiddleware, getClientIdentifier, RateLimitPresets } from "@/libs/rateLimit";
import { LeadSchema, validateRequest } from "@/libs/validations";
import { handleApiError } from "@/libs/errorHandler";

// This route is used to store the leads that are generated from the landing page.
// The API call is initiated by <ButtonLead /> component
export async function POST(req: NextRequest) {
  try {
    // Apply strict rate limiting (3 requests per minute per IP)
    const rateLimitResponse = await rateLimitMiddleware(
      getClientIdentifier(req),
      {
        ...RateLimitPresets.strict,
        message: 'Too many lead submissions. Please try again later.'
      }
    );

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const body = await req.json();

    // Validate input
    const validation = validateRequest(LeadSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error },
        { status: 400 }
      );
    }

    const { email } = validation.data;

    // Here you can add your own logic
    // For instance, sending a welcome email (use the the sendEmail helper function from /libs/resend)
    // For instance, saving the lead in the database (uncomment the code below)

    // const supabase = createClient();
    // await supabase.from("leads").insert({ email });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'lead capture');
  }
}
