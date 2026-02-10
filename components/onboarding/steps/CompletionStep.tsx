"use client";

import { CheckCircle, ArrowRight, FileText, Settings } from "lucide-react";

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
    <div className="card p-8 md:p-12 text-center">
      <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
        <CheckCircle className="w-8 h-8 text-green-600" />
      </div>

      <h2 className="text-3xl font-display font-bold text-gray-900 mb-4">
        You&apos;re All Set!
      </h2>

      <p className="text-xl text-gray-500 mb-8 max-w-xl mx-auto">
        Your FitReport account is ready to go. Start generating beautiful
        progress reports for your clients today.
      </p>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-8 max-w-lg mx-auto text-left">
        <h3 className="font-semibold text-gray-900 mb-4">What you can do now:</h3>
        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-medium text-gray-900">Generate Reports</span>
              <p className="text-sm text-gray-500">
                Create detailed progress reports for any of your imported clients.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <Settings className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-medium text-gray-900">Customize Templates</span>
              <p className="text-sm text-gray-500">
                Adjust report settings from the dashboard to match your coaching
                style.
              </p>
            </div>
          </li>
        </ul>
      </div>

      <button
        onClick={() => onComplete()}
        className="btn-primary px-8 py-3 rounded-lg font-medium text-lg inline-flex items-center gap-2"
      >
        Go to Dashboard
        <ArrowRight className="w-5 h-5" />
      </button>

      <p className="text-sm text-gray-400 mt-6">
        Need help? Check out our documentation or contact support.
      </p>
    </div>
  );
}
