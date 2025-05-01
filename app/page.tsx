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
    <div className="relative min-h-screen">
      <Suspense>
        <Header />
      </Suspense>
      <Hero />
      <div className="bg-gradient-to-b from-[#241f35] to-black w-full">
        <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <GridFeatures />
          <HowItWorks />
          <Pricing />
          <FAQ />
          <CTA />
        </main>
        <Footer />
      </div>
    </div>
  )
}