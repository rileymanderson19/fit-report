"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const CTA = () => {
  const handleScrollToPricing = () => {
    const pricingSection = document.getElementById('pricing');
    if (pricingSection) {
      pricingSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="w-full relative">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="flex flex-col items-center max-w-4xl mx-auto text-center bg-gray-50 border border-gray-200 p-10 lg:p-16 rounded-2xl"
      >
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="font-display font-bold text-4xl lg:text-5xl tracking-tight mb-5 text-gray-900"
        >
          <span className="gradient-text">Transform</span> how you track client progress
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-lg text-gray-500 mb-10 max-w-2xl leading-relaxed"
        >
          Join thousands of fitness professionals who are saving time, improving client retention, and growing their businesses with FitReport.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <button
            onClick={handleScrollToPricing}
            className="group btn-primary px-8 py-3.5 text-lg font-semibold rounded-lg inline-flex items-center gap-2 transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            Start Your Free Trial
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-10 flex flex-wrap justify-center gap-6 text-sm text-gray-400"
        >
          {["14-day free trial", "No credit card required", "Cancel anytime"].map((text) => (
            <div key={text} className="flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>{text}</span>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
};

export default CTA;
