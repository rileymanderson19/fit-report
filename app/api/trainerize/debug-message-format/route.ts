import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@/libs/supabase/server";

// Force dynamic to prevent static optimization
export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function POST(req: NextRequest) {
  // Block access in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const supabase = createClient();

    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "You must be logged in to debug messages" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { imageData, messageType = "url" } = body;

    let debugResults: any = {
      timestamp: new Date().toISOString(),
      messageType,
      imageDataProvided: !!imageData
    };

    if (imageData) {
      // Test image processing
      const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const fileExtension = imageData.match(/^data:image\/([a-z]+);base64,/)?.[1] || 'png';
      
      debugResults.imageAnalysis = {
        originalLength: imageData.length,
        base64Length: base64Data.length,
        bufferSize: buffer.length,
        fileExtension,
        isValidBase64: /^[A-Za-z0-9+/]*={0,2}$/.test(base64Data)
      };

      if (messageType === "url") {
        // Test image upload
        try {
          const timestamp = Date.now();
          const randomId = Math.random().toString(36).substring(2);
          const uniqueFilename = `debug-report-${timestamp}-${randomId}.${fileExtension}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('temp-images')
            .upload(uniqueFilename, buffer, {
              contentType: `image/${fileExtension}`,
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            debugResults.uploadTest = {
              success: false,
              error: uploadError.message,
              details: uploadError
            };
          } else {
            const { data: urlData } = supabase.storage
              .from('temp-images')
              .getPublicUrl(uniqueFilename);

            debugResults.uploadTest = {
              success: true,
              filename: uniqueFilename,
              publicUrl: urlData.publicUrl,
              uploadData
            };

            // Test message format
            debugResults.messageFormat = {
              subject: "Your Fitness Report - Debug Test",
              body: `Hi Test Client,

Your latest fitness report is ready! 

📊 View your report: ${urlData.publicUrl}

This report covers the last 7 days and includes your workout progress, nutrition data, and body measurements.

Questions? Reply to this message!

Best regards,
Your Trainer`,
              bodyLength: 0 // Will be calculated below
            };
            
            debugResults.messageFormat.bodyLength = debugResults.messageFormat.body.length;
          }
        } catch (uploadError) {
          debugResults.uploadTest = {
            success: false,
            error: uploadError instanceof Error ? uploadError.message : 'Unknown upload error',
            details: uploadError
          };
        }
      } else if (messageType === "base64") {
        // Test base64 message format
        const truncatedData = imageData.length > 200 ? imageData.substring(0, 200) + "..." : imageData;
        
        debugResults.messageFormat = {
          subject: "Test Message with Base64 Image",
          body: `Report attached below:\n\n<img src="${imageData}" alt="Report" style="max-width: 100%;">`,
          bodyLength: 0,
          truncatedPreview: `Report attached below:\n\n<img src="${truncatedData}" alt="Report" style="max-width: 100%;">`
        };
        
        debugResults.messageFormat.bodyLength = debugResults.messageFormat.body.length;
      }
    }

    // Test Supabase storage bucket accessibility using service role
    try {
      // Create a service role client for admin operations like listBuckets
      const { createClient: createServiceClient } = await import('@supabase/supabase-js');
      const serviceSupabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      const { data: buckets, error: bucketsError } = await serviceSupabase.storage.listBuckets();
      debugResults.storageTest = {
        success: !bucketsError,
        buckets: buckets?.map(b => b.name) || [],
        error: bucketsError?.message,
        hasTempImagesBucket: buckets?.some(b => b.name === 'temp-images') || false
      };
    } catch (storageError) {
      debugResults.storageTest = {
        success: false,
        error: storageError instanceof Error ? storageError.message : 'Storage test failed'
      };
    }

    return NextResponse.json({
      success: true,
      debug: debugResults,
      recommendations: generateRecommendations(debugResults)
    });

  } catch (error) {
    console.error("Error in debug-message-format:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function generateRecommendations(debugResults: any): string[] {
  const recommendations: string[] = [];

  if (!debugResults.storageTest?.success) {
    recommendations.push("⚠️ Supabase storage connection failed - check credentials and bucket permissions");
  }

  if (!debugResults.storageTest?.hasTempImagesBucket) {
    recommendations.push("❌ 'temp-images' storage bucket doesn't exist - create it in Supabase dashboard");
  }

  if (debugResults.uploadTest && !debugResults.uploadTest.success) {
    recommendations.push("🔧 Image upload failed - check storage permissions and bucket policies");
  }

  if (debugResults.imageAnalysis && !debugResults.imageAnalysis.isValidBase64) {
    recommendations.push("⚠️ Invalid base64 image data detected");
  }

  if (debugResults.messageFormat && debugResults.messageFormat.bodyLength > 10000) {
    recommendations.push("📏 Message body is very long - consider shorter URLs or compressed images");
  }

  if (debugResults.uploadTest?.success) {
    recommendations.push("✅ Image upload working correctly - URL-based messaging should work");
  }

  if (recommendations.length === 0) {
    recommendations.push("🎉 All tests passed - messaging system should work correctly");
  }

  return recommendations;
} 