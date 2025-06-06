import { NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createClient();

    // Get user first
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log("Auth status:", { user: !!user, authError });

    // Test storage connection directly
    console.log("Testing storage.listBuckets()...");
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    console.log("Buckets result:", { buckets, bucketsError });

    // Also try to check if bucket exists via SQL
    console.log("Checking buckets via SQL...");
    const { data: sqlBuckets, error: sqlError } = await supabase
      .from('storage.buckets')
      .select('*');

    console.log("SQL buckets result:", { sqlBuckets, sqlError });

    // Check if we can access storage.objects
    console.log("Checking storage.objects access...");
    const { data: objects, error: objectsError } = await supabase.storage
      .from('temp-images')
      .list('', { limit: 1 });

    console.log("Objects result:", { objects, objectsError });

    return NextResponse.json({
      auth: {
        hasUser: !!user,
        userId: user?.id,
        authError: authError?.message
      },
      storage: {
        listBuckets: {
          success: !bucketsError,
          buckets: buckets,
          error: bucketsError?.message
        },
        sqlQuery: {
          success: !sqlError,
          buckets: sqlBuckets,
          error: sqlError?.message
        },
        tempImagesAccess: {
          success: !objectsError,
          objects: objects,
          error: objectsError?.message
        }
      },
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    });

  } catch (error) {
    console.error("Storage debug error:", error);
    return NextResponse.json(
      { 
        error: "Debug failed", 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 