"use client";

import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { createClient } from "@/libs/supabase/client";
import { toast } from "sonner";
import config from "@/config";
import { useRouter, useSearchParams } from "next/navigation";
import apiClient from "@/libs/api";
import { ArrowLeft, Mail, Eye, EyeOff } from "lucide-react";

// Helper function to get the correct redirect URL for authentication
const getAuthRedirectURL = () => {
  if (process.env.NODE_ENV === 'production') {
    return config.siteUrl + "/api/auth/callback";
  }
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin + "/api/auth/callback";
  }
  return config.siteUrl + "/api/auth/callback";
};

function LoginContent() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDisabled, setIsDisabled] = useState<boolean>(false);
  const [magicLinkSent, setMagicLinkSent] = useState<boolean>(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  const priceId = searchParams.get("priceId");
  const returnUrl = searchParams.get("returnUrl");
  const initialMode = searchParams.get("mode");

  useEffect(() => {
    if (initialMode === "signup") {
      setMode("signup");
    }
  }, [initialMode]);

  const handleStripeCheckout = async () => {
    try {
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
    options: { type: string }
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

        setMagicLinkSent(true);
        setIsDisabled(true);
      } else if (type === "email" && mode === "signup") {
        if (!password) {
          toast.error("Password is required for signup");
          setIsLoading(false);
          return;
        }

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

        if (error) {
          toast.error(error.message);
        } else if (data?.user) {
          if (data.user.identities?.length === 0) {
            toast.error("This email is already registered. Please sign in instead.");
            setMode("signin");
          } else {
            if (data.user.confirmed_at || data.user.email_confirmed_at) {
              toast.success("Account created successfully!");
              if (priceId) {
                await handleStripeCheckout();
              } else {
                router.push(config.auth.callbackUrl);
              }
            } else {
              setMagicLinkSent(true);
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

        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          toast.error(error.message);
        } else if (data?.user) {
          if (priceId) {
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

  // Magic link / confirmation email sent state
  if (magicLinkSent) {
    return (
      <main className="min-h-screen w-full bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="card p-8 md:p-10">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mail className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-display font-bold text-gray-900 mb-3">
              Check your email
            </h2>
            <p className="text-gray-500 mb-6">
              We sent a {mode === "signin" ? "sign-in link" : "confirmation link"} to{" "}
              <span className="font-medium text-gray-700">{email}</span>
            </p>
            <p className="text-sm text-gray-400 mb-8">
              Click the link in the email to {mode === "signin" ? "sign in" : "confirm your account"}. Check your spam folder if you don&apos;t see it.
            </p>
            <button
              onClick={() => {
                setMagicLinkSent(false);
                setIsDisabled(false);
              }}
              className="btn-ghost text-sm"
            >
              Try a different email
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Back to home */}
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-gray-900 mb-2">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-gray-500">
            {mode === "signin"
              ? "Sign in to your FitReport account"
              : "Get started with FitReport today"}
          </p>
        </div>

        {/* Mode toggle */}
        <div className="bg-gray-100 mx-auto max-w-[220px] mb-8 p-1 rounded-lg flex">
          <button
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
              mode === "signin"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setMode("signin")}
          >
            Sign in
          </button>
          <button
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
              mode === "signup"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setMode("signup")}
          >
            Sign up
          </button>
        </div>

        {/* Form card */}
        <div className="card p-8 md:p-10">
          <form
            className="space-y-5"
            onSubmit={(e) =>
              handleAuth(e, {
                type: mode === "signin" && !password ? "magic_link" : "email",
              })
            }
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <input
                required
                type="email"
                value={email}
                autoComplete="email"
                placeholder="you@example.com"
                className="input-field"
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password{" "}
                {mode === "signin" && (
                  <span className="text-xs text-gray-400 font-normal">
                    (optional for magic link)
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  autoComplete={
                    mode === "signin" ? "current-password" : "new-password"
                  }
                  placeholder="Enter your password"
                  className="input-field pr-10"
                  onChange={(e) => setPassword(e.target.value)}
                />
                {password && (
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
            </div>

            <button
              className="w-full btn-primary py-3 px-6 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading || isDisabled}
              type="submit"
            >
              {isLoading && (
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline-block"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              )}
              {mode === "signin"
                ? password
                  ? "Sign in"
                  : "Send magic link"
                : "Create account"}
            </button>

            {mode === "signin" && !password && (
              <p className="text-center text-xs text-gray-400">
                Leave password empty to receive a sign-in link via email
              </p>
            )}

            {mode === "signin" && (
              <p className="text-center text-sm text-gray-500">
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  className="text-blue-600 hover:text-blue-700 transition-colors font-medium"
                  onClick={() => setMode("signup")}
                >
                  Sign up
                </button>
              </p>
            )}

            {mode === "signup" && (
              <p className="text-center text-sm text-gray-500">
                Already have an account?{" "}
                <button
                  type="button"
                  className="text-blue-600 hover:text-blue-700 transition-colors font-medium"
                  onClick={() => setMode("signin")}
                >
                  Sign in
                </button>
              </p>
            )}
          </form>
        </div>
      </div>
    </main>
  );
}

export default function Login() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
