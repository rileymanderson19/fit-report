"use client";

import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import config from "@/config";
import ButtonCheckout from "./ButtonCheckout";

// <Pricing/> displays the pricing plans for your app
// It's your Stripe config in config.js.stripe.plans[] that will be used to display the plans
// <ButtonCheckout /> renders a button that will redirect the user to Stripe checkout called the /api/stripe/create-checkout API endpoint with the correct priceId

const Pricing = () => {
  return (
    <section className="w-full overflow-hidden text-white bg-gradient-to-b from-black via-bg-secondary to-black relative" id="pricing">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent-purple/5 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col text-center w-full mb-20"
        >
          <h2 className="font-display font-bold text-5xl lg:text-6xl tracking-tight mb-4">
            Simple, <span className="gradient-text">Transparent</span> Pricing
          </h2>
          <p className="mt-4 text-xl text-gray-400">
            Choose the plan that works best for you
          </p>
        </motion.div>

        <div className="relative flex justify-center flex-col lg:flex-row items-center lg:items-stretch gap-8">
          {config.stripe.plans.map((plan, index) => (
            <motion.div
              key={plan.priceId}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              className="relative w-full max-w-lg"
            >
              {plan.isFeatured && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-primary-start to-accent-purple text-white text-xs font-bold shadow-lg">
                    <Sparkles className="w-3 h-3" />
                    SAVE 21%
                  </span>
                </div>
              )}

              {plan.isFeatured && (
                <div className="absolute -inset-[2px] rounded-2xl bg-gradient-to-r from-primary-start via-accent-purple to-accent-indigo opacity-75 blur-sm z-10 animate-pulse-glow"></div>
              )}

              <div className={`relative flex flex-col h-full gap-5 lg:gap-8 z-10 p-8 lg:p-10 rounded-2xl transition-all duration-300 ${
                plan.isFeatured
                  ? 'card-elevated border-2 border-accent-purple/50'
                  : 'card-elevated'
              }`}>
                <div className="flex justify-between items-center gap-4">
                  <div>
                    <p className="text-2xl lg:text-3xl font-display font-bold">{plan.name}</p>
                    {plan.description && (
                      <p className="text-gray-400 mt-2">
                        {plan.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex gap-2 items-end">
                    <p className={`text-6xl tracking-tight font-mono font-extrabold ${
                      plan.isFeatured ? 'gradient-text' : 'text-white'
                    }`}>
                      ${plan.price}
                    </p>
                    <div className="flex flex-col justify-end mb-3">
                      <p className="text-sm text-gray-400 font-semibold">
                        /mo
                      </p>
                    </div>
                  </div>

                  {plan.billingPeriod === "yearly" && (
                    <p className="text-sm text-gray-400">
                      Billed annually (${plan.price * 12})
                    </p>
                  )}

                  {plan.priceAnchor && (
                    <p className="text-sm text-gray-500">
                      <span className="line-through">${plan.priceAnchor}/mo</span>
                    </p>
                  )}
                </div>

                {plan.features && (
                  <ul className="space-y-4 leading-relaxed text-base flex-1">
                    {plan.features.map((feature, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: i * 0.1 }}
                        className="flex items-center gap-3"
                      >
                        <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                          plan.isFeatured
                            ? 'bg-accent-purple/20'
                            : 'bg-gray-700/50'
                        }`}>
                          <Check className={`w-3 h-3 ${
                            plan.isFeatured ? 'text-accent-purple' : 'text-gray-400'
                          }`} />
                        </div>
                        <span className="text-gray-300">{feature.name}</span>
                      </motion.li>
                    ))}
                  </ul>
                )}

                <div className="space-y-2 mt-4">
                  <ButtonCheckout
                    priceId={plan.priceId}
                    className={`btn btn-block ${
                      plan.isFeatured
                        ? 'btn-gradient text-lg font-semibold'
                        : 'glass border border-white/10 hover:border-accent-purple/50 text-white'
                    }`}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Additional info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 text-center"
        >
          <p className="text-gray-400 text-sm">
            All plans include a 14-day free trial. No credit card required.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default Pricing;
