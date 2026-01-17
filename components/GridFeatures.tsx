"use client";

import { motion } from "framer-motion";
import { BarChart3, LineChart, Zap } from "lucide-react";
import { useInView } from "framer-motion";
import { useRef } from "react";

interface FeatureCardProps {
  icon: React.ReactNode;
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
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{ duration: 0.6, delay }}
      className="card-elevated p-8 rounded-2xl perspective-card transition-all duration-300"
    >
      <div className="relative z-10">
        <div className="mb-6">
          {icon}
        </div>
        <h3 className="mb-4 text-2xl font-display font-bold text-white">{title}</h3>
        <p className="text-lg text-gray-400 leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
};

export default function GridFeatures() {
  const features = [
    {
      icon: (
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-primary-start/20 rounded-xl blur-xl" />
          <div className="relative p-4 bg-gradient-to-br from-primary-start/10 to-accent-purple/10 rounded-xl border border-primary-start/20">
            <BarChart3 className="h-10 w-10 text-primary-start" />
          </div>
        </div>
      ),
      title: "Enhanced Analytics",
      description: "Transform Trainerize data into actionable insights with dashboards showing client progress at a glance.",
    },
    {
      icon: (
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-accent-violet/20 rounded-xl blur-xl" />
          <div className="relative p-4 bg-gradient-to-br from-accent-violet/10 to-accent-purple/10 rounded-xl border border-accent-violet/20">
            <LineChart className="h-10 w-10 text-accent-violet" />
          </div>
        </div>
      ),
      title: "Progress Tracking",
      description: "Visualize client progress over time with detailed charts and metrics that highlight improvements and identify areas needing attention.",
    },
    {
      icon: (
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-accent-indigo/20 rounded-xl blur-xl" />
          <div className="relative p-4 bg-gradient-to-br from-accent-indigo/10 to-accent-purple/10 rounded-xl border border-accent-indigo/20">
            <Zap className="h-10 w-10 text-accent-indigo" />
          </div>
        </div>
      ),
      title: "Instant Reporting",
      description: "Generate reports for clients automatically, saving hours of manual data compilation each week.",
    },
  ];

  return (
    <section className="w-full py-16 lg:py-24 bg-gradient-to-b from-black via-bg-secondary to-black">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-5xl lg:text-6xl font-display font-bold mb-6 tracking-tight">
            <span className="gradient-text">Features</span>{" "}
            <span className="text-white">Trainers Love</span>
          </h2>
          <p className="text-lg lg:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            FitReport transforms your Trainerize data into powerful insights, helping you deliver better results with less administrative work.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
          {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} delay={index * 0.2} />
          ))}
        </div>
      </div>
    </section>
  );
}
