"use client";

interface CompletionStepProps {
  onNext: (newStatus?: string) => void;
  onBack: () => void;
  onSkip: () => void;
  onComplete: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

export function CompletionStep({ onComplete }: CompletionStepProps) {
  return (
    <div className="card-elevated rounded-2xl p-8 md:p-12 text-center">
      <div className="text-6xl mb-6">🎉</div>

      <h2 className="text-3xl font-display font-bold text-white mb-4">
        You&apos;re All Set!
      </h2>

      <p className="text-xl text-gray-300 mb-8 max-w-xl mx-auto">
        Your FitReport account is ready to go. Start generating beautiful
        progress reports for your clients today.
      </p>

      <div className="bg-base-300/50 rounded-xl p-6 mb-8 max-w-lg mx-auto text-left">
        <h3 className="font-semibold text-white mb-4">What you can do now:</h3>
        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <span className="text-accent-purple text-xl">✓</span>
            <div>
              <span className="font-medium text-white">Generate Reports</span>
              <p className="text-sm text-gray-400">
                Create detailed progress reports for any of your imported clients.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-accent-purple text-xl">✓</span>
            <div>
              <span className="font-medium text-white">Schedule Weekly Reports</span>
              <p className="text-sm text-gray-400">
                Set up automated reports to send to clients on a regular basis.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-accent-purple text-xl">✓</span>
            <div>
              <span className="font-medium text-white">Customize Templates</span>
              <p className="text-sm text-gray-400">
                Adjust report settings from the dashboard to match your coaching
                style.
              </p>
            </div>
          </li>
        </ul>
      </div>

      <button
        onClick={() => onComplete()}
        className="btn btn-primary btn-lg"
      >
        Go to Dashboard
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

      <p className="text-sm text-gray-500 mt-6">
        Need help? Check out our documentation or contact support.
      </p>
    </div>
  );
}
