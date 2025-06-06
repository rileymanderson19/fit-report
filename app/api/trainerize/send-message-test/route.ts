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
        { error: "You must be logged in to send messages" },
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

    // Get request body
    const body = await req.json();
    const { clientTrainerizeId, testType = "basic", subject, messageBody, imageData } = body;

    if (!clientTrainerizeId) {
      return NextResponse.json(
        { error: "Client Trainerize ID is required" },
        { status: 400 }
      );
    }

    // Create base64 encoded credentials
    const credentials = Buffer.from(`${profile.trainerize_username}:${profile.trainerize_password}`).toString("base64");

    let messagePayload;

    // Test different payload formats based on testType
    switch (testType) {
      case "basic":
        messagePayload = {
          userID: profile.trainerize_id,
          recipients: [parseInt(clientTrainerizeId)],
          subject: subject || "Test Message from FitReport",
          body: messageBody || "This is a test message to verify messaging functionality.",
          threadType: "mainThread",
          conversationType: "single",
          type: "text"
        };
        break;

      case "html":
        messagePayload = {
          userID: profile.trainerize_id,
          recipients: [parseInt(clientTrainerizeId)],
          subject: subject || "Test HTML Message",
          body: `<h3>Test HTML Message</h3><p>${messageBody || "This is a test with HTML formatting."}</p>`,
          threadType: "mainThread", 
          conversationType: "single",
          type: "text"
        };
        break;

      case "image_base64":
        if (!imageData) {
          return NextResponse.json(
            { error: "Image data required for base64 test" },
            { status: 400 }
          );
        }
        messagePayload = {
          userID: profile.trainerize_id,
          recipients: [parseInt(clientTrainerizeId)],
          subject: subject || "Test Message with Image",
          body: `${messageBody || "Report attached below:"}\n\n<img src="${imageData}" alt="Report" style="max-width: 100%;">`,
          threadType: "mainThread",
          conversationType: "single", 
          type: "text"
        };
        break;

      case "appear_room":
        messagePayload = {
          userID: profile.trainerize_id,
          recipients: [parseInt(clientTrainerizeId)],
          subject: subject || "Test Appear Room Message",
          body: messageBody || "Testing appearRoom functionality",
          threadType: "mainThread",
          conversationType: "single",
          type: "appear",
          appearRoom: "test-room-" + Date.now()
        };
        break;

      case "image_url": {
        if (!imageData) {
          return NextResponse.json(
            { error: "Image data required for URL test" },
            { status: 400 }
          );
        }

        // First upload the image to our temp service
        const uploadResponse = await fetch(`${req.nextUrl.origin}/api/upload/temp-image`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers.get('Authorization') || ''
          },
          body: JSON.stringify({
            imageData,
            filename: `test-report-${Date.now()}.png`
          })
        });

        if (!uploadResponse.ok) {
          return NextResponse.json(
            { error: "Failed to upload image for URL test" },
            { status: 500 }
          );
        }

        const uploadResult = await uploadResponse.json();
        
        messagePayload = {
          userID: profile.trainerize_id,
          recipients: [parseInt(clientTrainerizeId)],
          subject: subject || "Test Message with Image URL",
          body: `${messageBody || "Your fitness report is ready!"}\n\nView your report: ${uploadResult.url}`,
          threadType: "mainThread",
          conversationType: "single",
          type: "text"
        };
        break;
      }

      default:
        return NextResponse.json(
          { error: "Invalid test type" },
          { status: 400 }
        );
    }

    console.log("Testing Trainerize message API with payload:", {
      ...messagePayload,
      body: messagePayload.body.substring(0, 100) + "..." // Truncate for logging
    });

    // Make request to Trainerize API
    const response = await fetch("https://api.trainerize.com/v03/message/send", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(messagePayload)
    });

    const responseData = await response.json();

    // Enhanced logging for debugging
    console.log("Trainerize API Response:", {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data: responseData
    });

    if (!response.ok) {
      console.error("Trainerize API error:", {
        status: response.status,
        statusText: response.statusText,
        data: responseData,
        originalPayload: {
          testType,
          bodyLength: messagePayload.body?.length,
          hasImageData: !!imageData
        }
      });
      
      return NextResponse.json(
        { 
          error: "Failed to send message via Trainerize",
          details: responseData,
          status: response.status,
          debugInfo: {
            testType,
            bodyLength: messagePayload.body?.length,
            messagePreview: messagePayload.body?.substring(0, 200)
          }
        },
        { status: response.status }
      );
    }

    console.log("Message sent successfully:", responseData);

    return NextResponse.json({
      success: true,
      data: responseData,
      testType,
      debugInfo: {
        messageLength: messagePayload.body?.length,
        messagePreview: messagePayload.body?.substring(0, 200),
        imageDataProvided: !!imageData
      },
      messagePayload: {
        ...messagePayload,
        body: messagePayload.body.substring(0, 200) + "..." // Truncate for response
      }
    });

  } catch (error) {
    console.error("Error in send-message-test:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 