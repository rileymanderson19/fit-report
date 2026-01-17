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
    <main className="min-h-screen w-full bg-gradient-to-b from-bg-primary via-bg-secondary to-black text-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-purple/20 rounded-full blur-[120px] animate-pulse-glow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-violet/20 rounded-full blur-[120px] animate-pulse-glow delay-1000" />
      </div>

      <div className="relative z-10 p-8 md:p-24">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 glass border border-white/10 hover:border-accent-purple/50 px-4 py-2 rounded-lg text-white transition-all duration-200 hover:scale-105">
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

        <div className="glass border border-white/10 justify-center mx-auto max-w-[200px] mb-8 p-1 rounded-lg flex">
          <button
            className={`flex-1 px-4 py-2 text-sm font-medium rounded transition-all duration-200 ${mode === "signin" ? "bg-gradient-to-r from-primary-start to-accent-purple text-white" : "text-gray-400 hover:text-white"}`}
            onClick={() => setMode("signin")}
          >
            Sign in
          </button>
          <button
            className={`flex-1 px-4 py-2 text-sm font-medium rounded transition-all duration-200 ${mode === "signup" ? "bg-gradient-to-r from-primary-start to-accent-purple text-white" : "text-gray-400 hover:text-white"}`}
            onClick={() => setMode("signup")}
          >
            Sign up
          </button>
        </div>

        <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold tracking-tight text-center mb-12">
          {mode === "signin" ? "Sign in to" : "Sign up for"} <span className="gradient-text">{config.appName}</span>
        </h1>

        <div className="max-w-xl mx-auto">
          <div className="card-elevated p-8 md:p-10 rounded-2xl">
            <form
              className="space-y-6"
              onSubmit={(e) => handleAuth(e, { type: mode === "signin" && !password ? "magic_link" : "email" })}
            >
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <input
                  required
                  type="email"
                  value={email}
                  autoComplete="email"
                  placeholder="tom@cruise.com"
                  className="w-full px-4 py-3 rounded-lg bg-bg-secondary border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-accent-purple transition-colors"
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Password {mode === "signin" && <span className="text-xs text-gray-500">(optional for magic link)</span>}
                </label>
                <input
                  type="password"
                  value={password}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 rounded-lg bg-bg-secondary border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-accent-purple transition-colors"
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button
                className="w-full btn-gradient py-3 px-6 rounded-lg font-semibold text-white transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                disabled={isLoading || isDisabled}
                type="submit"
              >
                {isLoading && (
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {mode === "signin" ? "Sign in" : "Sign up"}
              </button>

              {mode === "signin" && !password && (
                <p className="text-center text-xs text-gray-400">
                  Leave password empty to receive a magic link via email
                </p>
              )}

              {mode === "signin" && (
                <p className="text-center text-sm text-gray-300">
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    className="text-accent-purple hover:text-primary-start transition-colors font-medium"
                    onClick={() => setMode("signup")}
                  >
                    Sign up
                  </button>
                </p>
              )}

              {mode === "signup" && (
                <p className="text-center text-sm text-gray-300">
                  Already have an account?{" "}
                  <button
                    type="button"
                    className="text-accent-purple hover:text-primary-start transition-colors font-medium"
                    onClick={() => setMode("signin")}
                  >
                    Sign in
                  </button>
                </p>
              )}
            </form>
          </div>
        </div>
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
