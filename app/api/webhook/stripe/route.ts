import configFile from "@/config";
import { findCheckoutSession } from "@/libs/stripe";
import { SupabaseClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-08-16",
  typescript: true,
});
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// This is where we receive Stripe webhook events
// It used to update the user data, send emails, etc...
// By default, it'll store the user in the database
// See more: https://shipfa.st/docs/features/payments
export async function POST(req: NextRequest) {
  console.log("🔄 Webhook endpoint hit");
  console.log("🔧 Environment check:", {
    hasStripeSecret: !!process.env.STRIPE_SECRET_KEY,
    hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    nodeEnv: process.env.NODE_ENV
  });
  
  const body = await req.text();

  const signature = headers().get("stripe-signature");
  console.log("📝 Webhook signature present:", !!signature);

  let eventType;
  let event;

  // Create a private supabase client using the secret service_role API key
  const supabase = new SupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // verify Stripe event is legit
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    console.log("✅ Webhook signature verified successfully");
  } catch (err) {
    console.error(`❌ Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  eventType = event.type;
  console.log(`🔔 Received Stripe webhook: ${eventType}`);
  console.log(`📋 Event ID: ${event.id}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
  console.log(`⏰ Event created: ${new Date(event.created * 1000).toISOString()}`);

  try {
    switch (eventType) {
      case "customer.subscription.created": {
        console.log("🎯 Processing customer.subscription.created event");
        
        // Trial subscription started - grant access immediately
        const stripeObject: Stripe.Subscription = event.data
          .object as Stripe.Subscription;

        const customerId = stripeObject.customer;
        const priceId = stripeObject.items.data[0]?.price?.id;
        const plan = configFile.stripe.plans.find((p) => p.priceId === priceId);

        console.log(`📊 Subscription details:`, {
          customerId,
          priceId,
          planFound: !!plan,
          planName: plan?.name,
          subscriptionId: stripeObject.id,
          status: stripeObject.status,
          trialEnd: stripeObject.trial_end
        });

        if (!plan) {
          console.log("⚠️ No matching plan found for priceId:", priceId);
          break;
        }

        // Try to find user by customer ID first
        console.log("🔍 Attempting to find user by customer_id:", customerId);
        let profile = await supabase
          .from("profiles")
          .select("*")
          .eq("customer_id", customerId)
          .single();

        console.log("📋 User lookup by customer_id result:", {
          found: !!profile.data,
          error: profile.error?.message,
          userId: profile.data?.id
        });

        // If not found by customer ID, try to find by the Stripe customer email
        if (!profile.data) {
          console.log("🔍 Customer_id lookup failed, trying email lookup...");
          
          try {
            const customer = (await stripe.customers.retrieve(
              customerId as string
            )) as Stripe.Customer;

            console.log("📧 Stripe customer details:", {
              email: customer.email,
              name: customer.name,
              created: customer.created
            });

            if (customer.email) {
              console.log("🔍 Attempting to find user by email:", customer.email);
              const { data: profileByEmail, error: emailError } = await supabase
                .from("profiles")
                .select("*")
                .eq("email", customer.email)
                .single();
              
              console.log("📋 User lookup by email result:", {
                found: !!profileByEmail,
                error: emailError?.message,
                userId: profileByEmail?.id
              });
              
              profile.data = profileByEmail;
              profile.error = emailError;
            } else {
              console.log("❌ No email found in Stripe customer object");
            }
          } catch (stripeError) {
            console.error("❌ Error retrieving Stripe customer:", stripeError.message);
          }
        }

        if (profile.data) {
          console.log("✅ User found, granting trial access...");
          console.log("👤 User details:", {
            id: profile.data.id,
            email: profile.data.email,
            currentAccess: profile.data.has_access,
            currentCustomerId: profile.data.customer_id
          });
          
          try {
            // Grant access for trial users
            const { data: updateResult, error: updateError } = await supabase
              .from("profiles")
              .update({
                customer_id: customerId,
                price_id: priceId,
                has_access: true,
              })
              .eq("id", profile.data.id)
              .select();

            if (updateError) {
              console.error("❌ Database update failed:", updateError);
            } else {
              console.log("✅ Trial access granted successfully!");
              console.log("📊 Updated profile:", updateResult);
            }
          } catch (dbError) {
            console.error("❌ Database update exception:", dbError);
          }
        } else {
          console.log("❌ No user profile found for customer:", customerId);
          console.log("🔍 Consider checking if user exists in auth.users table");
        }

        break;
      }

      case "checkout.session.completed": {
        console.log("🎯 Processing checkout.session.completed event");
        
        // First payment is successful and a subscription is created (if mode was set to "subscription" in ButtonCheckout)
        // ✅ Grant access to the product
        const stripeObject: Stripe.Checkout.Session = event.data
          .object as Stripe.Checkout.Session;

        console.log("🛒 Checkout session details:", {
          sessionId: stripeObject.id,
          paymentStatus: stripeObject.payment_status,
          clientReferenceId: stripeObject.client_reference_id,
          customerEmail: stripeObject.customer_details?.email,
          mode: stripeObject.mode
        });

        const session = await findCheckoutSession(stripeObject.id);

        const customerId = session?.customer;
        const priceId = session?.line_items?.data[0]?.price.id;
        const userId = stripeObject.client_reference_id;
        const plan = configFile.stripe.plans.find((p) => p.priceId === priceId);

        console.log("📊 Session data extracted:", {
          customerId,
          priceId,
          userId,
          planFound: !!plan,
          planName: plan?.name
        });

        const customer = (await stripe.customers.retrieve(
          customerId as string
        )) as Stripe.Customer;

        console.log("📧 Stripe customer info:", {
          email: customer.email,
          name: customer.name,
          id: customer.id
        });

        if (!plan) {
          console.log("⚠️ No matching plan found for priceId:", priceId);
          break;
        }

        let user;
        if (!userId) {
          console.log("🔍 No client_reference_id found, looking up by email...");
          
          // check if user already exists
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("email", customer.email)
            .single();
            
          console.log("📋 Profile lookup by email result:", {
            found: !!profile,
            error: profileError?.message,
            userId: profile?.id
          });
          
          if (profile) {
            user = profile;
          } else {
            console.log("👤 Creating new user via Supabase Auth Admin...");
            
            // create a new user using supabase auth admin
            const { data, error: createError } = await supabase.auth.admin.createUser({
              email: customer.email,
            });

            console.log("📋 User creation result:", {
              success: !!data?.user,
              error: createError?.message,
              userId: data?.user?.id
            });

            user = data?.user;
          }
        } else {
          console.log("🔍 Using client_reference_id to find user:", userId);
          
          // find user by ID
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .single();

          console.log("📋 Profile lookup by ID result:", {
            found: !!profile,
            error: profileError?.message,
            userId: profile?.id
          });

          user = profile;
        }

        if (!user?.id) {
          console.error("❌ No user found or created, cannot proceed with access grant");
          break;
        }

        console.log("✅ User identified, granting access...");
        console.log("👤 User details:", {
          id: user.id,
          email: user.email || customer.email
        });

        try {
          const { data: updateResult, error: updateError } = await supabase
            .from("profiles")
            .update({
              customer_id: customerId,
              price_id: priceId,
              has_access: true,
            })
            .eq("id", user?.id)
            .select();

          if (updateError) {
            console.error("❌ Database update failed:", updateError);
          } else {
            console.log("✅ Access granted successfully!");
            console.log("📊 Updated profile:", updateResult);
          }
        } catch (dbError) {
          console.error("❌ Database update exception:", dbError);
        }

        // Extra: send email with user link, product page, etc...
        // try {
        //   await sendEmail(...);
        // } catch (e) {
        //   console.error("Email issue:" + e?.message);
        // }

        break;
      }

      case "checkout.session.expired": {
        // User didn't complete the transaction
        // You don't need to do anything here, by you can send an email to the user to remind him to complete the transaction, for instance
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        
        if (subscription.cancel_at_period_end && subscription.status === 'trialing') {
          // User canceled during trial - could show "trial ending" status
          // But keep has_access: true until trial actually ends
        }
        break;
      }

      case "customer.subscription.deleted": {
        // The customer subscription stopped
        // ❌ Revoke access to the product
        const stripeObject: Stripe.Subscription = event.data
          .object as Stripe.Subscription;
        const subscription = await stripe.subscriptions.retrieve(
          stripeObject.id
        );

        await supabase
          .from("profiles")
          .update({ has_access: false })
          .eq("customer_id", subscription.customer);
        break;
      }

      case "invoice.paid": {
        // Customer just paid an invoice (for instance, a recurring payment for a subscription)
        // ✅ Grant access to the product
        const stripeObject: Stripe.Invoice = event.data
          .object as Stripe.Invoice;
        const priceId = stripeObject.lines.data[0].price.id;
        const customerId = stripeObject.customer;

        // Find profile where customer_id equals the customerId (in table called 'profiles')
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("customer_id", customerId)
          .single();

        // Make sure the invoice is for the same plan (priceId) the user subscribed to
        if (profile.price_id !== priceId) break;

        // Grant the profile access to your product. It's a boolean in the database, but could be a number of credits, etc...
        await supabase
          .from("profiles")
          .update({ has_access: true })
          .eq("customer_id", customerId);

        break;
      }

      case "customer.subscription.trial_will_end": {
        // Trial is about to end (3 days before by default)
        // You can send an email reminder to the user here
        // This is optional but helps with conversion
        const stripeObject: Stripe.Subscription = event.data
          .object as Stripe.Subscription;

        console.log("Trial ending soon for customer:", stripeObject.customer);
        // TODO: Implement trial ending email notification
        break;
      }

      case "invoice.payment_failed":
        // A payment failed (for instance the customer does not have a valid payment method)
        // ❌ Revoke access to the product
        // ⏳ OR wait for the customer to pay (more friendly):
        //      - Stripe will automatically email the customer (Smart Retries)
        //      - We will receive a "customer.subscription.deleted" when all retries were made and the subscription has expired

        break;

      default:
        console.log(`ℹ️ Unhandled webhook event type: ${eventType}`);
        console.log("📋 Event data summary:", {
          id: event.id,
          type: eventType,
          created: event.created,
          livemode: event.livemode
        });
        // Unhandled event type
    }
  } catch (e) {
    console.error("❌ Stripe webhook processing error:", e.message);
    console.error("📋 Error details:", {
      eventType,
      eventId: event?.id,
      error: e,
      stack: e.stack
    });
  }

  console.log(`✅ Webhook processing completed for event: ${eventType}`);
  return NextResponse.json({});
}
