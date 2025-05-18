import { Suspense } from 'react'
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import Pricing from "@/components/Pricing";
import FAQ from "@/components/FAQ";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";
import GridFeatures from "@/components/GridFeatures";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Header with mobile-optimized loading state */}
      <Suspense fallback={<div className="h-14 sm:h-16 bg-[#1f1b2e]" />}>
        <Header />
      </Suspense>

      {/* Hero section */}
      <div className="w-full">
        <Hero />
      </div>

      {/* Main content with mobile-first spacing */}
      <div className="bg-gradient-to-b from-[#241f35] to-black w-full">
        <main className="max-w-[1600px] mx-auto px-3 xs:px-4 sm:px-6 lg:px-8">
          {/* Features section - reduced spacing on mobile */}
          <div className="py-8 xs:py-12 sm:py-16 lg:py-24">
            <GridFeatures />
          </div>
          
          {/* How it works - optimized scroll margins */}
          <div 
            id="how-it-works" 
            className="scroll-mt-14 sm:scroll-mt-16 py-8 xs:py-12 sm:py-16 lg:py-24"
          >
            <HowItWorks />
          </div>
          
          {/* Pricing section - improved mobile spacing */}
          <div 
            id="pricing" 
            className="scroll-mt-14 sm:scroll-mt-16 py-8 xs:py-12 sm:py-16 lg:py-24"
          >
            <Pricing />
          </div>
          
          {/* FAQ section - better mobile readability
          <div 
            id="faq" 
            className="scroll-mt-14 sm:scroll-mt-16 py-8 xs:py-12 sm:py-16 lg:py-24"
          >
            <FAQ />
          </div> */}
          
          {/* CTA section - mobile-optimized margins */}
          <div className="py-8 xs:py-12 sm:py-16 lg:py-24">
            <CTA />
          </div>
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  )
}