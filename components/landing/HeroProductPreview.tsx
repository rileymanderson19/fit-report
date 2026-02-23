'use client';

import { motion } from 'framer-motion';
import FullReportPreview from './FullReportPreview';

export default function HeroProductPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.4 }}
    >
      <FullReportPreview />
    </motion.div>
  );
}
