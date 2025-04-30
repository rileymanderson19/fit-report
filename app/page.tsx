import { Suspense } from 'react'
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Problem from "@/components/Problem";
import HowItWorks from "@/components/HowItWorks";
import FeaturesAccordion from "@/components/FeaturesAccordion";
import Pricing from "@/components/Pricing";
import FAQ from "@/components/FAQ";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="relative">
      <Suspense>
        <Header />
      </Suspense>
      <Hero />
      <div className="bg-gradient-to-b from-[#241f35] to-black">
        <main>
          <Problem />
          <HowItWorks />
          <FeaturesAccordion />
          <Pricing />
          <FAQ />
          <CTA />
        </main>
        <Footer />
      </div>
    </div>
  )
}