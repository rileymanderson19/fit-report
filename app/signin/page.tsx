"use client";

import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { createClient } from "@/libs/supabase/client";
import { Provider } from "@supabase/supabase-js";
import toast from "react-hot-toast";
import config from "@/config";
import { useRouter, useSearchParams } from "next/navigation";
import apiClient from "@/libs/api";

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
      provider?: Provider;
    }
  ) => {
    e?.preventDefault();
    setIsLoading(true);

    try {
      const { type, provider } = options;
      const redirectURL = window.location.origin + "/api/auth/callback";

      if (type === "oauth") {
        console.log("Starting OAuth sign in...");
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: redirectURL,
          },
        });

        console.log("OAuth sign in response:", { data, error });

        if (error) {
          console.error("OAuth error:", error);
          toast.error(error.message);
        } else if (data?.url) {
          // We can't create the profile here because the user isn't created yet
          // We'll need to handle this in the callback route
          window.location.href = data.url;
        }
      } else if (type === "magic_link" && mode === "signin") {
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
        
        console.log("Starting signup process...");
        
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectURL,
            data: {
              full_name: email.split('@')[0], // Set a default name from email
            }
          },
        });

        console.log("Signup response:", { data, error }); // Debug log

        if (error) {
          console.error("Signup error:", error);
          toast.error(error.message);
        } else if (data?.user) {
          // Explicitly create profile
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([
              {
                id: data.user.id,
                full_name: data.user.user_metadata.full_name || email.split('@')[0],
                email: email,
                updated_at: new Date().toISOString()
              }
            ])
            .select()
            .single();

          console.log("Profile creation result:", { profileError });

          if (profileError) {
            console.error("Profile creation error:", profileError);
            // Don't show this error to the user since they're already signed up
            // Just log it for debugging
          }

          if (data.user.identities?.length === 0) {
            toast.error("This email is already registered. Please sign in instead.");
            setMode("signin");
          } else {
            // Check if email confirmation is required
            if (data.user.confirmed_at || data.user.email_confirmed_at) {
              toast.success("Account created successfully!");
              if (priceId) {
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
        
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          console.error("Signin error:", error);
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
        <button
          className="btn btn-block"
          onClick={(e) =>
            handleAuth(e, { type: "oauth", provider: "google" })
          }
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="loading loading-spinner loading-xs"></span>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6"
              viewBox="0 0 48 48"
            >
              <path
                fill="#FFC107"
                d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
              />
              <path
                fill="#FF3D00"
                d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
              />
              <path
                fill="#4CAF50"
                d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
              />
              <path
                fill="#1976D2"
                d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
              />
            </svg>
          )}
          {mode === "signin" ? "Sign in with Google" : "Sign up with Google"}
        </button>

        <div className="divider text-xs text-base-content/50 font-medium">
          OR
        </div>

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
            {password 
              ? (mode === "signin" ? "Sign in" : "Sign up") 
              : "Send Magic Link"}
          </button>
          
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
