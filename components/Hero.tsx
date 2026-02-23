"use client";

import { motion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import CalendlyButton from "@/components/CalendlyButton";

const Hero = () => {
  return (
    <section className="relative w-full overflow-hidden bg-white">
      {/* Background gradient — subtle, professional */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-blue-50/30 to-white" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 sm:pt-32 lg:pt-36 pb-24 sm:pb-32 lg:pb-40">
        <div className="flex flex-col items-center max-w-4xl mx-auto">

          {/* Qualifier Badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-xs font-semibold text-blue-600 uppercase tracking-wider mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              For Trainerize Coaches
            </span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl tracking-tight text-center mb-5 leading-[1.1]"
          >
            <span className="text-gray-900">Client Fulfillment That Used to Take Hours, </span>
            <span className="gradient-text">Done in Minutes</span>
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base sm:text-lg text-gray-500 leading-relaxed max-w-xl text-center mb-8"
          >
            FitReport auto-generates client reports from your Trainerize data so you don&apos;t waste time with data collection.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4"
          >
            <CalendlyButton className="btn-primary px-7 py-3 text-base font-semibold rounded-lg transition-all hover:-translate-y-0.5 hover:shadow-lg inline-flex items-center justify-center gap-2">
              Schedule a Call
              <ArrowRight className="w-4 h-4" />
            </CalendlyButton>
            <a
              href="#demo-video"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 text-base font-medium text-gray-500 hover:text-gray-900 transition-colors"
            >
              <Play className="w-4 h-4" />
              Watch Demo
            </a>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default Hero;
