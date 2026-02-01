"use client";

interface WelcomeStepProps {
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  onComplete: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <div className="card-elevated rounded-2xl p-8 md:p-12 text-center">
      <div className="text-6xl mb-6">🎉</div>

      <h2 className="text-3xl font-display font-bold text-white mb-4">
        Welcome to FitReport!
      </h2>

      <p className="text-xl text-gray-300 mb-8 max-w-xl mx-auto">
        You&apos;re about to set up your account and start generating beautiful
        progress reports for your clients.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 text-left">
        <div className="p-6 bg-base-300/50 rounded-xl">
          <div className="text-3xl mb-3">🔗</div>
          <h3 className="font-semibold text-white mb-2">Connect Trainerize</h3>
          <p className="text-sm text-gray-400">
            Link your Trainerize account to access client data securely.
          </p>
        </div>

        <div className="p-6 bg-base-300/50 rounded-xl">
          <div className="text-3xl mb-3">👥</div>
          <h3 className="font-semibold text-white mb-2">Import Clients</h3>
          <p className="text-sm text-gray-400">
            Select which clients you want to track and generate reports for.
          </p>
        </div>

        <div className="p-6 bg-base-300/50 rounded-xl">
          <div className="text-3xl mb-3">📊</div>
          <h3 className="font-semibold text-white mb-2">Generate Reports</h3>
          <p className="text-sm text-gray-400">
            Create comprehensive progress reports with just a few clicks.
          </p>
        </div>
      </div>

      <button onClick={onNext} className="btn btn-primary btn-lg">
        Let&apos;s Get Started
        <svg
          className="w-5 h-5 ml-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>
    </div>
  );
}
