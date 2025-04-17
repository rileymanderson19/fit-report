export const dynamic = "force-dynamic";

import { createClient } from "@/libs/supabase/server";
import ButtonCheckout from "@/components/ButtonCheckout";
import config from "@/config";

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
          <div className="space-y-4">
            <div className="alert alert-warning">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <div>
                <h3 className="font-bold">No active subscription</h3>
                <div className="text-sm">You need to subscribe to generate reports.</div>
              </div>
            </div>
            <ButtonCheckout 
              priceId={config.stripe.plans[0].priceId}
              mode="subscription"
            />
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
                      <button className="btn btn-primary btn-sm">Configure</button>
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
                      <button className="btn btn-primary btn-sm">Import</button>
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
                      <button className="btn btn-primary btn-sm">Create</button>
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
