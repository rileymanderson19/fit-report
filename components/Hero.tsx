"use client";

import { motion } from "framer-motion";
import { TrendingUp, Activity, BarChart3 } from "lucide-react";

const Hero = () => {
  const handleScrollToPricing = () => {
    const pricingSection = document.getElementById('pricing');
    if (pricingSection) {
      pricingSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative w-full min-h-[90vh] overflow-hidden bg-white">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 to-white" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 lg:py-40">
        <div className="flex flex-col items-center max-w-5xl mx-auto">

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8 md:mb-10"
          >
            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium text-blue-700 bg-blue-50 border border-blue-100">
              <Activity className="w-4 h-4 mr-2" />
              Trainerize Enhanced Reporting
            </span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="font-display font-extrabold text-5xl xs:text-6xl sm:text-7xl lg:text-8xl tracking-tight text-center mb-6 md:mb-8 leading-[1.05]"
          >
            <span className="text-gray-900 block">Focus on Clients,</span>
            <span className="gradient-text block mt-1">Not Data Entry</span>
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-lg sm:text-xl text-gray-500 leading-relaxed max-w-2xl text-center mb-10 md:mb-14"
          >
            FitReport connects to Trainerize to provide enhanced analytics and automated reporting, so you can spend less time navigating data screens and more time helping clients achieve their fitness goals.
          </motion.p>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col xs:flex-row gap-4 xs:gap-4 w-full max-w-md justify-center mb-16 md:mb-20"
          >
            <button
              onClick={handleScrollToPricing}
              className="btn-primary w-full xs:w-auto px-8 py-3.5 text-lg font-semibold rounded-lg transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              Start Free Trial →
            </button>
          </motion.div>

          {/* Data Cards */}
          <div className="relative w-full max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

              {/* Card 1: Progress Tracking */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.8 }}
                className="card p-5 rounded-xl hover:shadow-md transition-all hover:-translate-y-1"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-[10px] font-mono font-medium text-gray-400 tracking-wider">LIVE DATA</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-gray-500">Client Progress</span>
                    <span className="text-2xl font-mono font-bold text-blue-600">+24%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: "75%" }}
                      transition={{ duration: 1.5, delay: 1.2 }}
                      className="h-full bg-blue-600 rounded-full"
                    />
                  </div>
                  <p className="text-xs text-gray-400">Avg. across all clients</p>
                </div>
              </motion.div>

              {/* Card 2: Active Clients */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1.0 }}
                className="card p-5 rounded-xl hover:shadow-md transition-all hover:-translate-y-1 md:translate-y-4"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-teal-50 rounded-lg">
                    <Activity className="w-5 h-5 text-teal-600" />
                  </div>
                  <span className="text-[10px] font-mono font-medium text-gray-400 tracking-wider">ACTIVE</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-gray-500">Active Clients</span>
                    <motion.span
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.8, delay: 1.4 }}
                      className="text-2xl font-mono font-bold text-teal-600"
                    >
                      127
                    </motion.span>
                  </div>
                  <div className="flex gap-1 mt-2 h-10">
                    {[40, 55, 35, 70, 60, 80, 65, 90].map((h, i) => (
                      <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ duration: 0.6, delay: 1.2 + i * 0.1 }}
                        className="flex-1 bg-teal-100 rounded-sm"
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-400">+12 this week</p>
                </div>
              </motion.div>

              {/* Card 3: Reports Generated */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1.2 }}
                className="card p-5 rounded-xl hover:shadow-md transition-all hover:-translate-y-1"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-indigo-50 rounded-lg">
                    <BarChart3 className="w-5 h-5 text-indigo-600" />
                  </div>
                  <span className="text-[10px] font-mono font-medium text-gray-400 tracking-wider">AUTOMATED</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-gray-500">Reports</span>
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.8, delay: 1.6 }}
                      className="text-2xl font-mono font-bold text-indigo-600"
                    >
                      2.4K
                    </motion.span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 mt-2">
                    <div className="h-10 bg-indigo-50 rounded flex items-end">
                      <div className="w-full h-6 bg-indigo-200 rounded" />
                    </div>
                    <div className="h-10 bg-indigo-50 rounded flex items-end">
                      <div className="w-full h-8 bg-indigo-300 rounded" />
                    </div>
                    <div className="h-10 bg-indigo-50 rounded flex items-end">
                      <div className="w-full h-full bg-indigo-500 rounded" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">Generated this month</p>
                </div>
              </motion.div>

            </div>
          </div>

          {/* Scroll Indicator — hidden on mobile */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 2 }}
            className="hidden md:block absolute bottom-8 left-1/2 transform -translate-x-1/2"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="w-5 h-8 border-2 border-gray-300 rounded-full flex justify-center pt-1.5"
            >
              <div className="w-1 h-1.5 bg-gray-400 rounded-full" />
            </motion.div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default Hero;
