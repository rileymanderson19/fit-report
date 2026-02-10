import { Suspense } from 'react'
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import Pricing from "@/components/Pricing";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";
import GridFeatures from "@/components/GridFeatures";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-white">
      {/* Header */}
      <Suspense fallback={<div className="h-14 sm:h-16 bg-white" />}>
        <Header />
      </Suspense>

      {/* Hero section */}
      <div className="w-full">
        <Hero />
      </div>

      {/* Main content */}
      <div className="w-full">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Features section */}
          <div className="py-16 sm:py-20 lg:py-28">
            <GridFeatures />
          </div>

          {/* How it works */}
          <div
            id="how-it-works"
            className="scroll-mt-16 py-16 sm:py-20 lg:py-28"
          >
            <HowItWorks />
          </div>
        </main>

        {/* Pricing section — full width gray background */}
        <div
          id="pricing"
          className="scroll-mt-16 bg-gray-50 py-16 sm:py-20 lg:py-28"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Pricing />
          </div>
        </div>

        {/* CTA section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-28">
          <CTA />
        </div>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  )
}
