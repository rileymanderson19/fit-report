"use client";

import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { createClient } from "@/libs/supabase/client";
import toast from "react-hot-toast";
import config from "@/config";
import { useRouter, useSearchParams } from "next/navigation";
import apiClient from "@/libs/api";

// Helper function to get the correct redirect URL for authentication
const getAuthRedirectURL = () => {
  // In production, always use the configured site URL
  if (process.env.NODE_ENV === 'production') {
    const url = config.siteUrl + "/api/auth/callback";
    console.log("Using production redirect URL:", url);
    return url;
  }
  
  // In development, use window.location.origin if available, otherwise fallback to config
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    // In development, use the origin
    if (origin) {
      const url = origin + "/api/auth/callback";
      console.log("Using development redirect URL:", url);
      return url;
    }
  }
  
  // Final fallback to config
  const url = config.siteUrl + "/api/auth/callback";
  console.log("Using fallback redirect URL:", url);
  return url;
};

// This a login/singup page for Supabase Auth.
// Successfull login redirects to /api/auth/callback where the Code Exchange is processed (see app/api/auth/callback/route.js).
function LoginContent() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDisabled, setIsDisabled] = useState<boolean>(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  // Get URL parameters
  const priceId = searchParams.get("priceId");
  const returnUrl = searchParams.get("returnUrl");
  const initialMode = searchParams.get("mode");

  useEffect(() => {
    // Set initial mode if provided in URL
    if (initialMode === "signup") {
      setMode("signup");
    }
  }, [initialMode]);

  const handleStripeCheckout = async () => {
    try {
      console.log("Starting Stripe checkout with priceId:", priceId);
      const { url }: { url: string } = await apiClient.post(
        "/stripe/create-checkout",
        {
          priceId,
          successUrl: returnUrl ? returnUrl + "?success=true" : window.location.href + "?success=true",
          cancelUrl: returnUrl ? returnUrl + "?canceled=true" : window.location.href + "?canceled=true",
          mode: "subscription",
        }
      );

      if (url) {
        console.log("Redirecting to Stripe checkout:", url);
        window.location.href = url;
      } else {
        throw new Error("No URL returned from checkout endpoint");
      }
    } catch (error) {
      console.error("Stripe checkout error:", error);
      toast.error("Failed to create checkout session");
    }
  };

  const handleAuth = async (
    e: any,
    options: {
      type: string;
    }
  ) => {
    e?.preventDefault();
    setIsLoading(true);

    try {
      const { type } = options;
      const redirectURL = getAuthRedirectURL();

      if (type === "magic_link" && mode === "signin") {
        await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: redirectURL,
          },
        });

        toast.success("Check your emails!");
        setIsDisabled(true);
      } else if (type === "email" && mode === "signup") {
        if (!password) {
          toast.error("Password is required for signup");
          setIsLoading(false);
          return;
        }
        
        console.log("Starting email signup");
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectURL,
            data: {
              full_name: email.split('@')[0],
            }
          },
        });

        console.log("Signup response:", { data, error });

        if (error) {
          console.error("Signup error:", error);
          toast.error(error.message);
        } else if (data?.user) {
          if (data.user.identities?.length === 0) {
            toast.error("This email is already registered. Please sign in instead.");
            setMode("signin");
          } else {
            if (data.user.confirmed_at || data.user.email_confirmed_at) {
              toast.success("Account created successfully!");
              if (priceId) {
                console.log("Account created, proceeding to checkout");
                await handleStripeCheckout();
              } else {
                router.push(config.auth.callbackUrl);
              }
            } else {
              toast.success("Please check your email to confirm your account!");
              setIsDisabled(true);
            }
          }
        }
      } else if (type === "email" && mode === "signin") {
        if (!password) {
          toast.error("Password is required for sign in");
          setIsLoading(false);
          return;
        }
        
        console.log("Starting email signin");
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          console.error("Signin error:", error);
          toast.error(error.message);
        } else if (data?.user) {
          if (priceId) {
            console.log("Signed in, proceeding to checkout");
            await handleStripeCheckout();
          } else {
            router.push(config.auth.callbackUrl);
          }
        }
      }
    } catch (error) {
      console.error("Auth error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="p-8 md:p-24" data-theme={config.colors.theme}>
      <div className="text-center mb-4">
        <Link href="/" className="btn btn-ghost btn-sm">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path
              fillRule="evenodd"
              d="M15 10a.75.75 0 01-.75.75H7.612l2.158 1.96a.75.75 0 11-1.04 1.08l-3.5-3.25a.75.75 0 010-1.08l3.5-3.25a.75.75 0 111.04 1.08L7.612 9.25h6.638A.75.75 0 0115 10z"
              clipRule="evenodd"
            />
          </svg>
          Home
        </Link>
      </div>
      
      <div className="tabs tabs-boxed justify-center mx-auto max-w-[200px] mb-4 p-1 bg-base-200 rounded-lg">
        <a 
          className={`tab text-sm ${mode === "signin" ? "tab-active" : ""}`}
          onClick={() => setMode("signin")}
        >
          Sign in
        </a>
        <a 
          className={`tab text-sm ${mode === "signup" ? "tab-active" : ""}`}
          onClick={() => setMode("signup")}
        >
          Sign up
        </a>
      </div>
      
      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-center mb-12">
        {mode === "signin" ? "Sign in to" : "Sign up for"} {config.appName}
      </h1>

      <div className="space-y-8 max-w-xl mx-auto">
        <form
          className="form-control w-full space-y-4"
          onSubmit={(e) => handleAuth(e, { type: mode === "signin" && !password ? "magic_link" : "email" })}
        >
          <input
            required
            type="email"
            value={email}
            autoComplete="email"
            placeholder="tom@cruise.com"
            className="input input-bordered w-full placeholder:opacity-60"
            onChange={(e) => setEmail(e.target.value)}
          />
          
          <input
            type="password"
            value={password}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            placeholder="Password"
            className="input input-bordered w-full placeholder:opacity-60"
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            className="btn btn-primary btn-block"
            disabled={isLoading || isDisabled}
            type="submit"
          >
            {isLoading && (
              <span className="loading loading-spinner loading-xs"></span>
            )}
            {mode === "signin" ? "Sign in" : "Sign up"}
          </button>
          
          {mode === "signin" && (
            <p className="text-center text-xs text-base-content/60 mt-2">
              Leave password empty to receive a magic link via email
            </p>
          )}
          
          {mode === "signin" && (
            <p className="text-center text-sm text-base-content/70">
              Don&apos;t have an account?{" "}
              <a 
                className="link link-primary" 
                onClick={() => setMode("signup")}
              >
                Sign up
              </a>
            </p>
          )}
          
          {mode === "signup" && (
            <p className="text-center text-sm text-base-content/70">
              Already have an account?{" "}
              <a 
                className="link link-primary" 
                onClick={() => setMode("signin")}
              >
                Sign in
              </a>
            </p>
          )}
        </form>
      </div>
    </main>
  );
}

export default function Login() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
