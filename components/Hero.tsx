"use client";

import { motion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import HeroProductPreview from "@/components/landing/HeroProductPreview";
import CalendlyButton from "@/components/CalendlyButton";

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
            <span className="text-gray-900">Client Fulfillment That Used to Take Hours, </span>
            <span className="gradient-text"> Done in Minutes</span>
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-base sm:text-lg text-gray-500 leading-relaxed max-w-2xl text-center mb-8 md:mb-10"
          >
            FitReport auto-generates client reports from your Trainerize data so you don&apos;t waste time with data collection.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mb-10 md:mb-12 flex flex-col sm:flex-row items-center gap-3 sm:gap-4"
          >
            <CalendlyButton className="btn-primary px-8 py-3.5 text-lg font-semibold rounded-lg transition-all hover:-translate-y-0.5 hover:shadow-lg inline-flex items-center justify-center gap-2">
              Schedule a Call
              <ArrowRight className="w-5 h-5" />
            </CalendlyButton>
            <a
              href="#demo-video"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-lg font-semibold text-gray-700 hover:text-gray-900 transition-colors rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50"
            >
              <Play className="w-5 h-5" />
              Watch Demo
            </a>
          </motion.div>

          {/* Product Preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="w-full"
          >
            <HeroProductPreview />
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default Hero;
