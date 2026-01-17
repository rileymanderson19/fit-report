"use client";

import { motion } from "framer-motion";
import { Link2, Users, FileText } from "lucide-react";

const steps = [
  {
    title: "Connect Your Account",
    description: "Link FitReport to your existing Trainerize account with our secure one-click integration.",
    number: "01",
    icon: Link2,
    color: "primary-start"
  },
  {
    title: "Import Your Clients",
    description: "Import your clients from Trainerize.",
    number: "02",
    icon: Users,
    color: "accent-violet"
  },
  {
    title: "Generate Reports",
    description: "Generate enhanced reports to provide better insights to your clients, and save you time.",
    number: "03",
    icon: FileText,
    color: "accent-indigo"
  }
];

const HowItWorks = () => {
  const handleScrollToPricing = () => {
    const pricingSection = document.getElementById('pricing');
    if (pricingSection) {
      pricingSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="how-it-works" className="w-full text-white py-16 md:py-24 lg:py-32 bg-gradient-to-b from-black via-bg-secondary to-black relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-accent-purple/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-0 w-96 h-96 bg-accent-violet/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col text-center mb-16 md:mb-24"
        >
          <h2 className="text-4xl xs:text-5xl md:text-6xl lg:text-7xl font-display font-bold tracking-tight mb-6 md:mb-8">
            How It <span className="gradient-text">Works</span>
          </h2>
          <p className="text-lg xs:text-xl lg:text-2xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
            Get started in minutes and see immediate improvements in your reporting workflow.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative max-w-6xl mx-auto">
          {/* Connection Lines - Desktop */}
          <div className="hidden md:block absolute top-0 left-1/2 transform -translate-x-1/2 h-full w-1">
            <svg className="w-full h-full" style={{ overflow: 'visible' }}>
              <motion.line
                x1="50%"
                y1="0"
                x2="50%"
                y2="100%"
                stroke="url(#gradient)"
                strokeWidth="2"
                strokeDasharray="8 8"
                initial={{ pathLength: 0, opacity: 0 }}
                whileInView={{ pathLength: 1, opacity: 0.3 }}
                viewport={{ once: true }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0" />
                  <stop offset="50%" stopColor="#A855F7" stopOpacity="1" />
                  <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Steps Container */}
          <div className="relative flex flex-col gap-12 md:gap-20">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                  className={`flex flex-col md:flex-row items-center gap-8 ${
                    index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                  }`}
                >
                  {/* Number Badge */}
                  <div className="relative flex-shrink-0">
                    <div className={`absolute inset-0 bg-${step.color}/20 rounded-full blur-xl`} />
                    <div className={`relative w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-${step.color}/20 to-transparent border-2 border-${step.color}/30 flex items-center justify-center`}>
                      <span className={`text-4xl md:text-5xl font-mono font-bold text-${step.color}`}>
                        {step.number}
                      </span>
                    </div>
                  </div>

                  {/* Content Card */}
                  <div className={`flex-1 card-elevated p-8 md:p-10 rounded-2xl perspective-card text-center md:text-left`}>
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                      {/* Icon */}
                      <div className={`p-4 bg-${step.color}/10 rounded-xl border border-${step.color}/20`}>
                        <Icon className={`w-8 h-8 text-${step.color}`} />
                      </div>

                      {/* Text Content */}
                      <div className="flex-1">
                        <h3 className="text-2xl xs:text-3xl lg:text-4xl font-display font-bold mb-4">
                          {step.title}
                        </h3>
                        <p className="text-lg text-gray-400 leading-relaxed">
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

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex justify-center mt-16 md:mt-24"
        >
          <button
            onClick={handleScrollToPricing}
            className="btn btn-gradient btn-lg w-full xs:w-auto min-h-[4rem] text-lg xs:text-xl px-12 font-semibold rounded-lg transform transition-all hover:scale-105"
          >
            Try FitReport Now →
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorks;
