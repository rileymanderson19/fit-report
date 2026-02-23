"use client";

import { motion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import CalendlyButton from "@/components/CalendlyButton";
import HeroProductShowcase from "@/components/landing/HeroProductShowcase";

const Hero = () => {
  return (
    <section className="relative w-full overflow-visible bg-white">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-blue-50/30 to-white" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 sm:pt-32 lg:pt-36">

        {/* Centered copy */}
        <div className="flex flex-col items-center text-center">

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
            className="font-display font-extrabold text-4xl sm:text-5xl lg:text-[3.5rem] tracking-tight mb-5 leading-[1.1] max-w-3xl"
          >
            <span className="text-gray-900">Your Sunday Admin Grind, </span>
            <span className="gradient-text">Replaced in 30 Seconds</span>
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base sm:text-lg text-gray-500 leading-relaxed max-w-2xl mb-8"
          >
            FitReport pulls your Trainerize data and turns it into branded progress reports &mdash; so you stop spending hours on admin that should take seconds.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
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

        {/* Product showcase */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="mt-12 sm:mt-16 max-w-5xl mx-auto pb-12 sm:pb-16"
        >
          <HeroProductShowcase />
        </motion.div>

      </div>
    </section>
  );
};

export default Hero;
