import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@/libs/supabase/server";

// Force dynamic to prevent static optimization
export const dynamic = 'force-dynamic';

interface GenerateLinkRequest {
  clientId: string;
  reportId: string;
  imageData?: string; // Optional captured image data from frontend
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();

    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "You must be logged in to generate report links" },
        { status: 401 }
      );
    }

    const body: GenerateLinkRequest = await req.json();
    const { clientId, reportId, imageData } = body;

    if (!clientId || !reportId) {
      return NextResponse.json(
        { error: "Client ID and Report ID are required" },
        { status: 400 }
      );
    }

    // 1. Verify user owns the report and get current link info
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select(`
        id, 
        trainer_id, 
        generated_link_url, 
        link_expires_at, 
        report_data,
        date_range_start,
        date_range_end,
        created_at,
        clients (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('id', reportId)
      .eq('trainer_id', user.id)
      .single();

    if (reportError || !report) {
      return NextResponse.json(
        { error: "Report not found or access denied" },
        { status: 404 }
      );
    }

    // 2. Always generate a new link (overwrite existing ones)
    // This ensures users always get fresh links with the latest data

    // 3. Get client info
    const client = Array.isArray(report.clients) ? report.clients[0] : report.clients;
    if (!client) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }

    // 4. Use provided image data or create a placeholder
    const finalImageData = imageData || createSimpleReportPlaceholder(client);

    // 5. Upload image to Supabase storage
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2);
    const filename = `report-link-${client.first_name}_${client.last_name}-${timestamp}-${randomId}.png`;

    const buffer = Buffer.from(finalImageData.replace(/^data:image\/[a-z]+;base64,/, ''), 'base64');
    
    const { error: uploadError } = await supabase.storage
      .from('temp-images')
      .upload(filename, buffer, {
        contentType: 'image/png',
        cacheControl: '604800', // 7 days cache
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: "Failed to upload report image" },
        { status: 500 }
      );
    }

    // 6. Get public URL
    const { data: urlData } = supabase.storage
      .from('temp-images')
      .getPublicUrl(filename);

    const publicUrl = urlData.publicUrl;

    // 7. Set expiration to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // 8. Update report with new link info
    const { error: updateError } = await supabase
      .from('reports')
      .update({
        generated_link_url: publicUrl,
        link_expires_at: expiresAt.toISOString()
      })
      .eq('id', reportId);

    if (updateError) {
      console.error('Error updating report with link info:', updateError);
      return NextResponse.json(
        { error: "Failed to save link information" },
        { status: 500 }
      );
    }

    console.log(`Generated new report link for report ${reportId}:`, {
      url: publicUrl,
      expiresAt: expiresAt.toISOString()
    });

    return NextResponse.json({
      success: true,
      linkData: {
        url: publicUrl,
        expiresAt: expiresAt.toISOString(),
        isExisting: false
      }
    });

  } catch (error) {
    console.error("Error generating report link:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Helper function to create a simple PNG placeholder
function createSimpleReportPlaceholder(_client: any): string {
  // Create a simple 1x1 pixel PNG as a placeholder
  // This is a base64 encoded 1x1 transparent PNG
  const transparentPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
  return `data:image/png;base64,${transparentPng}`;
}

 