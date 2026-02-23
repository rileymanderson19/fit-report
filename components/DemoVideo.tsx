"use client";

import { motion } from "framer-motion";
import { Calendar, ArrowRight } from "lucide-react";
import CalendlyButton from "@/components/CalendlyButton";

const DemoVideo = () => {
  return (
    <section className="w-full relative">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="flex flex-col items-center text-center"
      >
        <h2 className="text-4xl lg:text-5xl font-display font-bold tracking-tight mb-5 text-gray-900">
          Get <span className="gradient-text">Started</span>
        </h2>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed mb-8">
          Book a quick call and we&apos;ll walk you through setup, including getting your Trainerize API access.
        </p>
        <CalendlyButton className="group btn-primary px-8 py-3.5 text-lg font-semibold rounded-lg inline-flex items-center gap-2 transition-all hover:-translate-y-0.5 hover:shadow-lg">
          <Calendar className="w-5 h-5" />
          Book a Call
          <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
        </CalendlyButton>
      </motion.div>
    </section>
  );
};

export default DemoVideo;
