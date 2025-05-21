import Stripe from "stripe";

interface CreateCheckoutParams {
  priceId: string;
  mode: "payment" | "subscription";
  successUrl: string;
  cancelUrl: string;
  couponId?: string | null;
  clientReferenceId?: string;
  user?: {
    customerId?: string;
    email?: string;
  };
}

interface CreateCustomerPortalParams {
  customerId: string;
  returnUrl: string;
}

// This is used to create a Stripe Checkout for one-time payments. It's usually triggered with the <ButtonCheckout /> component. Webhooks are used to update the user's state in the database.
export const createCheckout = async ({
  user,
  mode,
  clientReferenceId,
  successUrl,
  cancelUrl,
  priceId,
  couponId,
}: CreateCheckoutParams): Promise<string> => {
  try {
    console.log("Starting Stripe checkout creation with params:", {
      mode,
      priceId,
      successUrl,
      cancelUrl,
      clientReferenceId,
      userEmail: user?.email,
      customerId: user?.customerId
    });

    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("STRIPE_SECRET_KEY is not set");
      throw new Error("Stripe secret key is not configured");
    }
    
    console.log("Creating Stripe instance with key type:", process.env.STRIPE_SECRET_KEY.startsWith('sk_test_') ? 'test' : 'live');
    
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2023-08-16",
      typescript: true,
    });

    // Verify the price exists
    try {
      const price = await stripe.prices.retrieve(priceId);
      console.log("Price verified:", {
        id: price.id,
        active: price.active,
        type: price.type,
        currency: price.currency,
      });
    } catch (priceError) {
      console.error("Error verifying price:", priceError);
      throw priceError;
    }

    const extraParams: {
      customer?: string;
      customer_creation?: "always";
      customer_email?: string;
      invoice_creation?: { enabled: boolean };
      payment_intent_data?: { setup_future_usage: "on_session" };
      tax_id_collection?: { enabled: boolean };
    } = {};

    if (user?.customerId) {
      console.log("Using existing customer ID:", user.customerId);
      extraParams.customer = user.customerId;
    } else {
      console.log("Setting up new customer parameters");
      if (mode === "payment") {
        extraParams.customer_creation = "always";
        // The option below costs 0.4% (up to $2) per invoice. Alternatively, you can use https://zenvoice.io/ to create unlimited invoices automatically.
        // extraParams.invoice_creation = { enabled: true };
        extraParams.payment_intent_data = { setup_future_usage: "on_session" };
      }
      if (user?.email) {
        extraParams.customer_email = user.email;
      }
      extraParams.tax_id_collection = { enabled: true };
    }

    console.log("Creating checkout session with params:", {
      mode,
      priceId,
      successUrl,
      cancelUrl,
      clientReferenceId,
      extraParams,
    });

    const sessionParams = {
      mode,
      allow_promotion_codes: true,
      client_reference_id: clientReferenceId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      discounts: couponId
        ? [
            {
              coupon: couponId,
            },
          ]
        : [],
      success_url: successUrl,
      cancel_url: cancelUrl,
      ...extraParams,
    };

    console.log("Final session parameters:", sessionParams);

    const stripeSession = await stripe.checkout.sessions.create(sessionParams);

    console.log("Stripe session created successfully:", {
      sessionId: stripeSession.id,
      url: stripeSession.url,
      status: stripeSession.status,
      paymentStatus: stripeSession.payment_status,
    });

    if (!stripeSession.url) {
      console.error("No URL in created session:", stripeSession);
      throw new Error("Stripe session created but no URL was returned");
    }

    return stripeSession.url;
  } catch (e) {
    console.error("Stripe checkout creation error:", e);
    if (e.type === 'StripeInvalidRequestError') {
      console.error("Stripe invalid request details:", {
        code: e.code,
        param: e.param,
        message: e.message,
        type: e.type,
        raw: e
      });
    }
    throw e; // Re-throw the error to be handled by the caller
  }
};

// This is used to create Customer Portal sessions, so users can manage their subscriptions (payment methods, cancel, etc..)
export const createCustomerPortal = async ({
  customerId,
  returnUrl,
}: CreateCustomerPortalParams): Promise<string> => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2023-08-16", // TODO: update this when Stripe updates their API
    typescript: true,
  });

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return portalSession.url;
};

// This is used to get the uesr checkout session and populate the data so we get the planId the user subscribed to
export const findCheckoutSession = async (sessionId: string) => {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2023-08-16", // TODO: update this when Stripe updates their API
      typescript: true,
    });

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items"],
    });

    return session;
  } catch (e) {
    console.error(e);
    return null;
  }
};
