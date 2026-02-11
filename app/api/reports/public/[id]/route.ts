import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { rateLimitMiddleware, getClientIdentifier, RateLimitPresets } from "@/libs/rateLimit";
import { handleApiError } from "@/libs/errorHandler";

// Force dynamic to prevent static optimization
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Apply rate limiting (10 requests per minute per IP)
    const rateLimitResponse = await rateLimitMiddleware(
      getClientIdentifier(req),
      {
        ...RateLimitPresets.standard,
        message: 'Too many requests. Please try again later.'
      }
    );

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const supabase = createClient();
    const reportId = params.id;

    if (!reportId) {
      return NextResponse.json(
        { error: "Report ID is required" },
        { status: 400 }
      );
    }

    // Get report data with client info
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select(`
        id,
        client_id,
        trainer_id,
        report_data,
        date_range_start,
        date_range_end,
        created_at,
        generated_link_url,
        link_expires_at,
        clients (
          id,
          first_name,
          last_name,
          email,
          trainerize_id,
          active
        )
      `)
      .eq('id', reportId)
      .single();

    if (reportError || !report) {
      return NextResponse.json(
        { error: "Report not found" },
        { status: 404 }
      );
    }

    // Check if the report has a generated link (meaning it was shared)
    if (!report.generated_link_url) {
      return NextResponse.json(
        { error: "This report is not publicly accessible" },
        { status: 403 }
      );
    }

    // Check if the link has expired
    const now = new Date();
    const isExpired = !report.link_expires_at || new Date(report.link_expires_at) <= now;

    if (isExpired) {
      return NextResponse.json(
        { 
          error: "Link expired",
          report: null,
          client: null,
          isExpired: true
        },
        { status: 410 } // Gone
      );
    }

    // Fetch trainer's brand settings
    const { data: brandConfig } = await supabase
      .from('report_configurations')
      .select('logo_url, business_name, primary_color, accent_color, footer_text, show_fitreport_badge')
      .eq('trainer_id', report.trainer_id)
      .single();

    const brand = brandConfig ? {
      logo_url: brandConfig.logo_url || null,
      business_name: brandConfig.business_name || null,
      primary_color: brandConfig.primary_color || '#2563EB',
      accent_color: brandConfig.accent_color || '#1D4ED8',
      footer_text: brandConfig.footer_text || null,
      show_fitreport_badge: brandConfig.show_fitreport_badge !== false,
    } : null;

    // Return the report data with client info and brand
    return NextResponse.json({
      report: {
        id: report.id,
        client_id: report.client_id,
        trainer_id: report.trainer_id,
        report_data: report.report_data,
        date_range_start: report.date_range_start,
        date_range_end: report.date_range_end,
        created_at: report.created_at,
        generated_link_url: report.generated_link_url,
        link_expires_at: report.link_expires_at
      },
      client: report.clients,
      brand,
      isExpired: false
    });

  } catch (error) {
    return handleApiError(error, 'fetch public report');
  }
} 