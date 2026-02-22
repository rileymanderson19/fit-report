import { Suspense } from 'react'
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";
import GridFeatures from "@/components/GridFeatures";
import VideoSection from "@/components/landing/VideoSection";
import Pricing from "@/components/Pricing";
import FAQ from "@/components/FAQ";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-white">
      {/* Header */}
      <Suspense fallback={<div className="h-14 sm:h-16 bg-white" />}>
        <Header />
      </Suspense>

      {/* Hero */}
      <div className="w-full">
        <Hero />
      </div>

      {/* Features — gray background */}
      <div className="bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-28">
          <GridFeatures />
        </div>
      </div>

      {/* Video Section — white background, tighter spacing */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          id="demo-video"
          className="scroll-mt-16 py-12 sm:py-16 lg:py-20"
        >
          <VideoSection />
        </div>
      </div>

      {/* How it works — gray background */}
      <div className="bg-gray-50">
        <div
          id="how-it-works"
          className="scroll-mt-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-28"
        >
          <HowItWorks />
        </div>
      </div>

      {/* Pricing — white background */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-28">
        <Pricing />
      </div>

      {/* FAQ — white background, tighter spacing */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <FAQ />
      </div>

      {/* CTA — gray background */}
      <div className="bg-gray-50 py-16 sm:py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <CTA />
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  )
}
