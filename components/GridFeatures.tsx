"use client";

import { motion, useInView } from "framer-motion";
import { BarChart3, LineChart, Zap } from "lucide-react";
import { useRef, type ReactNode } from "react";

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  delay: number;
}

const FeatureCard = ({ icon, title, description, delay }: FeatureCardProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.6, delay }}
      className="card p-8 rounded-xl hover:shadow-md hover:-translate-y-1 transition-all duration-300"
    >
      <div className="mb-6">
        {icon}
      </div>
      <h3 className="mb-3 text-xl font-display font-bold text-gray-900">{title}</h3>
      <p className="text-base text-gray-500 leading-relaxed">{description}</p>
    </motion.div>
  );
};

export default function GridFeatures() {
  const features = [
    {
      icon: (
        <div className="p-3 bg-blue-50 rounded-xl inline-block">
          <BarChart3 className="h-7 w-7 text-blue-600" />
        </div>
      ),
      title: "Enhanced Analytics",
      description: "Transform Trainerize data into actionable insights with dashboards showing client progress at a glance.",
    },
    {
      icon: (
        <div className="p-3 bg-teal-50 rounded-xl inline-block">
          <LineChart className="h-7 w-7 text-teal-600" />
        </div>
      ),
      title: "Progress Tracking",
      description: "Visualize client progress over time with detailed charts and metrics that highlight improvements and identify areas needing attention.",
    },
    {
      icon: (
        <div className="p-3 bg-indigo-50 rounded-xl inline-block">
          <Zap className="h-7 w-7 text-indigo-600" />
        </div>
      ),
      title: "Instant Reporting",
      description: "Generate reports for clients automatically, saving hours of manual data compilation each week.",
    },
  ];

  return (
    <section className="w-full">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-14"
      >
        <h2 className="text-4xl lg:text-5xl font-display font-bold mb-5 tracking-tight text-gray-900">
          Features <span className="gradient-text">Trainers Love</span>
        </h2>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
          FitReport transforms your Trainerize data into powerful insights, helping you deliver better results with less administrative work.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature, index) => (
          <FeatureCard key={index} {...feature} delay={index * 0.15} />
        ))}
      </div>
    </section>
  );
}
