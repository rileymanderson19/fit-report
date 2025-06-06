import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@/libs/supabase/server";

// Force dynamic to prevent static optimization
export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();

    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "You must be logged in to investigate upload capabilities" },
        { status: 401 }
      );
    }

    // Get the user's Trainerize credentials
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("trainerize_username, trainerize_password, trainerize_id")
      .eq("id", user.id)
      .single();

    if (error || !profile?.trainerize_username) {
      return NextResponse.json(
        { error: "Trainerize credentials not found" },
        { status: 400 }
      );
    }

    // Create base64 encoded credentials
    const credentials = Buffer.from(`${profile.trainerize_username}:${profile.trainerize_password}`).toString("base64");

    // Test different potential upload endpoints
    const endpointsToTest = [
      'https://api.trainerize.com/v03/file/upload',
      'https://api.trainerize.com/v03/upload',
      'https://api.trainerize.com/v03/media/upload',
      'https://api.trainerize.com/v03/message/upload',
      'https://api.trainerize.com/v03/attachment/upload',
      'https://api.trainerize.com/v03/document/upload'
    ];

    const results: any[] = [];

    for (const endpoint of endpointsToTest) {
      try {
        console.log(`Testing endpoint: ${endpoint}`);
        
        // First try OPTIONS request to see if endpoint exists
        const optionsResponse = await fetch(endpoint, {
          method: "OPTIONS",
          headers: {
            "Authorization": `Basic ${credentials}`,
          }
        });

        const optionsResult = {
          endpoint,
          method: 'OPTIONS',
          status: optionsResponse.status,
          statusText: optionsResponse.statusText,
          headers: Object.fromEntries(optionsResponse.headers.entries()),
          exists: optionsResponse.status !== 404
        };

        results.push(optionsResult);

        // If endpoint exists, try a test POST with minimal data
        if (optionsResponse.status !== 404) {
          try {
            const postResponse = await fetch(endpoint, {
              method: "POST",
              headers: {
                "Authorization": `Basic ${credentials}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                userID: profile.trainerize_id,
                test: true
              })
            });

            const postData = await postResponse.text();
            
            const postResult = {
              endpoint,
              method: 'POST',
              status: postResponse.status,
              statusText: postResponse.statusText,
              headers: Object.fromEntries(postResponse.headers.entries()),
              data: postData.substring(0, 500) // Limit response size
            };

            results.push(postResult);
          } catch (postError) {
            results.push({
              endpoint,
              method: 'POST',
              error: postError instanceof Error ? postError.message : 'Unknown error'
            });
          }
        }

      } catch (error) {
        results.push({
          endpoint,
          method: 'OPTIONS',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Also test if we can get API documentation or available endpoints
    try {
      const apiInfoResponse = await fetch("https://api.trainerize.com/v03/", {
        method: "GET",
        headers: {
          "Authorization": `Basic ${credentials}`,
          "Accept": "application/json"
        }
      });

      if (apiInfoResponse.ok) {
        const apiInfo = await apiInfoResponse.text();
        results.push({
          endpoint: 'API Root',
          method: 'GET',
          status: apiInfoResponse.status,
          data: apiInfo.substring(0, 1000)
        });
      }
    } catch (error) {
      // Ignore errors for API root check
    }

    return NextResponse.json({
      success: true,
      message: "Upload investigation completed",
      results,
      summary: {
        totalEndpointsTested: endpointsToTest.length,
        existingEndpoints: results.filter(r => r.exists === true && r.method === 'OPTIONS').length,
        workingEndpoints: results.filter(r => r.status && r.status < 400 && r.method === 'POST').length
      }
    });

  } catch (error) {
    console.error("Error in investigate-upload:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 