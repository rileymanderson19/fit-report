"use client";

import { motion } from "framer-motion";
import { ArrowRight, Check, Clock, DollarSign, Users, Sparkles } from "lucide-react";
import CalendlyButton from "@/components/CalendlyButton";

const features = [
  "Unlimited client reports",
  "AI-powered coaching notes",
  "Custom branding (logo, colors, footer)",
  "Client dashboard at a glance",
  "Weight, nutrition & workout tracking",
  "Progress photo comparisons",
  "Shareable links & PDF exports",
  "Priority support",
];

const plans = [
  {
    name: "Monthly",
    price: 100,
    period: "/mo",
    description: "Flexible month-to-month",
    featured: false,
  },
  {
    name: "Annual",
    price: 79,
    period: "/mo",
    description: "$948 billed annually",
    badge: "Save 21%",
    featured: true,
  },
];

const Pricing = () => {
  return (
    <section className="w-full" id="pricing">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-10"
      >
        <h2 className="text-4xl lg:text-5xl font-display font-bold mb-5 tracking-tight text-gray-900">
          Simple, <span className="gradient-text">Transparent Pricing</span>
        </h2>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
          One plan. Everything included. No hidden fees.
        </p>
      </motion.div>

      {/* Pricing Cards */}
      <div className="flex flex-col sm:flex-row justify-center gap-6 max-w-3xl mx-auto">
        {plans.map((plan, index) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: index * 0.15 }}
            className="relative flex-1 max-w-md"
          >
            {plan.badge && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-blue-600 text-white text-xs font-bold shadow-md">
                  <Sparkles className="w-3 h-3" />
                  {plan.badge}
                </span>
              </div>
            )}

            <div className={`h-full flex flex-col p-8 rounded-2xl transition-all ${
              plan.featured
                ? 'bg-white border-2 border-blue-600 shadow-lg shadow-blue-600/10'
                : 'bg-white border border-gray-200 shadow-sm'
            }`}>
              <h3 className="text-xl font-display font-bold text-gray-900 mb-1">{plan.name}</h3>
              <p className="text-sm text-gray-400 mb-6">{plan.description}</p>

              {/* Price */}
              <div className="flex items-baseline gap-1 mb-6">
                <span className={`text-5xl font-display font-bold ${plan.featured ? 'text-blue-600' : 'text-gray-900'}`}>
                  ${plan.price}
                </span>
                <span className="text-lg text-gray-500">{plan.period}</span>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8 flex-1">
                {features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className={`w-5 h-5 flex-shrink-0 mt-0.5 ${plan.featured ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span className="text-gray-700 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <CalendlyButton
                className={`w-full py-3.5 text-lg font-semibold rounded-lg transition-all hover:-translate-y-0.5 hover:shadow-lg inline-flex items-center justify-center gap-2 ${
                  plan.featured ? 'btn-primary' : 'btn-secondary'
                }`}
              >
                Get Started
                <ArrowRight className="w-5 h-5" />
              </CalendlyButton>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ROI Justification */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="mt-12 max-w-3xl mx-auto"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          <div className="flex flex-col items-center gap-2">
            <div className="p-3 bg-blue-50 rounded-xl">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-2xl font-display font-bold text-gray-900">5+ hrs/week</p>
            <p className="text-sm text-gray-500">Saved on client fulfillment</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="p-3 bg-blue-50 rounded-xl">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-2xl font-display font-bold text-gray-900">$1,000+/mo</p>
            <p className="text-sm text-gray-500">In time value recovered</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="p-3 bg-blue-50 rounded-xl">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-2xl font-display font-bold text-gray-900">Scale faster</p>
            <p className="text-sm text-gray-500">More clients, no extra admin</p>
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default Pricing;
