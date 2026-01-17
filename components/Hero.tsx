"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { TrendingUp, Activity, BarChart3 } from "lucide-react";
import { useRef } from "react";

const Hero = () => {
  const handleScrollToPricing = () => {
    const pricingSection = document.getElementById('pricing');
    if (pricingSection) {
      pricingSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"]
  });

  const y1 = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <section
      ref={ref}
      className="relative w-full min-h-[100vh] overflow-hidden bg-black"
    >
      {/* Animated Background Layers */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Gradient Mesh */}
        <motion.div
          style={{ y: y1, opacity }}
          className="absolute top-0 left-0 w-full h-full"
        >
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-purple/30 rounded-full blur-[120px] animate-pulse-glow" />
          <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-accent-violet/25 rounded-full blur-[100px] animate-pulse-glow delay-1000" />
          <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-accent-indigo/20 rounded-full blur-[90px] animate-pulse-glow delay-2000" />
        </motion.div>

        {/* Geometric Grid Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'linear-gradient(rgba(168, 85, 247, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(168, 85, 247, 0.1) 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }} />
        </div>

        {/* Noise Texture */}
        <div className="absolute inset-0 noise-texture" />
      </div>

      <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 lg:py-36">
        <div className="flex flex-col items-center max-w-6xl mx-auto">

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8 md:mb-12"
          >
            <span className="glass inline-flex px-6 py-3 rounded-full text-sm font-medium text-white glow-effect">
              <Activity className="w-4 h-4 mr-2 inline-block text-accent-purple" />
              Trainerize Enhanced Reporting
            </span>
          </motion.div>

          {/* Oversized Heading with Gradient Animation */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="font-display font-extrabold text-6xl xs:text-7xl sm:text-8xl lg:text-[140px] tracking-tight text-center mb-6 md:mb-8 leading-none"
          >
            <span className="gradient-text block">
              Focus on Clients,
            </span>
            <span className="text-white block mt-2">Not Data Entry</span>
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-lg xs:text-xl lg:text-2xl text-gray-300 leading-relaxed max-w-3xl text-center mb-12 md:mb-16 font-sans"
          >
            FitReport connects to Trainerize to provide enhanced analytics and automated reporting, so you can spend less time navigating data screens and more time helping clients achieve their fitness goals.
          </motion.p>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col xs:flex-row gap-4 xs:gap-6 w-full max-w-2xl justify-center mb-16 md:mb-20"
          >
            <button
              onClick={handleScrollToPricing}
              className="btn btn-gradient btn-lg w-full xs:w-auto min-h-[4rem] text-lg xs:text-xl px-12 font-semibold rounded-lg transform transition-all hover:scale-105"
            >
              Start Free Trial →
            </button>
          </motion.div>

          {/* Floating Data Visualization Cards */}
          <div className="relative w-full max-w-5xl mt-8 md:mt-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">

              {/* Card 1: Progress Tracking */}
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.8 }}
                style={{ y: y2 }}
                className="card-elevated p-6 rounded-2xl perspective-card"
              >
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-primary-start/10 rounded-lg">
                      <TrendingUp className="w-6 h-6 text-primary-start" />
                    </div>
                    <span className="text-xs font-mono text-gray-400">LIVE DATA</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm text-gray-400">Client Progress</span>
                      <span className="text-3xl font-mono font-bold text-primary-start">+24%</span>
                    </div>
                    <div className="h-2 bg-bg-secondary rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "75%" }}
                        transition={{ duration: 1.5, delay: 1.2 }}
                        className="h-full bg-gradient-to-r from-primary-start to-accent-purple rounded-full"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Avg. across all clients</p>
                  </div>
                </div>
              </motion.div>

              {/* Card 2: Active Clients */}
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1.0 }}
                className="card-elevated p-6 rounded-2xl perspective-card md:translate-y-8"
              >
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-accent-violet/10 rounded-lg">
                      <Activity className="w-6 h-6 text-accent-violet" />
                    </div>
                    <span className="text-xs font-mono text-gray-400">ACTIVE</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm text-gray-400">Active Clients</span>
                      <motion.span
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, delay: 1.4 }}
                        className="text-3xl font-mono font-bold text-accent-violet"
                      >
                        127
                      </motion.span>
                    </div>
                    <div className="flex gap-1 mt-3">
                      {[...Array(8)].map((_, i) => (
                        <motion.div
                          key={i}
                          initial={{ height: 0 }}
                          animate={{ height: `${Math.random() * 100 + 20}%` }}
                          transition={{ duration: 0.6, delay: 1.2 + i * 0.1 }}
                          className="flex-1 bg-gradient-to-t from-accent-violet/50 to-accent-violet rounded-sm"
                        />
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">+12 this week</p>
                  </div>
                </div>
              </motion.div>

              {/* Card 3: Reports Generated */}
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1.2 }}
                style={{ y: y2 }}
                className="card-elevated p-6 rounded-2xl perspective-card"
              >
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-accent-indigo/10 rounded-lg">
                      <BarChart3 className="w-6 h-6 text-accent-indigo" />
                    </div>
                    <span className="text-xs font-mono text-gray-400">AUTOMATED</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm text-gray-400">Reports</span>
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8, delay: 1.6 }}
                        className="text-3xl font-mono font-bold text-accent-indigo"
                      >
                        2.4K
                      </motion.span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      <div className="h-12 bg-accent-indigo/20 rounded flex items-end">
                        <div className="w-full h-8 bg-accent-indigo/60 rounded" />
                      </div>
                      <div className="h-12 bg-accent-indigo/20 rounded flex items-end">
                        <div className="w-full h-10 bg-accent-indigo/80 rounded" />
                      </div>
                      <div className="h-12 bg-accent-indigo/20 rounded flex items-end">
                        <div className="w-full h-full bg-accent-indigo rounded glow-purple" />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Generated this month</p>
                  </div>
                </div>
              </motion.div>

            </div>
          </div>

          {/* Scroll Indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 2 }}
            className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
          >
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center pt-2"
            >
              <div className="w-1 h-2 bg-white/60 rounded-full" />
            </motion.div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default Hero;
