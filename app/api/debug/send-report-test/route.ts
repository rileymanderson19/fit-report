import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@/libs/supabase/server";

// Force dynamic to prevent static optimization
export const dynamic = 'force-dynamic';

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
        { error: "You must be logged in to test report sending" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { clientId, reportId } = body;

    let debugInfo: any = {
      timestamp: new Date().toISOString(),
      userId: user.id,
      clientId,
      reportId
    };

    // Test 1: Check if client exists and user has access
    try {
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id, first_name, last_name, email, trainerize_id, trainer_id')
        .eq('id', clientId)
        .eq('trainer_id', user.id)
        .single();

      debugInfo.clientTest = {
        success: !clientError && !!client,
        client: client,
        error: clientError?.message
      };
    } catch (error) {
      debugInfo.clientTest = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown client test error'
      };
    }

    // Test 2: Check if report exists
    try {
      const { data: report, error: reportError } = await supabase
        .from('reports')
        .select('*')
        .eq('id', reportId)
        .eq('client_id', clientId)
        .single();

      debugInfo.reportTest = {
        success: !reportError && !!report,
        report: report ? { id: report.id, created_at: report.created_at } : null,
        error: reportError?.message
      };
    } catch (error) {
      debugInfo.reportTest = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown report test error'
      };
    }

    // Test 3: Check Trainerize credentials
    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("trainerize_username, trainerize_password, trainerize_id")
        .eq("id", user.id)
        .single();

      debugInfo.trainerizeCredentialsTest = {
        success: !profileError && !!profile?.trainerize_username,
        hasUsername: !!profile?.trainerize_username,
        hasPassword: !!profile?.trainerize_password,
        hasTrainerId: !!profile?.trainerize_id,
        error: profileError?.message
      };
    } catch (error) {
      debugInfo.trainerizeCredentialsTest = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown credentials test error'
      };
    }

    // Test 4: Check if report_deliveries table exists
    try {
      const { error } = await supabase
        .from('report_deliveries')
        .select('id')
        .limit(1);

      debugInfo.reportDeliveriesTableTest = {
        success: !error,
        error: error?.message
      };
    } catch (error) {
      debugInfo.reportDeliveriesTableTest = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown table test error'
      };
    }

    // Test 5: Check storage bucket
    try {
      const { createClient: createServiceClient } = await import('@supabase/supabase-js');
      const serviceSupabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      const { data: buckets, error: bucketsError } = await serviceSupabase.storage.listBuckets();
      debugInfo.storageTest = {
        success: !bucketsError,
        hasTempImagesBucket: buckets?.some(b => b.name === 'temp-images') || false,
        buckets: buckets?.map(b => b.name) || [],
        error: bucketsError?.message
      };
    } catch (error) {
      debugInfo.storageTest = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown storage test error'
      };
    }

    // Generate recommendations
    const recommendations = [];
    
    if (!debugInfo.clientTest?.success) {
      recommendations.push("❌ Client not found or access denied - check clientId and permissions");
    }
    
    if (!debugInfo.reportTest?.success) {
      recommendations.push("❌ Report not found - check reportId and client association");
    }
    
    if (!debugInfo.trainerizeCredentialsTest?.success) {
      recommendations.push("❌ Trainerize credentials missing - configure in /dashboard/trainerize");
    }
    
    if (!debugInfo.reportDeliveriesTableTest?.success) {
      recommendations.push("❌ report_deliveries table missing - run the SQL migration in Supabase");
    }
    
    if (!debugInfo.storageTest?.success || !debugInfo.storageTest?.hasTempImagesBucket) {
      recommendations.push("❌ Storage bucket issue - check temp-images bucket exists");
    }
    
    if (recommendations.length === 0) {
      recommendations.push("✅ All prerequisites look good - the send report should work");
    }

    return NextResponse.json({
      success: true,
      debug: debugInfo,
      recommendations
    });

  } catch (error) {
    console.error("Error in send-report-test:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 