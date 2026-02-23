'use client';

import { motion } from 'framer-motion';
import { Clock, Zap, ShieldCheck } from 'lucide-react';

const stats = [
  { icon: Clock, value: '5+ hrs/week', label: 'Saved on admin' },
  { icon: Zap, value: '30 seconds', label: 'Per report generated' },
  { icon: ShieldCheck, value: 'Zero', label: 'Manual data entry' },
];

export default function TrustBar() {
  return (
    <section className="relative z-10 bg-white border-b border-gray-200/60">
      <div className="py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm font-medium text-gray-400 uppercase tracking-wider mb-8">
            Built exclusively for Trainerize coaches
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-12 lg:gap-16">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-lg font-display font-bold text-gray-900">{stat.value}</p>
                    <p className="text-xs text-gray-500">{stat.label}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
