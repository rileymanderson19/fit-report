import Link from "next/link";
import { getSEOTags } from "@/libs/seo";
import config from "@/config";
import { ArrowLeft } from "lucide-react";

export const metadata = getSEOTags({
  title: `Privacy Policy | ${config.appName}`,
  canonicalUrlRelative: "/privacy-policy",
});

const PrivacyPolicy = () => {
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
            Privacy Policy for <span className="text-blue-600">{config.appName}</span>
          </h1>

          <div className="prose prose-lg max-w-none text-gray-600 space-y-6">
            <p className="text-sm text-gray-400">Last Updated: January 15, 2025</p>

            <section>
              <p>
                Thank you for visiting FitReport (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). This Privacy Policy outlines how we collect, use, and protect your personal and non-personal information when you use our website and services (the &quot;Service&quot;).
              </p>
              <p>
                By accessing or using the Service, you agree to the terms of this Privacy Policy. If you do not agree with the practices described in this policy, please do not use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-display font-bold text-gray-900">1. Information We Collect</h2>

              <h3 className="text-lg font-semibold text-gray-900">1.1 Personal Data</h3>
              <p>We collect the following personal information from you:</p>
              <ul className="list-disc list-inside space-y-2">
                <li><strong>Name:</strong> We collect your name to personalize your experience and communicate with you effectively.</li>
                <li><strong>Email:</strong> We collect your email address to send you important information regarding your account, updates, and communication.</li>
                <li><strong>Payment Information:</strong> We collect payment details to process your subscription securely. However, we do not store your payment information on our servers. Payments are processed by Stripe.</li>
                <li><strong>Trainerize Credentials:</strong> We collect your Trainerize login credentials to access client training data on your behalf. These credentials are stored securely and encrypted.</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-900 mt-4">1.2 Non-Personal Data</h3>
              <p>
                We may use web cookies and similar technologies to collect non-personal information such as your IP address, browser type, device information, and browsing patterns. This information helps us enhance your browsing experience, analyze trends, and improve our services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-display font-bold text-gray-900">2. Purpose of Data Collection</h2>
              <p>
                We collect and use your personal data to provide the FitReport service, including generating fitness progress reports for your clients, processing your subscription, providing customer support, and keeping you updated about the status of your account.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-display font-bold text-gray-900">3. Data Sharing</h2>
              <p>
                We do not share your personal data with any third parties except as required for service operation (e.g., sharing payment information with Stripe for processing). We do not sell, trade, or rent your personal information to others.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-display font-bold text-gray-900">4. Children&apos;s Privacy</h2>
              <p>
                FitReport is not intended for children under the age of 13. We do not knowingly collect personal information from children. If you are a parent or guardian and believe that your child has provided us with personal information, please contact us at the email address provided below.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-display font-bold text-gray-900">5. Updates to the Privacy Policy</h2>
              <p>
                We may update this Privacy Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. Any updates will be posted on this page, and we may notify you via email about significant changes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-display font-bold text-gray-900">6. Contact Information</h2>
              <p>
                If you have any questions, concerns, or requests related to this Privacy Policy, you can contact us at:
              </p>
              <p>
                Email: <a href="mailto:riley@rileymanderson.com" className="text-blue-600 hover:text-blue-700">riley@rileymanderson.com</a>
              </p>
            </section>

            <p className="text-sm text-gray-400 pt-4 border-t border-gray-200">
              By using FitReport, you consent to the terms of this Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
};

export default PrivacyPolicy;
