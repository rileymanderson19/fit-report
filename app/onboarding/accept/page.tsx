"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<
    "validating" | "success" | "error" | "no-token"
  >("validating");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("no-token");
      return;
    }

    const acceptInvite = async () => {
      try {
        const response = await fetch("/api/onboarding/accept-invite", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to accept invite");
        }

        setStatus("success");
        toast.success("Invite accepted! Check your email for the login link.");

        // If we have a redirect URL (user was already logged in), redirect
        if (data.redirectTo) {
          setTimeout(() => {
            router.push(data.redirectTo);
          }, 2000);
        }
      } catch (error) {
        console.error("Error accepting invite:", error);
        setStatus("error");
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to accept invite"
        );
      }
    };

    acceptInvite();
  }, [token, router]);

  if (status === "no-token") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <div className="card-elevated p-8 rounded-xl max-w-md text-center">
          <div className="text-error text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-display font-bold text-white mb-2">
            Invalid Invite Link
          </h1>
          <p className="text-gray-400 mb-6">
            This invite link is missing a token. Please check the link and try
            again, or contact support.
          </p>
          <Link href="/signin" className="btn btn-primary">
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (status === "validating") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <div className="card-elevated p-8 rounded-xl max-w-md text-center">
          <span className="loading loading-spinner loading-lg text-primary mb-4"></span>
          <h1 className="text-2xl font-display font-bold text-white mb-2">
            Validating Invite
          </h1>
          <p className="text-gray-400">Please wait while we verify your invite...</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <div className="card-elevated p-8 rounded-xl max-w-md text-center">
          <div className="text-error text-5xl mb-4">❌</div>
          <h1 className="text-2xl font-display font-bold text-white mb-2">
            Invite Error
          </h1>
          <p className="text-gray-400 mb-6">{errorMessage}</p>
          <div className="space-y-3">
            <Link href="/signin" className="btn btn-primary w-full">
              Go to Sign In
            </Link>
            <p className="text-sm text-gray-500">
              If you believe this is an error, please contact support.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200">
      <div className="card-elevated p-8 rounded-xl max-w-md text-center">
        <div className="text-success text-5xl mb-4">✅</div>
        <h1 className="text-2xl font-display font-bold text-white mb-2">
          Invite Accepted!
        </h1>
        <p className="text-gray-400 mb-6">
          Check your email for a magic link to complete your account setup.
          You&apos;ll be taken to the onboarding wizard after signing in.
        </p>
        <div className="bg-base-300 rounded-lg p-4">
          <p className="text-sm text-gray-400">
            Didn&apos;t receive the email? Check your spam folder or contact support.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-base-200">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      }
    >
      <AcceptInviteContent />
    </Suspense>
  );
}
