"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/libs/supabase/client";
import { WelcomeStep } from "@/components/onboarding/steps/WelcomeStep";
import { TrainerizeStep } from "@/components/onboarding/steps/TrainerizeStep";
import { ImportClientsStep } from "@/components/onboarding/steps/ImportClientsStep";
import { TemplateDefaultsStep } from "@/components/onboarding/steps/TemplateDefaultsStep";
import { SampleReportStep } from "@/components/onboarding/steps/SampleReportStep";
import { CompletionStep } from "@/components/onboarding/steps/CompletionStep";

type OnboardingStatus =
  | "pending"
  | "invited"
  | "credentials_setup"
  | "clients_imported"
  | "completed";

const STEPS = [
  { id: "welcome", label: "Welcome", component: WelcomeStep, minStatus: "invited" },
  { id: "trainerize", label: "Trainerize", component: TrainerizeStep, minStatus: "invited" },
  { id: "import", label: "Import Clients", component: ImportClientsStep, minStatus: "credentials_setup" },
  { id: "templates", label: "Templates", component: TemplateDefaultsStep, minStatus: "clients_imported" },
  { id: "sample", label: "Sample Report", component: SampleReportStep, minStatus: "clients_imported" },
  { id: "complete", label: "Complete", component: CompletionStep, minStatus: "clients_imported" },
] as const;

const STATUS_ORDER: OnboardingStatus[] = [
  "pending",
  "invited",
  "credentials_setup",
  "clients_imported",
  "completed",
];

function getStepIndexFromStatus(status: OnboardingStatus): number {
  switch (status) {
    case "pending":
    case "invited":
      return 0; // Welcome
    case "credentials_setup":
      return 2; // Import Clients
    case "clients_imported":
      return 3; // Template Defaults
    case "completed":
      return 5; // Completion
    default:
      return 0;
  }
}

function canAccessStep(
  stepIndex: number,
  currentStatus: OnboardingStatus
): boolean {
  const step = STEPS[stepIndex];
  const minStatusIndex = STATUS_ORDER.indexOf(step.minStatus as OnboardingStatus);
  const currentStatusIndex = STATUS_ORDER.indexOf(currentStatus);
  return currentStatusIndex >= minStatusIndex;
}

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [onboardingStatus, setOnboardingStatus] =
    useState<OnboardingStatus>("invited");
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const loadUserStatus = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/signin");
        return;
      }

      setUserId(user.id);

      // Check invite status via API (handles RLS and updates profile)
      const response = await fetch("/api/onboarding/check-invite");
      const data = await response.json();

      if (!response.ok) {
        console.error("Error checking invite:", data.error);
        router.push("/dashboard");
        return;
      }

      const status = data.status as OnboardingStatus;
      setOnboardingStatus(status);

      // If already completed, redirect to dashboard
      if (status === "completed") {
        router.push("/dashboard");
        return;
      }

      // If user has no invite and status is pending, redirect to dashboard
      // (they're not supposed to be in onboarding)
      if (status === "pending") {
        router.push("/dashboard");
        return;
      }

      // Set initial step based on status
      setCurrentStep(getStepIndexFromStatus(status));
      setIsLoading(false);
    };

    loadUserStatus();
  }, [router, supabase]);

  const updateOnboardingStatus = async (newStatus: OnboardingStatus) => {
    if (!userId) return;

    const updates: Record<string, unknown> = {
      onboarding_status: newStatus,
    };

    // Add completion timestamp
    if (newStatus === "completed") {
      updates.onboarding_completed_at = new Date().toISOString();
    }

    await supabase.from("profiles").update(updates).eq("id", userId);

    setOnboardingStatus(newStatus);
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      const nextStep = currentStep + 1;
      if (canAccessStep(nextStep, onboardingStatus)) {
        setCurrentStep(nextStep);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepComplete = async (newStatus?: OnboardingStatus) => {
    if (newStatus) {
      await updateOnboardingStatus(newStatus);
    }
    handleNext();
  };

  const handleSkip = () => {
    handleNext();
  };

  const handleComplete = async () => {
    await updateOnboardingStatus("completed");
    router.push("/dashboard");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-bg-primary via-bg-secondary to-black">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  const CurrentStepComponent = STEPS[currentStep].component;

  return (
    <div className="min-h-screen bg-gradient-to-b from-bg-primary via-bg-secondary to-black">
      {/* Progress Header */}
      <div className="fixed top-0 left-0 right-0 bg-base-100/90 backdrop-blur-sm border-b border-base-300 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-display font-bold text-white">
              Welcome to <span className="gradient-text">FitReport</span>
            </h1>
            <div className="text-sm text-gray-400">
              Step {currentStep + 1} of {STEPS.length}
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-2">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div
                  className={`flex-1 h-1 rounded-full transition-colors ${
                    index < currentStep
                      ? "bg-accent-purple"
                      : index === currentStep
                      ? "bg-accent-purple/50"
                      : "bg-base-300"
                  }`}
                />
                {index < STEPS.length - 1 && (
                  <div className="w-2" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="pt-32 pb-24 px-4">
        <div className="container mx-auto max-w-3xl">
          <CurrentStepComponent
            onNext={handleStepComplete}
            onBack={handleBack}
            onSkip={handleSkip}
            onComplete={handleComplete}
            isFirstStep={currentStep === 0}
            isLastStep={currentStep === STEPS.length - 1}
          />
        </div>
      </div>
    </div>
  );
}
