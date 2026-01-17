import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { rateLimitMiddleware, getClientIdentifier, RateLimitPresets } from "@/libs/rateLimit";
import { ImageUploadSchema, validateRequest } from "@/libs/validations";

// Force dynamic to prevent static optimization
export const dynamic = 'force-dynamic';

// Maximum file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Allowed image formats
const ALLOWED_FORMATS = ['png', 'jpg', 'jpeg', 'webp'];

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

    // Apply rate limiting (30 uploads per minute per user)
    const rateLimitResponse = await rateLimitMiddleware(
      getClientIdentifier(req, user.id),
      {
        ...RateLimitPresets.moderate,
        message: 'Too many upload requests. Please try again later.'
      }
    );

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const body = await req.json();

    // Validate input
    const validation = validateRequest(ImageUploadSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error },
        { status: 400 }
      );
    }

    const { image: imageData, filename } = validation.data;

    // Extract base64 data and file extension
    const base64Match = imageData.match(/^data:image\/([a-z]+);base64,(.+)$/);
    if (!base64Match) {
      return NextResponse.json(
        { error: "Invalid image data format" },
        { status: 400 }
      );
    }

    const fileExtension = base64Match[1];
    const base64Data = base64Match[2];

    // Validate file extension
    if (!ALLOWED_FORMATS.includes(fileExtension)) {
      return NextResponse.json(
        { error: `Invalid file format. Allowed formats: ${ALLOWED_FORMATS.join(', ')}` },
        { status: 400 }
      );
    }

    // Convert to buffer
    const buffer = Buffer.from(base64Data, 'base64');

    // Validate file size
    if (buffer.length > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 413 }
      );
    }

    // Validate it's actually an image by checking magic bytes
    const isValidImage = validateImageBuffer(buffer, fileExtension);
    if (!isValidImage) {
      return NextResponse.json(
        { error: "Invalid image file. File content does not match the declared format." },
        { status: 400 }
      );
    }

    // Generate unique filename with sanitization
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2);
    const sanitizedFilename = filename
      ? filename.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 200)
      : `report-${timestamp}-${randomId}`;
    const uniqueFilename = `${sanitizedFilename}.${fileExtension}`;
    
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

/**
 * Validates image buffer by checking magic bytes (file signature)
 * @param buffer - Image buffer to validate
 * @param declaredFormat - The format declared in the MIME type
 * @returns true if buffer matches declared format
 */
function validateImageBuffer(buffer: Buffer, declaredFormat: string): boolean {
  if (buffer.length < 12) {
    return false;
  }

  // Check magic bytes based on format
  switch (declaredFormat) {
    case 'png':
      // PNG signature: 89 50 4E 47 0D 0A 1A 0A
      return (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47
      );

    case 'jpg':
    case 'jpeg':
      // JPEG signature: FF D8 FF
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;

    case 'webp':
      // WebP signature: RIFF....WEBP
      return (
        buffer[0] === 0x52 && // R
        buffer[1] === 0x49 && // I
        buffer[2] === 0x46 && // F
        buffer[3] === 0x46 && // F
        buffer[8] === 0x57 && // W
        buffer[9] === 0x45 && // E
        buffer[10] === 0x42 && // B
        buffer[11] === 0x50 // P
      );

    default:
      return false;
  }
} 