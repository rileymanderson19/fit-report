"use client";

import { motion, useInView } from "framer-motion";
import { BarChart3, LineChart, Zap } from "lucide-react";
import { useRef, type ReactNode } from "react";
import { ClientDashboardMini, WeightChartMini, WeeklyReportMini } from "@/components/landing/FeatureVisuals";

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  visual: ReactNode;
  delay: number;
}

const FeatureCard = ({ icon, title, description, visual, delay }: FeatureCardProps) => {
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
      {visual}
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
      title: "Spot At-Risk Clients in Seconds",
      description: "Stop clicking through 30 Trainerize profiles every Monday. One dashboard flags who\u2019s slipping, who\u2019s crushing it, and who hasn\u2019t logged in a week.",
      visual: <ClientDashboardMini />,
    },
    {
      icon: (
        <div className="p-3 bg-teal-50 rounded-xl inline-block">
          <LineChart className="h-7 w-7 text-teal-600" />
        </div>
      ),
      title: "Premium Reports Without the Design Degree",
      description: "Branded progress reports with charts, photos, and AI coaching notes. Your clients think you spent an hour on it. You spent 30 seconds.",
      visual: <WeightChartMini />,
    },
    {
      icon: (
        <div className="p-3 bg-indigo-50 rounded-xl inline-block">
          <Zap className="h-7 w-7 text-indigo-600" />
        </div>
      ),
      title: "Get Your Sundays Back",
      description: "One click pulls workout data, nutrition logs, weight trends, and progress photos from Trainerize. No copying, no spreadsheets, no 4-hour admin sessions.",
      visual: <WeeklyReportMini />,
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
          Everything Trainerize <span className="gradient-text">Doesn&apos;t Give You</span>
        </h2>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
          Trainerize stores your clients&apos; data. FitReport makes it useful &mdash; so you coach more and admin less.
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
