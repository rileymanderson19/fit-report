"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import config from "@/config";
import logo from "@/app/icon.png";

// Add the Footer to the bottom of your landing page and more.
// The support link is connected to the config.js file. If there's no config.resend.supportEmail, the link won't be displayed.

const Footer = () => {
  return (
    <footer className="w-full border-t border-white/10 text-white bg-gradient-to-b from-black to-bg-secondary">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24">
        {/* Main Footer Content */}
        <div className="flex flex-col md:flex-row gap-12 md:gap-16">
          {/* Logo and Info Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="w-full md:w-72 flex flex-col items-center md:items-start"
          >
            {/* Logo and Name */}
            <Link
              href="/#"
              aria-current="page"
              className="flex items-center gap-2.5 group"
            >
              <div className="relative">
                <Image
                  src={logo}
                  alt={`${config.appName} logo`}
                  priority={true}
                  className="w-8 h-8 md:w-6 md:h-6 transition-transform group-hover:scale-110"
                  width={32}
                  height={32}
                />
                <div className="absolute inset-0 glow-purple opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
              </div>
              <span className="font-display font-extrabold tracking-tight text-lg">
                {config.appName}
              </span>
            </Link>

            {/* Description */}
            <p className="mt-4 text-base text-gray-400 text-center md:text-left">
              {config.appDescription}
            </p>

            {/* Copyright */}
            <p className="mt-3 text-sm text-gray-500 text-center md:text-left">
              Copyright © {new Date().getFullYear()} - All rights reserved
            </p>

            {/* Built with Badge */}
            <a
              href="https://shipfa.st/?ref=shipfast_badge"
              title="Go to ShipFast"
              target="_blank"
              className="mt-6 inline-flex items-center gap-2 rounded-lg glass border border-white/10 hover:border-accent-purple/50 px-3 py-2 text-sm transition-all"
            >
              <span className="text-gray-400">Built with</span>
              <div className="flex items-center gap-1 text-white">
                <svg
                  className="size-4"
                  viewBox="0 0 375 509"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M233.962 11.7151L233.954 11.7229L186.393 57.3942L186.392 57.3948C116.335 124.657 57.1377 202.349 10.9069 287.707L10.8624 287.789L10.8164 287.87C10.5281 288.38 10.3791 288.954 10.383 289.537C10.387 290.12 10.5438 290.693 10.839 291.198C11.1342 291.704 11.5582 292.125 12.0701 292.419C12.5819 292.713 13.1633 292.868 13.756 292.869H129.042H139.042V302.869V494.875V494.888C139.042 495.535 139.229 496.17 139.584 496.715L131.361 502.072L139.584 496.715C139.939 497.26 140.447 497.692 141.048 497.957C141.648 498.222 142.314 498.308 142.963 498.202C143.613 498.096 144.215 497.804 144.698 497.365L144.7 497.363L165.966 477.999L165.97 477.996C239.677 410.959 302.226 332.637 351.272 245.969L351.274 245.966L364.435 222.73L364.44 222.721L364.445 222.712C364.735 222.203 364.885 221.627 364.882 221.043C364.879 220.459 364.723 219.886 364.427 219.379C364.132 218.872 363.707 218.45 363.194 218.156C362.681 217.862 362.099 217.707 361.505 217.707H361.5H249.685H239.685V207.707V14.1248C239.685 13.47 239.492 12.8285 239.129 12.28M233.962 11.7151L239.129 12.28M233.962 11.7151C234.438 11.2571 235.04 10.9473 235.694 10.8267C236.349 10.7061 237.024 10.7805 237.635 11.0399C238.246 11.2993 238.765 11.7314 239.129 12.28M233.962 11.7151L247.465 6.75675L239.129 12.28"
                    fill="#FFBE18"
                    stroke="black"
                    strokeWidth="20"
                  />
                </svg>
                <span className="font-semibold">ShipFast</span>
              </div>
            </a>
          </motion.div>

          {/* Links Sections */}
          <div className="flex flex-1 flex-col sm:flex-row gap-12 sm:gap-16 md:gap-24 lg:gap-32">
            {/* Links Column */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col items-center sm:items-start"
            >
              <h3 className="font-semibold text-sm tracking-wider text-gray-400 mb-4">
                LINKS
              </h3>
              <div className="flex flex-col items-center sm:items-start gap-3">
                {config.resend.supportEmail && (
                  <a
                    href={`mailto:${config.resend.supportEmail}`}
                    target="_blank"
                    className="relative text-base text-gray-400 hover:text-accent-purple transition-colors group"
                  >
                    Support
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-accent-purple transition-all group-hover:w-full" />
                  </a>
                )}
                <Link
                  href="/#pricing"
                  className="relative text-base text-gray-400 hover:text-accent-purple transition-colors group"
                >
                  Pricing
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-accent-purple transition-all group-hover:w-full" />
                </Link>
                <Link
                  href="/blog"
                  className="relative text-base text-gray-400 hover:text-accent-purple transition-colors group"
                >
                  Blog
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-accent-purple transition-all group-hover:w-full" />
                </Link>
                <Link
                  href="/#"
                  className="relative text-base text-gray-400 hover:text-accent-purple transition-colors group"
                >
                  Affiliates
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-accent-purple transition-all group-hover:w-full" />
                </Link>
              </div>
            </motion.div>

            {/* Legal Column */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col items-center sm:items-start"
            >
              <h3 className="font-semibold text-sm tracking-wider text-gray-400 mb-4">
                LEGAL
              </h3>
              <div className="flex flex-col items-center sm:items-start gap-3">
                <Link
                  href="/tos"
                  className="relative text-base text-gray-400 hover:text-accent-purple transition-colors group"
                >
                  Terms of services
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-accent-purple transition-all group-hover:w-full" />
                </Link>
                <Link
                  href="/privacy-policy"
                  className="relative text-base text-gray-400 hover:text-accent-purple transition-colors group"
                >
                  Privacy policy
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-accent-purple transition-all group-hover:w-full" />
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
