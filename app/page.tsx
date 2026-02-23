import { Suspense } from 'react'
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";
import GridFeatures from "@/components/GridFeatures";
import HeroProductPreview from "@/components/landing/HeroProductPreview";
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

      {/* Product Preview — overlaps hero gradient */}
      <div className="relative z-10 -mt-16 sm:-mt-24 lg:-mt-32 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 sm:pb-20 lg:pb-28">
        <div className="rounded-2xl overflow-hidden border border-gray-200/80 bg-gray-100 shadow-xl ring-1 ring-black/5">
          {/* Browser window chrome */}
          <div className="flex items-center gap-3 px-4 py-3 bg-gray-100 border-b border-gray-200/60">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
              <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
              <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
            </div>
            <div className="flex-1">
              <div className="bg-white/80 rounded-lg px-3 py-1 text-xs text-gray-400 text-center max-w-xs mx-auto">
                app.fitreport.co/reports/timmy-r
              </div>
            </div>
          </div>
          {/* Report content */}
          <div className="bg-white">
            <HeroProductPreview />
          </div>
        </div>
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
