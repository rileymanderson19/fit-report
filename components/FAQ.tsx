"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import type { JSX } from "react";

interface FAQItemProps {
  question: string;
  answer: JSX.Element;
}

const faqList: FAQItemProps[] = [
  {
    question: "How does FitReport connect to Trainerize?",
    answer: (
      <p>
        You need a Trainerize API key. We give you the exact email template to send to Trainerize support — most coaches get access within a few days. Once you have it, paste it into FitReport and your full client roster syncs automatically.
      </p>
    ),
  },
  {
    question: "How long does setup take?",
    answer: (
      <p>
        Under 5 minutes once you have your API key. Connect your account, customize your branding, and generate your first report right away. We also offer a free setup call to walk you through everything.
      </p>
    ),
  },
  {
    question: "Can I customize reports with my branding?",
    answer: (
      <p>
        Yes. Add your logo, brand colors, and custom footer text. Every report looks like it came from your business, not ours. Your clients see your brand — FitReport stays in the background.
      </p>
    ),
  },
  {
    question: "What data does FitReport pull from Trainerize?",
    answer: (
      <p>
        Weight &amp; body metrics, workout history, nutrition tracking (calories, protein, carbs, fats), step counts, and progress photos. Everything your clients log in Trainerize flows into FitReport automatically — no manual data entry.
      </p>
    ),
  },
  {
    question: "Do my clients need to install anything?",
    answer: (
      <p>
        No. You generate the report and share it via link or download it as a PDF. Your clients don&apos;t need an account, an app, or a login. They just open the link and see their progress.
      </p>
    ),
  },
  {
    question: "What if I want to cancel?",
    answer: (
      <p>
        Cancel anytime — no contracts, no cancellation fees.
      </p>
    ),
  },
];

const FaqItem = ({ item }: { item: FAQItemProps }) => {
  const accordion = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <li>
      <button
        className="relative flex gap-2 items-center w-full py-5 text-lg font-semibold text-left border-t border-gray-200"
        onClick={(e) => {
          e.preventDefault();
          setIsOpen(!isOpen);
        }}
        aria-expanded={isOpen}
      >
        <span className={`flex-1 ${isOpen ? "text-blue-600" : "text-gray-900"}`}>
          {item.question}
        </span>
        <svg
          className="flex-shrink-0 w-4 h-4 ml-auto fill-current text-gray-400"
          viewBox="0 0 16 16"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            y="7"
            width="16"
            height="2"
            rx="1"
            className={`transform origin-center transition duration-200 ease-out ${
              isOpen && "rotate-180"
            }`}
          />
          <rect
            y="7"
            width="16"
            height="2"
            rx="1"
            className={`transform origin-center rotate-90 transition duration-200 ease-out ${
              isOpen && "rotate-180 hidden"
            }`}
          />
        </svg>
      </button>

      <div
        ref={accordion}
        className="transition-all duration-300 ease-in-out overflow-hidden"
        style={
          isOpen
            ? { maxHeight: accordion?.current?.scrollHeight, opacity: 1 }
            : { maxHeight: 0, opacity: 0 }
        }
      >
        <div className="pb-5 text-base text-gray-500 leading-relaxed">{item.answer}</div>
      </div>
    </li>
  );
};

const FAQ = () => {
  return (
    <section className="w-full" id="faq">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-10"
      >
        <h2 className="text-4xl lg:text-5xl font-display font-bold mb-5 tracking-tight text-gray-900">
          Frequently Asked <span className="gradient-text">Questions</span>
        </h2>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
          Everything you need to know before getting started.
        </p>
      </motion.div>

      <div className="max-w-3xl mx-auto">
        <ul>
          {faqList.map((item, i) => (
            <FaqItem key={i} item={item} />
          ))}
        </ul>
      </div>
    </section>
  );
};

export default FAQ;
