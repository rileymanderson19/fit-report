"use client";

import { motion } from "framer-motion";
import { ArrowRight, Calendar, Check } from "lucide-react";

// TODO: Replace with your actual Calendly link
const CALENDLY_URL = "https://calendly.com/fitreport/demo";

const CTA = () => {
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
          Let&apos;s Get You <span className="gradient-text">Set Up</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-lg text-gray-500 mb-10 max-w-2xl leading-relaxed"
        >
          Book a 15-minute call. We&apos;ll walk you through the product, help you get API access, and have you generating reports the same week.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <a
            href={CALENDLY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group btn-primary px-8 py-3.5 text-lg font-semibold rounded-lg inline-flex items-center gap-2 transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            <Calendar className="w-5 h-5" />
            Book a Call
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-10 flex flex-wrap justify-center gap-6 text-sm text-gray-400"
        >
          {["15-minute setup call", "We handle Trainerize API access", "Generating reports within a week"].map((text) => (
            <div key={text} className="flex items-center gap-2">
              <Check className="w-4 h-4 text-blue-600" />
              <span>{text}</span>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
};

export default CTA;
