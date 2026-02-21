"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

// TODO: Replace with your actual Calendly link
const CALENDLY_URL = "https://calendly.com/fitreport/demo";

const Hero = () => {
  return (
    <section className="relative w-full overflow-hidden bg-white">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 to-white" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 md:pt-20 pb-10 md:pb-14">
        <div className="flex flex-col items-center max-w-5xl mx-auto">

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl tracking-tight text-center mb-3 md:mb-4 leading-[1.1]"
          >
            <span className="text-gray-900">Client Reports That Used to Take Hours, </span>
            <span className="gradient-text">Done in Seconds</span>
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-base sm:text-lg text-gray-500 leading-relaxed max-w-2xl text-center mb-6 md:mb-8"
          >
            FitReport pulls your Trainerize data and turns it into professional progress reports your clients will actually read.
          </motion.p>

          {/* Demo Video */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative w-full max-w-4xl mb-8 md:mb-10"
          >
            <div className="card overflow-hidden rounded-xl shadow-lg">
              <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                <iframe
                  src="https://www.youtube.com/embed/CGNIn7suVgc?si=W7mP24F9ZPgpsvbk"
                  title="FitReport Demo"
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
            </div>
          </motion.div>

          {/* CTA Buttons — below video */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 w-full max-w-lg justify-center"
          >
            <a
              href={CALENDLY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary w-full sm:w-auto px-8 py-3.5 text-lg font-semibold rounded-lg transition-all hover:-translate-y-0.5 hover:shadow-lg inline-flex items-center justify-center gap-2"
            >
              Schedule a Call
              <ArrowRight className="w-5 h-5" />
            </a>
            <a
              href="/#how-it-works"
              className="w-full sm:w-auto px-8 py-3.5 text-lg font-semibold rounded-lg transition-all hover:-translate-y-0.5 inline-flex items-center justify-center gap-2 bg-white text-gray-900 border border-gray-300 hover:border-gray-400 hover:bg-gray-50 shadow-sm"
            >
              How It Works
            </a>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default Hero;
