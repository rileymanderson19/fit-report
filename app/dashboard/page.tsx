export const dynamic = "force-dynamic";

import { createClient } from "@/libs/supabase/server";
import ButtonCheckout from "@/components/ButtonCheckout";
import config from "@/config";
import Link from "next/link";

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

  const hasActivePlan = profile?.has_access === true;

  return (
    <div className="container mx-auto px-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
      </div>
      
      <div className="bg-base-100 p-8 rounded-lg shadow-xl border border-base-300">
        <h2 className="text-xl font-semibold mb-6">Welcome to FitReport</h2>
        
        {!hasActivePlan ? (
          <div className="space-y-8">
            <div className="alert alert-warning">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <div>
                <h3 className="font-bold">No active subscription</h3>
                <div className="text-sm">Choose a plan below to start generating reports.</div>
              </div>
            </div>

            <div className="relative flex justify-center flex-col lg:flex-row items-center lg:items-stretch gap-8">
              {config.stripe.plans.map((plan) => (
                <div key={plan.priceId} className="relative w-full max-w-lg">
                  {plan.isFeatured && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                      <span className="badge text-xs text-primary-content font-semibold border-0 bg-primary">
                        SAVE 21%
                      </span>
                    </div>
                  )}

                  {plan.isFeatured && (
                    <div className="absolute -inset-[1px] rounded-[9px] bg-primary z-10"></div>
                  )}

                  <div className="relative flex flex-col h-full gap-5 lg:gap-8 z-10 bg-black/40 backdrop-blur-xl p-8 rounded-lg border border-white/10">
                    <div className="flex justify-between items-center gap-4">
                      <div>
                        <p className="text-lg lg:text-xl font-bold">{plan.name}</p>
                        {plan.description && (
                          <p className="text-base-content/80 mt-2">
                            {plan.description}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-3">
                      <div className="flex gap-2 items-end">
                        <p className="text-5xl tracking-tight font-extrabold">
                          ${plan.price}
                        </p>
                        <div className="flex flex-col justify-end mb-2">
                          <p className="text-sm text-base-content/60 font-semibold">
                            /mo
                          </p>
                        </div>
                      </div>
                      
                      {plan.billingPeriod === "yearly" && (
                        <p className="text-sm text-base-content/80">
                          Billed annually (${plan.price * 12})
                        </p>
                      )}
                      
                      {plan.priceAnchor && (
                        <p className="text-sm text-base-content/60">
                          <span className="line-through">${plan.priceAnchor}/mo</span>
                        </p>
                      )}
                    </div>

                    {plan.features && (
                      <ul className="space-y-2.5 leading-relaxed text-base flex-1">
                        {plan.features.map((feature, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              className="w-[18px] h-[18px] opacity-80 shrink-0"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                                clipRule="evenodd"
                              />
                            </svg>
                            <span>{feature.name}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="space-y-2">
                      <ButtonCheckout 
                        priceId={plan.priceId} 
                        className={`btn btn-block ${plan.isFeatured ? 'btn-primary' : 'btn-outline'}`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="alert alert-success bg-primary/10 border-primary">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-primary shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <div>
                <h3 className="font-bold text-primary">Active Subscription</h3>
                <div className="text-base-content/80">You have full access to all features</div>
              </div>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold mb-4">Getting Started</h3>
              <p className="text-base-content/80 mb-6">Follow these steps to start generating reports:</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card bg-base-200 shadow-lg hover:shadow-xl transition-all">
                  <div className="card-body">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-content font-semibold">1</div>
                      <h4 className="font-semibold">Trainerize Setup</h4>
                    </div>
                    <p className="text-base-content/80">Enter your Trainerize credentials to connect your account</p>
                    <div className="card-actions justify-end mt-4">
                      <Link href="/dashboard/trainerize" className="btn btn-primary btn-sm">Configure</Link>
                    </div>
                  </div>
                </div>

                <div className="card bg-base-200 shadow-lg hover:shadow-xl transition-all">
                  <div className="card-body">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-content font-semibold">2</div>
                      <h4 className="font-semibold">Import Clients</h4>
                    </div>
                    <p className="text-base-content/80">Import your client list from your Trainerize account</p>
                    <div className="card-actions justify-end mt-4">
                      <Link href="/dashboard/clients" className="btn btn-primary btn-sm">Import</Link>
                    </div>
                  </div>
                </div>

                <div className="card bg-base-200 shadow-lg hover:shadow-xl transition-all">
                  <div className="card-body">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-content font-semibold">3</div>
                      <h4 className="font-semibold">Generate Reports</h4>
                    </div>
                    <p className="text-base-content/80">Schedule and run reports for your clients</p>
                    <div className="card-actions justify-end mt-4">
                      <Link href="/dashboard/reports" className="btn btn-primary btn-sm">Create</Link>
                    </div>
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
