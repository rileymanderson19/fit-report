"use client";

import { Link2, Users, BarChart3, ArrowRight } from "lucide-react";

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
    <div className="card p-8 md:p-12 text-center">
      <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-6">
        <BarChart3 className="w-8 h-8 text-blue-600" />
      </div>

      <h2 className="text-3xl font-display font-bold text-gray-900 mb-4">
        Welcome to FitReport!
      </h2>

      <p className="text-xl text-gray-500 mb-8 max-w-xl mx-auto">
        You&apos;re about to set up your account and start generating beautiful
        progress reports for your clients.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 text-left">
        <div className="p-6 bg-gray-50 border border-gray-200 rounded-xl">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-3">
            <Link2 className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Connect Trainerize</h3>
          <p className="text-sm text-gray-500">
            Link your Trainerize account to access client data securely.
          </p>
        </div>

        <div className="p-6 bg-gray-50 border border-gray-200 rounded-xl">
          <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center mb-3">
            <Users className="w-5 h-5 text-teal-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Import Clients</h3>
          <p className="text-sm text-gray-500">
            Select which clients you want to track and generate reports for.
          </p>
        </div>

        <div className="p-6 bg-gray-50 border border-gray-200 rounded-xl">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center mb-3">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Generate Reports</h3>
          <p className="text-sm text-gray-500">
            Create comprehensive progress reports with just a few clicks.
          </p>
        </div>
      </div>

      <button
        onClick={() => onNext()}
        className="btn-primary px-8 py-3 rounded-lg font-medium text-lg inline-flex items-center gap-2"
      >
        Let&apos;s Get Started
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
}
