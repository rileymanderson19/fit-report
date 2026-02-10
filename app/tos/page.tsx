import Link from "next/link";
import { getSEOTags } from "@/libs/seo";
import config from "@/config";
import { ArrowLeft } from "lucide-react";

export const metadata = getSEOTags({
  title: `Terms and Conditions | ${config.appName}`,
  canonicalUrlRelative: "/tos",
});

const TOS = () => {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-5 md:p-10">
        <Link
          href="/"
          className="btn-secondary px-4 py-2 rounded-lg font-medium inline-flex items-center gap-2 mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        <div className="card p-8 md:p-12">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-8 text-gray-900">
            Terms and Conditions for <span className="text-blue-600">{config.appName}</span>
          </h1>

          <div className="prose prose-lg max-w-none text-gray-600 space-y-6">
            <p className="text-sm text-gray-400">Last Updated: January 15, 2025</p>

            <p>
              Welcome to FitReport! These Terms of Service (&quot;Terms&quot;) govern your use of the FitReport website and services. By using our website and services, you agree to these Terms.
            </p>

            <section>
              <h2 className="text-xl font-display font-bold text-gray-900">1. Description of FitReport</h2>
              <p>
                FitReport is a SaaS platform that generates comprehensive fitness progress reports for personal trainers by integrating with Trainerize. The service provides automated report generation, client data visualization, and progress tracking tools.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-display font-bold text-gray-900">2. Subscription and Access</h2>
              <p>
                FitReport is available through paid subscription plans. When you subscribe, you gain access to the features included in your chosen plan. Access continues for the duration of your active subscription. You may cancel at any time, and your access will continue until the end of your current billing period.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-display font-bold text-gray-900">3. User Data and Privacy</h2>
              <p>
                We collect and store user data, including name, email, payment information, and Trainerize credentials, as necessary to provide our services. For details on how we handle your data, please refer to our{" "}
                <Link href="/privacy-policy" className="text-blue-600 hover:text-blue-700">Privacy Policy</Link>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-display font-bold text-gray-900">4. Client Data Handling</h2>
              <p>
                FitReport accesses client training data through the Trainerize platform on your behalf. You are responsible for ensuring you have the appropriate permissions and consent from your clients to access and use their fitness data for report generation. FitReport processes this data solely for the purpose of generating reports and does not share client data with third parties.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-display font-bold text-gray-900">5. Non-Personal Data Collection</h2>
              <p>
                We use web cookies to collect non-personal data for the purpose of improving our services and user experience.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-display font-bold text-gray-900">6. Acceptable Use</h2>
              <p>
                You agree to use FitReport only for its intended purpose of generating fitness reports. You may not use the service to collect, store, or distribute client data for purposes unrelated to fitness coaching and reporting.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-display font-bold text-gray-900">7. Governing Law</h2>
              <p>
                These Terms are governed by the laws of the United States of America.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-display font-bold text-gray-900">8. Updates to the Terms</h2>
              <p>
                We may update these Terms from time to time. Users will be notified of any significant changes via email.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-display font-bold text-gray-900">9. Contact</h2>
              <p>
                For any questions or concerns regarding these Terms of Service, please contact us at{" "}
                <a href="mailto:riley@rileymanderson.com" className="text-blue-600 hover:text-blue-700">riley@rileymanderson.com</a>.
              </p>
            </section>

            <p className="text-sm text-gray-400 pt-4 border-t border-gray-200">
              Thank you for using FitReport!
            </p>
          </div>
        </div>
      </div>
    </main>
  );
};

export default TOS;
