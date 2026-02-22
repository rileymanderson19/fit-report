'use client';

import { motion } from 'framer-motion';

export default function VideoSection() {
  return (
    <section className="w-full">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-10"
      >
        <h2 className="text-4xl lg:text-5xl font-display font-bold mb-5 tracking-tight text-gray-900">
          See It <span className="gradient-text">In Action</span>
        </h2>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
          Watch how FitReport turns your Trainerize data into a polished report in under 60 seconds.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="w-full max-w-4xl mx-auto"
      >
        <div className="rounded-2xl shadow-lg overflow-hidden">
          <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
            <iframe
              src="https://www.youtube.com/embed/CGNIn7suVgc?si=W7mP24F9ZPgpsvbk"
              title="FitReport Demo"
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
        </div>
      </motion.div>
    </section>
  );
}
