"use client";

import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import config from "@/config";
import ButtonCheckout from "./ButtonCheckout";

const Pricing = () => {
  return (
    <section className="w-full" id="pricing">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="flex flex-col text-center w-full mb-16"
      >
        <h2 className="font-display font-bold text-4xl lg:text-5xl tracking-tight mb-4 text-gray-900">
          Simple, <span className="gradient-text">Transparent</span> Pricing
        </h2>
        <p className="mt-2 text-lg text-gray-500">
          Choose the plan that works best for you
        </p>
      </motion.div>

      <div className="relative flex justify-center flex-col lg:flex-row items-center lg:items-stretch gap-8">
        {config.stripe.plans.map((plan, index) => (
          <motion.div
            key={plan.priceId}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: index * 0.15 }}
            className="relative w-full max-w-lg"
          >
            {plan.isFeatured && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-blue-600 text-white text-xs font-bold shadow-md">
                  <Sparkles className="w-3 h-3" />
                  SAVE 21%
                </span>
              </div>
            )}

            <div className={`relative flex flex-col h-full gap-5 lg:gap-8 z-10 p-8 lg:p-10 rounded-xl transition-all duration-300 ${
              plan.isFeatured
                ? 'bg-white border-2 border-blue-600 shadow-lg shadow-blue-600/10'
                : 'bg-white border border-gray-200 shadow-sm'
            }`}>
              <div className="flex justify-between items-center gap-4">
                <div>
                  <p className="text-2xl lg:text-3xl font-display font-bold text-gray-900">{plan.name}</p>
                  {plan.description && (
                    <p className="text-gray-500 mt-2">
                      {plan.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex gap-2 items-end">
                  <p className={`text-5xl tracking-tight font-mono font-extrabold ${
                    plan.isFeatured ? 'text-blue-600' : 'text-gray-900'
                  }`}>
                    ${plan.price}
                  </p>
                  <div className="flex flex-col justify-end mb-2">
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
                  <p className="text-sm text-gray-400">
                    <span className="line-through">${plan.priceAnchor}/mo</span>
                  </p>
                )}
              </div>

              {plan.features && (
                <ul className="space-y-3.5 leading-relaxed text-base flex-1">
                  {plan.features.map((feature, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: i * 0.08 }}
                      className="flex items-center gap-3"
                    >
                      <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                        plan.isFeatured ? 'bg-blue-100' : 'bg-gray-100'
                      }`}>
                        <Check className={`w-3 h-3 ${
                          plan.isFeatured ? 'text-blue-600' : 'text-gray-500'
                        }`} />
                      </div>
                      <span className="text-gray-600">{feature.name}</span>
                    </motion.li>
                  ))}
                </ul>
              )}

              <div className="space-y-2 mt-4">
                <ButtonCheckout
                  priceId={plan.priceId}
                  className={`w-full rounded-lg py-3 font-semibold ${
                    plan.isFeatured
                      ? 'btn-primary text-lg'
                      : 'btn-secondary'
                  }`}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="mt-12 text-center"
      >
        <p className="text-gray-400 text-sm">
          All plans include a 14-day free trial. No credit card required.
        </p>
      </motion.div>
    </section>
  );
};

export default Pricing;
