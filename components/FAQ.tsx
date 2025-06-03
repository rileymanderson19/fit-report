"use client";

import { useRef, useState } from "react";
import type { JSX } from "react";

// <FAQ> component is a lsit of <Item> component
// Just import the FAQ & add your FAQ content to the const faqList arrayy below.

interface FAQItemProps {
  question: string;
  answer: JSX.Element;
}

const faqList: FAQItemProps[] = [
  {
    question: "How does FitReport help me track progress?",
    answer: (
      <div className="space-y-2 leading-relaxed">
        <p>FitReport automatically tracks and visualizes key metrics including:</p>
        <ul className="list-disc pl-4">
          <li>Strength progression across exercises</li>
          <li>Body measurements and composition changes</li>
          <li>Workout volume and intensity trends</li>
          <li>Personal records and milestones</li>
        </ul>
        <p>All your data is presented in easy-to-understand charts and reports, making it simple to spot trends and make informed decisions about your training.</p>
      </div>
    ),
  },
  {
    question: "I'm a personal trainer. How can FitReport help my business?",
    answer: (
      <div className="space-y-2 leading-relaxed">
        <p>FitReport provides powerful tools for trainers:</p>
        <ul className="list-disc pl-4">
          <li>Manage multiple clients from a single dashboard</li>
          <li>Create and assign personalized workout plans</li>
          <li>Track client progress and generate professional reports</li>
          <li>Communicate with clients through the built-in messaging system</li>
          <li>Schedule sessions and manage your calendar</li>
        </ul>
        <p>This helps you save time on admin work and focus more on what matters - helping your clients achieve their goals.</p>
      </div>
    ),
  },
  {
    question: "Can I import data from other fitness apps?",
    answer: (
      <div className="space-y-2 leading-relaxed">
        <p>Yes! FitReport supports importing data from popular fitness apps and devices including:</p>
        <ul className="list-disc pl-4">
          <li>Apple Health</li>
          <li>Google Fit</li>
          <li>Strava</li>
          <li>MyFitnessPal</li>
          <li>Most major fitness wearables</li>
        </ul>
        <p>This means you can keep your existing workout history while transitioning to FitReport.</p>
      </div>
    ),
  },
  {
    question: "Is there a free trial available?",
    answer: (
      <p>
        Yes! We offer a 7-day free trial with full access to all features. No credit card required. You can upgrade to a paid plan at any time during or after your trial.
      </p>
    ),
  },
  {
    question: "What kind of support do you offer?",
    answer: (
      <div className="space-y-2 leading-relaxed">
        <p>We provide comprehensive support to ensure your success:</p>
        <ul className="list-disc pl-4">
          <li>24/7 email support</li>
          <li>Live chat during business hours</li>
          <li>Detailed documentation and video tutorials</li>
          <li>Regular webinars for trainers</li>
          <li>Private Facebook community for users</li>
        </ul>
      </div>
    ),
  },
];

const FaqItem = ({ item }: { item: FAQItemProps }) => {
  const accordion = useRef(null);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <li>
      <button
        className="relative flex gap-2 items-center w-full py-5 text-lg font-semibold text-left border-t border-base-content/10"
        onClick={(e) => {
          e.preventDefault();
          setIsOpen(!isOpen);
        }}
        aria-expanded={isOpen}
      >
        <span
          className={`flex-1 text-base-content ${isOpen ? "text-emerald-400" : ""}`}
        >
          {item?.question}
        </span>
        <svg
          className={`flex-shrink-0 w-4 h-4 ml-auto fill-current`}
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
        className={`transition-all duration-300 ease-in-out opacity-80 overflow-hidden`}
        style={
          isOpen
            ? { maxHeight: accordion?.current?.scrollHeight, opacity: 1 }
            : { maxHeight: 0, opacity: 0 }
        }
      >
        <div className="pb-5 text-lg text-gray-400 leading-relaxed">{item?.answer}</div>
      </div>
    </li>
  );
};

const FAQ = () => {
  return (
    <section className="w-full text-white" id="faq">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="flex flex-col md:flex-row gap-12">
          <div className="flex flex-col text-left basis-1/2">
            <p className="inline-block font-semibold text-[#5B6AFF] text-lg mb-4">FAQ</p>
            <h2 className="text-5xl lg:text-6xl font-bold tracking-tight">
              Frequently Asked Questions
            </h2>
          </div>

          <ul className="basis-1/2">
            {faqList.map((item, i) => (
              <FaqItem key={i} item={item} />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
