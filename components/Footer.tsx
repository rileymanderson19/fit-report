"use client";

import Link from "next/link";
import Logo from "@/components/Logo";
import config from "@/config";

const Footer = () => {
  return (
    <footer className="w-full border-t border-gray-200 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="flex flex-col md:flex-row gap-10 md:gap-16">
          {/* Logo and Info */}
          <div className="w-full md:w-72 flex flex-col items-center md:items-start">
            <Logo variant="full" size="md" theme="light" href="/" />

            <p className="mt-4 text-sm text-gray-500 text-center md:text-left">
              {config.appDescription}
            </p>

            <p className="mt-3 text-xs text-gray-400 text-center md:text-left">
              Copyright © {new Date().getFullYear()} - All rights reserved
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-1 flex-col sm:flex-row gap-10 sm:gap-16 md:gap-24">
            <div className="flex flex-col items-center sm:items-start">
              <h3 className="font-semibold text-xs tracking-wider text-gray-400 uppercase mb-4">
                Links
              </h3>
              <div className="flex flex-col items-center sm:items-start gap-3">
                {config.resend.supportEmail && (
                  <a
                    href={`mailto:${config.resend.supportEmail}`}
                    target="_blank"
                    className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
                  >
                    Support
                  </a>
                )}
                <a
                  href="https://calendly.com/riley-fitreport/intro"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
                >
                  Schedule a Call
                </a>
              </div>
            </div>

            <div className="flex flex-col items-center sm:items-start">
              <h3 className="font-semibold text-xs tracking-wider text-gray-400 uppercase mb-4">
                Legal
              </h3>
              <div className="flex flex-col items-center sm:items-start gap-3">
                <Link
                  href="/tos"
                  className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
                >
                  Terms of Service
                </Link>
                <Link
                  href="/privacy-policy"
                  className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
                >
                  Privacy Policy
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
