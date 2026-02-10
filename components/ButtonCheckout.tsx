"use client";

import { useState } from "react";
import apiClient from "@/libs/api";
import config from "@/config";
import { createClient } from "@/libs/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// This component is used to create Stripe Checkout Sessions
// It calls the /api/stripe/create-checkout route with the priceId, successUrl and cancelUrl
// Users must be authenticated. It will prefill the Checkout data with their email and/or credit card (if any)
// You can also change the mode to "subscription" if you want to create a subscription instead of a one-time payment
const ButtonCheckout = ({
  priceId,
  mode = "subscription",
  className = "btn-primary px-6 py-2.5 rounded-lg font-medium w-full",
}: {
  priceId: string;
  mode?: "payment" | "subscription";
  className?: string;
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const supabase = createClient();
  const router = useRouter();

  // Find the plan to get trial information
  const plan = config.stripe.plans.find(p => p.priceId === priceId);
  const hasTrialPeriod = plan?.trialDays && plan.trialDays > 0;

  const handlePayment = async () => {
    try {
      setIsLoading(true);
      console.log("Starting payment flow for priceId:", priceId);

      // Check if user is authenticated
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      console.log("Auth check result:", { session, authError });

      if (authError) {
        console.error("Auth check error:", authError);
        toast.error("Authentication error: " + authError.message);
        throw authError;
      }

      if (!session) {
        console.log("No session found, redirecting to signup");
        // If not authenticated, redirect to signup with priceId
        const signupUrl = `/signin?mode=signup&priceId=${encodeURIComponent(priceId)}&returnUrl=${encodeURIComponent(window.location.href)}`;
        router.push(signupUrl);
        return;
      }

      console.log("User is authenticated, creating checkout session");
      const response = await apiClient.post<{ url: string }>(
        "/stripe/create-checkout",
        {
          priceId,
          successUrl: `${window.location.href.split('?')[0]}?success=true`,
          cancelUrl: `${window.location.href.split('?')[0]}?canceled=true`,
          mode,
        }
      );

      console.log("Response received:", response);

      // Validate the URL
      if (!response || typeof response !== 'object' || !('url' in response) || typeof response.url !== 'string') {
        console.error("No checkout URL in response");
        throw new Error("No checkout URL received from server");
      }

      // Redirect to Stripe
      console.log("Redirecting to Stripe checkout:", response.url);
      window.location.href = response.url;
    } catch (e) {
      console.error("Payment flow error:", e);
      toast.error(e?.response?.data?.error || e?.message || "Failed to create checkout session");
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      className={`${className} group`}
      onClick={handlePayment}
      disabled={isLoading}
    >
      {isLoading ? (
        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
      ) : (
        <svg
          className="w-5 h-5 fill-primary-content group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-200"
          viewBox="0 0 375 509"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M249.685 14.125C249.685 11.5046 248.913 8.94218 247.465 6.75675C246.017 4.57133 243.957 2.85951 241.542 1.83453C239.126 0.809546 236.463 0.516683 233.882 0.992419C231.301 1.46815 228.917 2.69147 227.028 4.50999L179.466 50.1812C108.664 118.158 48.8369 196.677 2.11373 282.944C0.964078 284.975 0.367442 287.272 0.38324 289.605C0.399039 291.938 1.02672 294.226 2.20377 296.241C3.38082 298.257 5.06616 299.929 7.09195 301.092C9.11775 302.255 11.4133 302.867 13.75 302.869H129.042V494.875C129.039 497.466 129.791 500.001 131.205 502.173C132.62 504.345 134.637 506.059 137.01 507.106C139.383 508.153 142.01 508.489 144.571 508.072C147.131 507.655 149.516 506.503 151.432 504.757L172.698 485.394C247.19 417.643 310.406 338.487 359.975 250.894L373.136 227.658C374.292 225.626 374.894 223.327 374.882 220.99C374.87 218.653 374.243 216.361 373.065 214.341C371.887 212.322 370.199 210.646 368.17 209.482C366.141 208.318 363.841 207.706 361.5 207.707H249.685V14.125Z" />
        </svg>
      )}
      {hasTrialPeriod ? `Start ${plan.trialDays}-Day Free Trial` : `Get ${config?.appName}`}
    </button>
  );
};

export default ButtonCheckout;
