import { NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const supabase = createClient();

    // Create a small test file
    const testContent = "test-image-upload-" + Date.now();
    const buffer = Buffer.from(testContent, 'utf8');
    const filename = `test-${Date.now()}.txt`;

    console.log("Attempting direct upload to temp-images bucket...");

    // Try direct upload to temp-images bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('temp-images')
      .upload(filename, buffer, {
        contentType: 'text/plain',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json({
        success: false,
        error: "Upload failed",
        details: uploadError,
        bucketExists: false
      });
    }

    console.log("Upload successful:", uploadData);

    // Try to get public URL
    const { data: urlData } = supabase.storage
      .from('temp-images')
      .getPublicUrl(filename);

    console.log("Public URL:", urlData.publicUrl);

    // Try to list files in bucket
    const { data: files, error: listError } = await supabase.storage
      .from('temp-images')
      .list('', { limit: 10 });

    console.log("Files list:", files, listError);

    // Clean up - delete test file
    const { error: deleteError } = await supabase.storage
      .from('temp-images')
      .remove([filename]);

    console.log("Delete result:", deleteError);

    return NextResponse.json({
      success: true,
      bucketExists: true,
      upload: {
        success: true,
        data: uploadData,
        publicUrl: urlData.publicUrl
      },
      filesList: {
        success: !listError,
        files: files,
        error: listError?.message
      },
      cleanup: {
        success: !deleteError,
        error: deleteError?.message
      }
    });

  } catch (error) {
    console.error("Direct bucket test error:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Test failed", 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 