export const dynamic = "force-dynamic";

// This is a private page: It's protected by the layout.js component which ensures the user is authenticated.
// It's a server compoment which means you can fetch data (like the user profile) before the page is rendered.
// See https://shipfa.st/docs/tutorials/private-page
export default async function Dashboard() {
  // TODO: Replace with actual subscription check
  const hasActivePlan = false;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
      </div>
      
      <div className="bg-base-100 p-6 rounded-lg shadow-xl border border-base-300">
        <h2 className="text-xl font-semibold mb-4">Welcome to FitReport</h2>
        
        {!hasActivePlan ? (
          <div className="space-y-4">
            <div className="alert alert-warning">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <div>
                <h3 className="font-bold">No active subscription</h3>
                <div className="text-sm">You need to subscribe to generate reports.</div>
              </div>
            </div>
            <button className="btn btn-primary">Subscribe Now</button>
          </div>
        ) : (
          <div className="space-y-6">
            <p className="text-base-content/80 text-lg">Here&apos;s how to generate reports:</p>
            
            <div className="steps steps-vertical">
              <div className="step step-primary">
                <div className="step-circle">1</div>
                <h3 className="text-base font-medium">Enter your trainerize credentials</h3>
              </div>
              <div className="step step-primary">
                <div className="step-circle">2</div>
                <h3 className="text-base font-medium">Import your clients from trainerize</h3>
              </div>
              <div className="step step-primary">
                <div className="step-circle">3</div>
                <h3 className="text-base font-medium">Schedule & run your report</h3>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
