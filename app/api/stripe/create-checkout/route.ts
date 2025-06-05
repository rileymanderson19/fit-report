import { createCheckout } from "@/libs/stripe";
import { createClient } from "@/libs/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import config from "@/config";

// This function is used to create a Stripe Checkout Session (one-time payment or subscription)
// It's called by the <ButtonCheckout /> component
// Users must be authenticated. It will prefill the Checkout data with their email and/or credit card (if any)
export async function POST(req: NextRequest) {
  console.log("Starting create-checkout request");
  
  try {
    const body = await req.json();
    console.log("Request body:", body);

    if (!body.priceId) {
      console.error("Missing priceId in request");
      return NextResponse.json(
        { error: "Price ID is required" },
        { status: 400 }
      );
    } else if (!body.successUrl || !body.cancelUrl) {
      console.error("Missing success or cancel URL");
      return NextResponse.json(
        { error: "Success and cancel URLs are required" },
        { status: 400 }
      );
    } else if (!body.mode) {
      console.error("Missing mode in request");
      return NextResponse.json(
        {
          error:
            "Mode is required (either 'payment' for one-time payments or 'subscription' for recurring subscription)",
        },
        { status: 400 }
      );
    }

    console.log("Creating Supabase client");
    const supabase = createClient();

    console.log("Getting user from Supabase");
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("Error getting user:", userError);
      return NextResponse.json({ error: "Failed to get user: " + userError.message }, { status: 500 });
    }

    if (!user) {
      console.error("No user found - authentication required");
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    console.log("User found:", { id: user.id, email: user.email });

    // Get DataFast tracking cookies for revenue attribution
    const cookieStore = cookies();
    const datafastVisitorId = cookieStore.get('datafast_visitor_id')?.value;
    const datafastSessionId = cookieStore.get('datafast_session_id')?.value;
    
    console.log("DataFast tracking cookies:", {
      visitorId: datafastVisitorId ? "present" : "missing",
      sessionId: datafastSessionId ? "present" : "missing"
    });

    const { priceId, mode, successUrl, cancelUrl } = body;
    console.log("Checkout request params:", { priceId, mode, successUrl, cancelUrl });

    // Find the plan configuration to get trial days
    const plan = config.stripe.plans.find(p => p.priceId === priceId);
    const trialDays = plan?.trialDays;
    console.log("Plan found:", { planName: plan?.name, trialDays });

    console.log("Getting user profile from Supabase");
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user?.id)
      .single();

    if (profileError) {
      console.error("Error getting profile:", profileError);
      return NextResponse.json({ error: "Failed to get user profile: " + profileError.message }, { status: 500 });
    }

    console.log("User profile retrieved:", {
      id: profile?.id,
      email: profile?.email,
      hasAccess: profile?.has_access,
      customerId: profile?.customer_id,
      priceId: profile?.price_id
    });

    try {
      console.log("Creating Stripe checkout session with params:", {
        priceId,
        mode,
        clientReferenceId: user?.id,
        trialDays,
        userEmail: profile?.email,
        existingCustomerId: profile?.customer_id,
        datafastTracking: {
          visitorId: !!datafastVisitorId,
          sessionId: !!datafastSessionId
        }
      });
      
      const stripeSessionURL = await createCheckout({
        priceId,
        mode,
        successUrl,
        cancelUrl,
        clientReferenceId: user?.id,
        trialDays,
        user: {
          email: profile?.email,
          customerId: profile?.customer_id,
        },
        // Pass DataFast tracking data for revenue attribution
        metadata: {
          datafast_visitor_id: datafastVisitorId || '',
          datafast_session_id: datafastSessionId || '',
        },
      });

      console.log("Stripe session creation result:", {
        success: !!stripeSessionURL,
        url: stripeSessionURL ? "URL_CREATED" : "NO_URL"
      });

      if (!stripeSessionURL) {
        console.error("Failed to create Stripe session URL - no URL returned");
        return NextResponse.json({ 
          error: "Failed to create checkout session - no URL returned from Stripe" 
        }, { status: 500 });
      }

      console.log("Successfully created checkout session with DataFast tracking");
      return NextResponse.json({ url: stripeSessionURL });
    } catch (stripeError) {
      console.error("Stripe checkout creation error:", stripeError);
      return NextResponse.json({ 
        error: "Stripe error: " + (stripeError.message || "Unknown Stripe error"),
        details: stripeError
      }, { status: 500 });
    }
  } catch (e) {
    console.error("Stripe checkout error:", e);
    // Log the full error object for debugging
    console.error("Full error details:", JSON.stringify(e, null, 2));
    return NextResponse.json({ 
      error: e?.message || "Unknown error occurred",
      details: e
    }, { status: 500 });
  }
}
