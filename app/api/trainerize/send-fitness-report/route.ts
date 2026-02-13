import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@/libs/supabase/server";

// Force dynamic to prevent static optimization
export const dynamic = 'force-dynamic';
export const runtime = 'edge';

interface SendReportRequest {
  clientId: string;
  reportId: string;
  subject?: string;
  customMessage?: string;
  signature?: string;
  includeWorkouts?: boolean;
  includeNutrition?: boolean;
  includeProgress?: boolean;
  imageData?: string; // Base64 image data from client-side capture
}

export async function POST(req: NextRequest) {
  try {
    console.log("=== Starting send-fitness-report API call ===");
    const supabase = createClient();

    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error("No authenticated user found");
      return NextResponse.json(
        { error: "You must be logged in to send reports" },
        { status: 401 }
      );
    }

    console.log("Authenticated user:", user.id);

    const body: SendReportRequest = await req.json();
    const { 
      clientId, 
      reportId, 
      subject, 
      customMessage,
      signature,
      includeWorkouts = true,
      includeNutrition = true,
      includeProgress = true,
      imageData
    } = body;

    console.log("Request body:", { clientId, reportId, subject, customMessage, signature, includeWorkouts, includeNutrition, includeProgress, hasImageData: !!imageData });

    if (!clientId || !reportId) {
      return NextResponse.json(
        { error: "Client ID and Report ID are required" },
        { status: 400 }
      );
    }

    // 1. Fetch client data
    console.log("Fetching client data for ID:", clientId);
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, first_name, last_name, email, trainerize_id, trainer_id')
      .eq('id', clientId)
      .eq('trainer_id', user.id) // Ensure user owns this client
      .single();

    if (clientError || !client) {
      console.error("Client fetch error:", clientError);
      return NextResponse.json(
        { 
          error: "Client not found or access denied", 
          details: clientError?.message,
          clientId 
        },
        { status: 404 }
      );
    }

    console.log("Client data fetched:", {
      id: client.id,
      name: `${client.first_name} ${client.last_name}`,
      email: client.email,
      trainerize_id: client.trainerize_id,
      trainerize_id_type: typeof client.trainerize_id,
      has_trainerize_id: !!client.trainerize_id
    });

    // 2. Fetch report data
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .eq('client_id', clientId)
      .single();

    if (reportError || !report) {
      console.error("Report fetch error:", reportError);
      return NextResponse.json(
        { 
          error: "Report not found", 
          details: reportError?.message,
          reportId,
          clientId 
        },
        { status: 404 }
      );
    }

    // 3. Get Trainerize credentials
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("trainerize_username, trainerize_password, trainerize_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.trainerize_username) {
      return NextResponse.json(
        { error: "Trainerize credentials not found" },
        { status: 400 }
      );
    }

    // 4. Process report data for image capture
    const reportData = report.report_data;
    
    // Create HTML content for report capture
    const _reportHtml = generateReportHtml(reportData, client, {
      includeWorkouts,
      includeNutrition,
      includeProgress
    });

    // 5. Create image buffer from client-side capture or test image
    let imageBuffer: Buffer;
    let contentType: string;
    let fileExtension: string;

    if (imageData) {
      // Use client-side captured image data
      console.log("Using client-side captured image data");
      const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
      const imageType = imageData.match(/^data:image\/([a-z]+);base64,/)?.[1] || 'png';
      imageBuffer = Buffer.from(base64Data, 'base64');
      contentType = `image/${imageType}`;
      fileExtension = imageType;
      
      console.log("Client image processed:", {
        originalLength: imageData.length,
        bufferLength: imageBuffer.length,
        imageType,
        contentType
      });
    } else {
      // Fallback to test image
      console.log("No image data provided, creating test image...");
      imageBuffer = await createTestReportImage(client, report);
      contentType = 'image/svg+xml';
      fileExtension = 'svg';
      
      console.log("Test image buffer created:", {
        bufferLength: imageBuffer.length,
        isBuffer: Buffer.isBuffer(imageBuffer)
      });
    }

    // 6. Upload image to Supabase storage
    const timestamp = Date.now();
    const filename = `fitness-report-${client.first_name}-${client.last_name}-${timestamp}.${fileExtension}`;

    const { error: uploadError } = await supabase.storage
      .from('temp-images')
      .upload(filename, imageBuffer, {
        contentType,
        cacheControl: '86400', // 24 hours
        upsert: false
      });

    if (uploadError) {
      console.error("Upload error:", {
        error: uploadError,
        filename,
        bufferLength: imageBuffer.length,
        storageAction: 'upload to temp-images bucket'
      });
      return NextResponse.json(
        { 
          error: "Failed to upload report image",
          details: uploadError.message 
        },
        { status: 500 }
      );
    }

    // 7. Get public URL
    const { data: urlData } = supabase.storage
      .from('temp-images')
      .getPublicUrl(filename);

    // Use Supabase URLs for now (custom domain disabled)
    const publicUrl = urlData.publicUrl;
    
    // TODO: Re-enable custom domain when DNS is ready
    // const publicUrl = urlData.publicUrl.replace(
    //   'jdxybubfszksqlgparua.supabase.co',
    //   'reports.fitreport.com'
    // );

    // 8. Generate message using provided content from configuration
    const messageContent = generateMessageFromConfig(
      client, 
      publicUrl, 
      reportData, 
      subject || `Your Fitness Report - ${formatDate(new Date())}`,
      customMessage || `Hi ${client.first_name},\n\nYour latest fitness report is ready! Please find it attached.\n\nView your report: ${publicUrl}`,
      signature
    );

    console.log("Generated message content:", {
      hasBody: !!messageContent.body,
      bodyLength: messageContent.body?.length,
      bodyPreview: messageContent.body?.substring(0, 100),
      hasSubject: !!messageContent.subject,
      subject: messageContent.subject
    });

    // 9. Send message via Trainerize
    const credentials = Buffer.from(`${profile.trainerize_username}:${profile.trainerize_password}`).toString("base64");

    // Debug the request payload - use correct Trainerize API format
    const requestPayload = {
      userID: profile.trainerize_id,  // Trainer's ID
      recipients: [client.trainerize_id],  // Client's ID in recipients array  
      subject: subject || `Your Fitness Report - ${formatDate(new Date())}`,
      body: messageContent.body,
      threadType: "mainThread",
      conversationType: "single", 
      type: "text"
    };

    console.log("Image upload result:", {
      publicUrl,
      urlLength: publicUrl?.length,
      urlValid: publicUrl?.startsWith('http')
    });

    console.log("Trainerize API request payload:", {
      userID: requestPayload.userID,
      recipients: requestPayload.recipients,
      subject: requestPayload.subject,
      bodyLength: requestPayload.body?.length,
      threadType: requestPayload.threadType,
      conversationType: requestPayload.conversationType,
      type: requestPayload.type,
      hasCredentials: !!credentials,
      trainerData: {
        trainerize_id: profile.trainerize_id,
        trainerize_username: profile.trainerize_username
      },
      clientData: {
        id: client.id,
        trainerize_id: client.trainerize_id,
        first_name: client.first_name,
        last_name: client.last_name
      }
    });

    // Check for null values
    if (!client.trainerize_id) {
      console.error("Missing trainerize_id for client:", {
        clientId: client.id,
        firstName: client.first_name,
        lastName: client.last_name,
        trainerizeId: client.trainerize_id
      });
      return NextResponse.json(
        { 
          error: "Client does not have a Trainerize ID associated", 
          details: `${client.first_name} ${client.last_name} needs to be linked to a Trainerize account first.`
        },
        { status: 400 }
      );
    }

    if (!profile.trainerize_id) {
      console.error("Missing trainerize_id for trainer:", {
        userId: user.id,
        username: profile.trainerize_username
      });
      return NextResponse.json(
        { 
          error: "Trainer does not have a Trainerize ID associated", 
          details: "Please set your Trainerize ID in your profile settings."
        },
        { status: 400 }
      );
    }

    const trainerizeResponse = await fetch("https://api.trainerize.com/v03/message/send", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestPayload)
    });

    if (!trainerizeResponse.ok) {
      const errorData = await trainerizeResponse.json().catch(() => ({}));
      console.error("Trainerize API error:", {
        status: trainerizeResponse.status,
        statusText: trainerizeResponse.statusText,
        errorData,
        userID: client.trainerize_id,
        hasCredentials: !!profile.trainerize_username
      });
      return NextResponse.json(
        { 
          error: "Failed to send message via Trainerize",
          details: {
            status: trainerizeResponse.status,
            message: errorData.message || trainerizeResponse.statusText
          }
        },
        { status: 500 }
      );
    }

    const trainerizeResult = await trainerizeResponse.json();

    // 10. Log delivery for tracking
    const { error: logError } = await supabase
      .from('report_deliveries')
      .insert({
        trainer_id: user.id,
        client_id: clientId,
        report_id: reportId,
        delivery_method: 'trainerize_message',
        image_url: publicUrl,
        message_content: messageContent.body,
        trainerize_message_id: trainerizeResult.id,
        delivered_at: new Date().toISOString(),
        status: 'delivered'
      });

    if (logError) {
      console.error("Failed to log delivery:", logError);
      // Don't fail the request for logging errors
    }

    return NextResponse.json({
      success: true,
      message: "Fitness report sent successfully",
      data: {
        clientName: `${client.first_name} ${client.last_name}`,
        imageUrl: publicUrl,
        messageId: trainerizeResult.id,
        deliveredAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("Error sending fitness report:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Helper function to generate report HTML for image capture
function generateReportHtml(reportData: any, client: any, options: any): string {
  const { includeWorkouts, includeNutrition, includeProgress } = options;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: white;
          padding: 40px;
          color: #1a1a1a;
          line-height: 1.6;
          width: 800px;
          margin: 0 auto;
        }
        .header {
          text-align: center;
          border-bottom: 3px solid #2563eb;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .header h1 {
          color: #2563eb;
          font-size: 28px;
          margin: 0;
          font-weight: 600;
        }
        .header h2 {
          color: #64748b;
          font-size: 18px;
          margin: 10px 0 0 0;
          font-weight: 400;
        }
        .section {
          margin-bottom: 30px;
        }
        .section h3 {
          color: #1a1a1a;
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 15px;
          border-left: 4px solid #2563eb;
          padding-left: 15px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          background: white;
          border: 1px solid #e2e8f0;
        }
        th {
          background: #f1f5f9;
          color: #1a1a1a;
          font-weight: 600;
          text-align: left;
          padding: 12px 16px;
          border-bottom: 2px solid #e2e8f0;
        }
        td {
          padding: 12px 16px;
          border-bottom: 1px solid #e2e8f0;
          color: #1a1a1a;
        }
        tr:nth-child(even) {
          background: #f8fafc;
        }
        .metric-card {
          display: inline-block;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 20px;
          margin: 10px;
          text-align: center;
          min-width: 150px;
        }
        .metric-value {
          font-size: 24px;
          font-weight: 600;
          color: #2563eb;
        }
        .metric-label {
          color: #64748b;
          font-size: 14px;
          margin-top: 5px;
        }
        .footer {
          text-align: center;
          color: #64748b;
          font-size: 14px;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Fitness Report</h1>
        <h2>${client.first_name} ${client.last_name}</h2>
        <p>Generated on ${formatDate(new Date())}</p>
      </div>
      
      ${includeProgress ? generateProgressSection(reportData) : ''}
      ${includeNutrition ? generateNutritionSection(reportData) : ''}
      ${includeWorkouts ? generateWorkoutsSection(reportData) : ''}
      
      <div class="footer">
        <p>Keep up the great work! 💪</p>
        <p>Questions? Reply to this message anytime.</p>
      </div>
    </body>
    </html>
  `;
}

// Helper function to generate message content from configuration
function generateMessageFromConfig(
  client: any, 
  imageUrl: string, 
  reportData: any, 
  subject: string,
  customMessage: string,
  signature?: string
): { subject: string; body: string } {
  // Prepare all variables that might be used in the message
  const variables = {
    clientName: `${client.first_name} ${client.last_name}`,
    date: formatDate(new Date()),
    trainerName: 'Your Trainer', // Could be enhanced to get actual trainer name
    reportUrl: imageUrl
  };

  // Replace all variable placeholders in the message
  let finalMessage = customMessage;
  Object.entries(variables).forEach(([key, value]) => {
    finalMessage = finalMessage.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  });
  
  // Replace variables in subject as well
  let finalSubject = subject;
  Object.entries(variables).forEach(([key, value]) => {
    finalSubject = finalSubject.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  });
  
  // Add signature if provided (also process variables in signature)
  if (signature) {
    let finalSignature = signature;
    Object.entries(variables).forEach(([key, value]) => {
      finalSignature = finalSignature.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    });
    finalMessage += `\n\n${finalSignature}`;
  }

  return {
    subject: finalSubject,
    body: finalMessage
  };
}

// Create a simple test image for now
async function createTestReportImage(client: any, _report: any): Promise<Buffer> {
  // Create SVG content as a test image
  const svgContent = `
    <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style>
          .title { font-family: Arial, sans-serif; font-size: 32px; font-weight: bold; fill: #2563eb; }
          .subtitle { font-family: Arial, sans-serif; font-size: 20px; fill: #64748b; }
          .content { font-family: Arial, sans-serif; font-size: 16px; fill: #1a1a1a; }
          .metric { font-family: Arial, sans-serif; font-size: 24px; font-weight: bold; fill: #2563eb; }
          .label { font-family: Arial, sans-serif; font-size: 14px; fill: #64748b; }
        </style>
      </defs>
      
      <!-- Background -->
      <rect width="800" height="600" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
      
      <!-- Header -->
      <rect x="0" y="0" width="800" height="80" fill="#f8fafc"/>
      <text x="400" y="30" text-anchor="middle" class="title">FITNESS REPORT</text>
      <text x="400" y="55" text-anchor="middle" class="subtitle">${client.first_name} ${client.last_name}</text>
      
      <!-- Content Area -->
      <text x="50" y="130" class="content">📊 Progress Overview</text>
      
      <!-- Metrics Cards -->
      <rect x="50" y="150" width="200" height="100" fill="#f1f5f9" stroke="#e2e8f0" rx="8"/>
      <text x="150" y="185" text-anchor="middle" class="metric">3</text>
      <text x="150" y="210" text-anchor="middle" class="label">Workouts Completed</text>
      
      <rect x="300" y="150" width="200" height="100" fill="#f1f5f9" stroke="#e2e8f0" rx="8"/>
      <text x="400" y="185" text-anchor="middle" class="metric">8,500</text>
      <text x="400" y="210" text-anchor="middle" class="label">Daily Steps Average</text>
      
      <rect x="550" y="150" width="200" height="100" fill="#f1f5f9" stroke="#e2e8f0" rx="8"/>
      <text x="650" y="185" text-anchor="middle" class="metric">2,100</text>
      <text x="650" y="210" text-anchor="middle" class="label">Daily Calories Average</text>
      
      <!-- Nutrition Section -->
      <text x="50" y="310" class="content">🥗 Nutrition Summary</text>
      <rect x="50" y="330" width="700" height="120" fill="#f8fafc" stroke="#e2e8f0" rx="8"/>
      <text x="70" y="360" class="content">✅ Calories: 2,100 / 2,000 (On Track)</text>
      <text x="70" y="385" class="content">✅ Protein: 145g / 140g (Exceeded)</text>
      <text x="70" y="410" class="content">✅ Water: 8 glasses / 8 glasses (Perfect)</text>
      
      <!-- Footer -->
      <text x="400" y="520" text-anchor="middle" class="content">Keep up the excellent work! 💪</text>
      <text x="400" y="545" text-anchor="middle" class="label">Generated on ${new Date().toLocaleDateString()}</text>
      
      <!-- Watermark -->
      <text x="400" y="580" text-anchor="middle" class="label">FitReport - Powered by Trainerize</text>
    </svg>
  `;

  // Convert SVG to PNG buffer using a simple method
  // For production, you'd want to use a proper image conversion library
  // But for now, we'll return the SVG as-is and let the browser handle it
  const _base64Svg = Buffer.from(svgContent).toString('base64');

  // For now, return the SVG content as a buffer
  // This will work for display purposes
  return Buffer.from(svgContent, 'utf-8');
}

// Helper functions for generating HTML sections
function generateProgressSection(_reportData: any): string {
  // Simplified - you'd extract actual metrics from reportData
  return `
    <div class="section">
      <h3>Progress Overview</h3>
      <div class="metric-card">
        <div class="metric-value">3</div>
        <div class="metric-label">Workouts Completed</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">8,500</div>
        <div class="metric-label">Avg Daily Steps</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">2,100</div>
        <div class="metric-label">Avg Daily Calories</div>
      </div>
    </div>
  `;
}

function generateNutritionSection(_reportData: any): string {
  return `
    <div class="section">
      <h3>Nutrition Summary</h3>
      <table>
        <thead>
          <tr>
            <th>Metric</th>
            <th>Average</th>
            <th>Goal</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Calories</td>
            <td>2,100</td>
            <td>2,000</td>
            <td>✅ On Track</td>
          </tr>
          <tr>
            <td>Protein (g)</td>
            <td>145</td>
            <td>140</td>
            <td>✅ Exceeded</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

function generateWorkoutsSection(_reportData: any): string {
  return `
    <div class="section">
      <h3>Workout Summary</h3>
      <p>Great consistency this week! You completed 3 out of 4 scheduled workouts.</p>
    </div>
  `;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
} 