import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@/libs/supabase/server";

// Force dynamic to prevent static optimization
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();

    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "You must be logged in to upload images" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { imageData, filename } = body;

    if (!imageData) {
      return NextResponse.json(
        { error: "Image data is required" },
        { status: 400 }
      );
    }

    // Extract base64 data and convert to buffer
    const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2);
    const fileExtension = imageData.match(/^data:image\/([a-z]+);base64,/)?.[1] || 'png';
    const uniqueFilename = filename || `report-${timestamp}-${randomId}.${fileExtension}`;
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('temp-images')
      .upload(uniqueFilename, buffer, {
        contentType: `image/${fileExtension}`,
        cacheControl: '3600', // 1 hour cache
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: "Failed to upload image", details: uploadError.message },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('temp-images')
      .getPublicUrl(uniqueFilename);

    console.log('Image uploaded successfully:', {
      filename: uniqueFilename,
      url: urlData.publicUrl,
      size: buffer.length
    });

    // Store upload record for cleanup
    const { error: recordError } = await supabase
      .from('temp_uploads')
      .insert({
        user_id: user.id,
        filename: uniqueFilename,
        public_url: urlData.publicUrl,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
      });

    if (recordError) {
      console.error('Failed to record upload:', recordError);
      // Continue anyway - the image is uploaded
    }

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      filename: uniqueFilename,
      size: buffer.length,
      contentType: `image/${fileExtension}`,
      message: "Image uploaded successfully. Will be automatically deleted in 24 hours."
    });

  } catch (error) {
    console.error("Error in temp-image upload:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint to list user's temp uploads
export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();

    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "You must be logged in to view uploads" },
        { status: 401 }
      );
    }

    // Get user's temp uploads that haven't expired
    const { data, error } = await supabase
      .from('temp_uploads')
      .select('*')
      .eq('user_id', user.id)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching uploads:', error);
      return NextResponse.json(
        { error: "Failed to fetch uploads" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      uploads: data
    });

  } catch (error) {
    console.error("Error in temp-image GET:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to manually clean up an upload
export async function DELETE(req: NextRequest) {
  try {
    const supabase = createClient();

    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "You must be logged in to delete uploads" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      return NextResponse.json(
        { error: "Filename is required" },
        { status: 400 }
      );
    }

    // Verify ownership
    const { data: upload, error: fetchError } = await supabase
      .from('temp_uploads')
      .select('*')
      .eq('user_id', user.id)
      .eq('filename', filename)
      .single();

    if (fetchError || !upload) {
      return NextResponse.json(
        { error: "Upload not found or access denied" },
        { status: 404 }
      );
    }

    // Delete from storage
    const { error: deleteError } = await supabase.storage
      .from('temp-images')
      .remove([filename]);

    if (deleteError) {
      console.error('Error deleting from storage:', deleteError);
    }

    // Delete record
    const { error: recordDeleteError } = await supabase
      .from('temp_uploads')
      .delete()
      .eq('user_id', user.id)
      .eq('filename', filename);

    if (recordDeleteError) {
      console.error('Error deleting record:', recordDeleteError);
    }

    return NextResponse.json({
      success: true,
      message: "Upload deleted successfully"
    });

  } catch (error) {
    console.error("Error in temp-image DELETE:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 