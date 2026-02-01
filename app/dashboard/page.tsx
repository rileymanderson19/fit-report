export const dynamic = "force-dynamic";

import { createClient } from "@/libs/supabase/server";
import ButtonCheckout from "@/components/ButtonCheckout";
import config from "@/config";
import { isStripeGatingEnabled } from "@/libs/featureFlags";
import Link from "next/link";
import { Sparkles } from "lucide-react";

// This is a private page: It's protected by the layout.js component which ensures the user is authenticated.
// It's a server compoment which means you can fetch data (like the user profile) before the page is rendered.
// See https://shipfa.st/docs/tutorials/private-page
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
    <div className="container mx-auto px-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-display font-bold">
          <span className="gradient-text">Dashboard</span>
        </h1>
      </div>

      <div className="card-elevated p-8 md:p-10 rounded-2xl">
        <h2 className="text-2xl font-display font-semibold mb-8 text-white">Welcome to FitReport</h2>

        {!hasActivePlan ? (
          <div className="space-y-8">
            <div className="glass border border-yellow-500/30 bg-yellow-500/10 p-6 rounded-xl flex items-start gap-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-yellow-500 shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h3 className="font-bold text-yellow-500">No active subscription</h3>
                <div className="text-sm text-gray-300 mt-1">Choose a plan below to start generating reports.</div>
              </div>
            </div>

            <div className="relative flex justify-center flex-col lg:flex-row items-center lg:items-stretch gap-8">
              {config.stripe.plans.map((plan) => (
                <div key={plan.priceId} className="relative w-full max-w-lg">
                  {plan.isFeatured && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                      <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-primary-start to-accent-purple text-white text-xs font-bold shadow-lg">
                        <Sparkles className="w-3 h-3" />
                        SAVE 21%
                      </span>
                    </div>
                  )}

                  {plan.isFeatured && (
                    <div className="absolute -inset-[2px] rounded-2xl bg-gradient-to-r from-primary-start via-accent-purple to-accent-indigo opacity-75 blur-sm z-10 animate-pulse-glow"></div>
                  )}

                  <div className={`relative flex flex-col h-full gap-5 lg:gap-8 z-10 p-8 rounded-2xl transition-all duration-300 ${
                    plan.isFeatured
                      ? 'card-elevated border-2 border-accent-purple/50'
                      : 'card-elevated'
                  }`}>
                    <div className="flex justify-between items-center gap-4">
                      <div>
                        <p className="text-2xl lg:text-3xl font-display font-bold text-white">{plan.name}</p>
                        {plan.description && (
                          <p className="text-gray-400 mt-2">
                            {plan.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <div className="flex gap-2 items-end">
                        <p className={`text-6xl tracking-tight font-mono font-extrabold ${
                          plan.isFeatured ? 'gradient-text' : 'text-white'
                        }`}>
                          ${plan.price}
                        </p>
                        <div className="flex flex-col justify-end mb-3">
                          <p className="text-sm text-gray-400 font-semibold">
                            /mo
                          </p>
                        </div>
                      </div>

                      {plan.billingPeriod === "yearly" && (
                        <p className="text-sm text-gray-400">
                          Billed annually (${plan.price * 12})
                        </p>
                      )}

                      {plan.priceAnchor && (
                        <p className="text-sm text-gray-500">
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
                                ? 'bg-accent-purple/20'
                                : 'bg-gray-700/50'
                            }`}>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                className={`w-3 h-3 ${
                                  plan.isFeatured ? 'text-accent-purple' : 'text-gray-400'
                                }`}
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                            <span className="text-gray-300">{feature.name}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="space-y-2 mt-4">
                      <ButtonCheckout
                        priceId={plan.priceId}
                        className={`w-full ${
                          plan.isFeatured
                            ? 'btn-gradient text-lg font-semibold'
                            : 'glass border border-white/10 hover:border-accent-purple/50 text-white py-3 px-6 rounded-lg transition-all duration-200'
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
            <div className="glass border border-green-500/30 bg-green-500/10 p-6 rounded-xl flex items-start gap-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-green-500 shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="font-bold text-green-500">Active Subscription</h3>
                <div className="text-gray-300 mt-1">You have full access to all features</div>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-display font-semibold mb-4 text-white">Getting Started</h3>
              <p className="text-gray-400 mb-8">Follow these steps to start generating reports:</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card-elevated p-6 rounded-xl hover:scale-105 transition-all duration-200 group">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary-start to-accent-purple flex items-center justify-center text-white font-bold text-lg">1</div>
                    <h4 className="font-semibold text-lg text-white">Trainerize Setup</h4>
                  </div>
                  <p className="text-gray-400 mb-4">Enter your Trainerize credentials to connect your account</p>
                  <div className="mt-auto">
                    <Link
                      href="/dashboard/trainerize"
                      className="inline-flex items-center gap-2 text-accent-purple hover:text-primary-start transition-colors font-medium"
                    >
                      Configure
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>

                <div className="card-elevated p-6 rounded-xl hover:scale-105 transition-all duration-200 group">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-accent-violet to-accent-indigo flex items-center justify-center text-white font-bold text-lg">2</div>
                    <h4 className="font-semibold text-lg text-white">Import Clients</h4>
                  </div>
                  <p className="text-gray-400 mb-4">Import your client list from your Trainerize account</p>
                  <div className="mt-auto">
                    <Link
                      href="/dashboard/clients"
                      className="inline-flex items-center gap-2 text-accent-purple hover:text-primary-start transition-colors font-medium"
                    >
                      Import
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>

                <div className="card-elevated p-6 rounded-xl hover:scale-105 transition-all duration-200 group">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-accent-indigo to-accent-pink flex items-center justify-center text-white font-bold text-lg">3</div>
                    <h4 className="font-semibold text-lg text-white">Generate Reports</h4>
                  </div>
                  <p className="text-gray-400 mb-4">Generate reports from individual client pages</p>
                  <div className="mt-auto">
                    <Link
                      href="/dashboard/clients"
                      className="inline-flex items-center gap-2 text-accent-purple hover:text-primary-start transition-colors font-medium"
                    >
                      View Clients
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
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
