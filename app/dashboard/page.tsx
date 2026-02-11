export const dynamic = "force-dynamic";

import { createClient } from "@/libs/supabase/server";
import ButtonCheckout from "@/components/ButtonCheckout";
import config from "@/config";
import { isStripeGatingEnabled } from "@/libs/featureFlags";
import Link from "next/link";
import {
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Link2,
  Users,
  FileText,
  ChevronRight,
  Check,
} from "lucide-react";

// This is a private page: It's protected by the layout.js component which ensures the user is authenticated.
// It's a server compoment which means you can fetch data (like the user profile) before the page is rendered.
export default async function Dashboard() {
  const supabase = createClient();

  // Get the current user
  const { data: { user } } = await supabase.auth.getUser();

  // Get the user's profile with subscription info
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user?.id)
    .single();

  // When Stripe gating is disabled (concierge mode), all authenticated users have access
  const hasActivePlan = isStripeGatingEnabled()
    ? profile?.has_access === true
    : true;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Overview and getting started</p>
        </div>
      </div>

      <div className="card p-8 md:p-10">
        <h2 className="text-2xl font-display font-semibold mb-8 text-gray-900">Welcome to FitReport</h2>

        {!hasActivePlan ? (
          <div className="space-y-8">
            <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-xl flex items-start gap-4">
              <AlertTriangle className="w-6 h-6 text-yellow-600 shrink-0" />
              <div>
                <h3 className="font-bold text-yellow-700">No active subscription</h3>
                <div className="text-sm text-gray-600 mt-1">Choose a plan below to start generating reports.</div>
              </div>
            </div>

            <div className="relative flex justify-center flex-col lg:flex-row items-center lg:items-stretch gap-8">
              {config.stripe.plans.map((plan) => (
                <div key={plan.priceId} className="relative w-full max-w-lg">
                  {plan.isFeatured && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                      <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-blue-600 text-white text-xs font-bold shadow-lg">
                        <Sparkles className="w-3 h-3" />
                        SAVE 21%
                      </span>
                    </div>
                  )}

                  <div className={`relative flex flex-col h-full gap-5 lg:gap-8 z-10 p-8 rounded-2xl transition-all duration-300 ${
                    plan.isFeatured
                      ? 'card border-2 border-blue-500 bg-blue-50/30'
                      : 'card'
                  }`}>
                    <div className="flex justify-between items-center gap-4">
                      <div>
                        <p className="text-2xl lg:text-3xl font-display font-bold text-gray-900">{plan.name}</p>
                        {plan.description && (
                          <p className="text-gray-500 mt-2">
                            {plan.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <div className="flex gap-2 items-end">
                        <p className={`text-6xl tracking-tight font-mono font-extrabold ${
                          plan.isFeatured ? 'text-blue-600' : 'text-gray-900'
                        }`}>
                          ${plan.price}
                        </p>
                        <div className="flex flex-col justify-end mb-3">
                          <p className="text-sm text-gray-500 font-semibold">
                            /mo
                          </p>
                        </div>
                      </div>

                      {plan.billingPeriod === "yearly" && (
                        <p className="text-sm text-gray-500">
                          Billed annually (${plan.price * 12})
                        </p>
                      )}

                      {plan.priceAnchor && (
                        <p className="text-sm text-gray-400">
                          <span className="line-through">${plan.priceAnchor}/mo</span>
                        </p>
                      )}
                    </div>

                    {plan.features && (
                      <ul className="space-y-4 leading-relaxed text-base flex-1">
                        {plan.features.map((feature, i) => (
                          <li key={i} className="flex items-center gap-3">
                            <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                              plan.isFeatured
                                ? 'bg-blue-100'
                                : 'bg-gray-100'
                            }`}>
                              <Check className={`w-3 h-3 ${
                                plan.isFeatured ? 'text-blue-600' : 'text-gray-500'
                              }`} />
                            </div>
                            <span className="text-gray-600">{feature.name}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="space-y-2 mt-4">
                      <ButtonCheckout
                        priceId={plan.priceId}
                        className={`w-full ${
                          plan.isFeatured
                            ? 'btn-primary text-lg font-semibold'
                            : 'btn-secondary py-3 px-6'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="bg-green-50 border border-green-200 p-6 rounded-xl flex items-start gap-4">
              <CheckCircle className="w-6 h-6 text-green-600 shrink-0" />
              <div>
                <h3 className="font-bold text-green-700">Active Subscription</h3>
                <div className="text-gray-600 mt-1">You have full access to all features</div>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-display font-semibold mb-4 text-gray-900">Getting Started</h3>
              <p className="text-gray-500 mb-8">Follow these steps to start generating reports:</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card-hover p-6 hover:-translate-y-1 hover:shadow-md transition-all duration-200 group">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Link2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <h4 className="font-semibold text-lg text-gray-900">Trainerize Setup</h4>
                  </div>
                  <p className="text-gray-500 mb-4">Enter your Trainerize credentials to connect your account</p>
                  <div className="mt-auto">
                    <Link
                      href="/dashboard/trainerize"
                      className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors font-medium"
                    >
                      Configure
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>

                <div className="card-hover p-6 hover:-translate-y-1 hover:shadow-md transition-all duration-200 group">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                      <Users className="w-5 h-5 text-teal-600" />
                    </div>
                    <h4 className="font-semibold text-lg text-gray-900">Import Clients</h4>
                  </div>
                  <p className="text-gray-500 mb-4">Import your client list from your Trainerize account</p>
                  <div className="mt-auto">
                    <Link
                      href="/dashboard/clients"
                      className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors font-medium"
                    >
                      Import
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>

                <div className="card-hover p-6 hover:-translate-y-1 hover:shadow-md transition-all duration-200 group">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-indigo-600" />
                    </div>
                    <h4 className="font-semibold text-lg text-gray-900">Generate Reports</h4>
                  </div>
                  <p className="text-gray-500 mb-4">Generate reports from individual client pages</p>
                  <div className="mt-auto">
                    <Link
                      href="/dashboard/clients"
                      className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors font-medium"
                    >
                      View Clients
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
