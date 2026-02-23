"use client";

import { motion } from "framer-motion";
import { Key, Link2, FileText } from "lucide-react";

const colorMap = {
  blue: {
    bgLight: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-600",
    iconBg: "bg-blue-50",
  },
  teal: {
    bgLight: "bg-teal-50",
    border: "border-teal-200",
    text: "text-teal-600",
    iconBg: "bg-teal-50",
  },
  indigo: {
    bgLight: "bg-indigo-50",
    border: "border-indigo-200",
    text: "text-indigo-600",
    iconBg: "bg-indigo-50",
  },
} as const;

const steps = [
  {
    title: "Get Your API Key",
    description: "We give you the exact email template to send Trainerize. Copy, paste, send. Most coaches get their key within 48 hours.",
    number: "01",
    icon: Key,
    color: "blue" as const,
  },
  {
    title: "Connect Your Account",
    description: "Paste your API key, and every client in your Trainerize account appears instantly. Workout history, nutrition, body metrics \u2014 all synced.",
    number: "02",
    icon: Link2,
    color: "teal" as const,
  },
  {
    title: "Generate Reports in Seconds",
    description: "Pick a client, hit generate, and get a professional branded report with charts, AI notes, and progress photos. Share via link or PDF.",
    number: "03",
    icon: FileText,
    color: "indigo" as const,
  },
];

const HowItWorks = () => {

  return (
    <section className="w-full relative">
      <div className="relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col text-center mb-14"
        >
          <h2 className="text-4xl lg:text-5xl font-display font-bold tracking-tight mb-5 text-gray-900">
            Live in Under <span className="gradient-text">5 Minutes</span>
          </h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
            No integrations to build, no data to enter. Three steps and you&apos;re generating reports.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative max-w-4xl mx-auto">
          {/* Connection Line — Desktop */}
          <div className="hidden md:block absolute top-0 left-1/2 transform -translate-x-1/2 h-full w-px">
            <div className="w-full h-full bg-gradient-to-b from-transparent via-gray-200 to-transparent" />
          </div>

          {/* Steps Container */}
          <div className="relative flex flex-col gap-10 md:gap-16">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const colors = colorMap[step.color];
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6, delay: index * 0.15 }}
                  className={`flex flex-col md:flex-row items-center gap-6 md:gap-10 ${
                    index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                  }`}
                >
                  {/* Number Badge */}
                  <div className="relative flex-shrink-0">
                    <div className={`relative w-20 h-20 md:w-24 md:h-24 rounded-full ${colors.bgLight} border ${colors.border} flex items-center justify-center`}>
                      <span className={`text-3xl md:text-4xl font-mono font-bold ${colors.text}`}>
                        {step.number}
                      </span>
                    </div>
                  </div>

                  {/* Content Card */}
                  <div className="flex-1 card p-6 md:p-8 rounded-xl text-center md:text-left">
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-4">
                      <div className={`p-3 ${colors.iconBg} rounded-xl`}>
                        <Icon className={`w-6 h-6 ${colors.text}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl md:text-2xl font-display font-bold mb-2 text-gray-900">
                          {step.title}
                        </h3>
                        <p className="text-base text-gray-500 leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    </div>

                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
};

export default HowItWorks;
