"use client";

import Image from "next/image";
// import TestimonialsAvatars from "./TestimonialsAvatars";
// import config from "@/config";

const Hero = () => {
  const handleScrollToPricing = () => {
    const pricingSection = document.getElementById('pricing');
    if (pricingSection) {
      pricingSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="bg-gradient-to-b from-[#1f1b2e] to-[#241f35] pt-4">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-center gap-16 lg:gap-20 px-8 py-8 lg:py-20">
        <div className="flex flex-col gap-10 lg:gap-14 items-center justify-center text-center lg:text-left lg:items-start">
          <div className="flex flex-col gap-6">
            <span className="px-4 py-2 rounded-full bg-[#2a2937] text-sm text-gray-300 font-medium w-fit">
              Trainerize Enhanced Reporting
            </span>
            <h1 className="font-extrabold text-4xl lg:text-6xl tracking-tight">
              <span className="bg-gradient-to-r from-emerald-400 to-[#86b6c6] inline-block text-transparent bg-clip-text">Focus on Clients,</span>
              <br />
              <span className="text-white">Not Data Entry</span>
            </h1>
          </div>
          <p className="text-lg text-gray-300 leading-relaxed max-w-2xl">
            FitReport connects to Trainerize to provide enhanced analytics and automated reporting, so you can spend less time navigating data screens and more time helping clients achieve their fitness goals.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <button 
              className="btn btn-primary btn-wide"
              onClick={handleScrollToPricing}
            >
              Start Free Trial →
            </button>
            <button className="btn btn-outline text-white border-white/20 hover:bg-white/10 btn-wide">
              Watch Demo
            </button>
          </div>

          {/* <div className="flex flex-col items-center lg:items-start gap-3">
            <TestimonialsAvatars priority={true} />
            <div className="flex flex-col items-center lg:items-start gap-1">
              <p className="text-sm opacity-70">Trusted by 1000+ fitness professionals</p>
              <p className="text-sm opacity-70">Average 4 hours saved per week on client reporting</p>
            </div>
          </div> */}
        </div>
        <div className="lg:w-full">
          <Image
            src="/dashboard-preview.jpg"
            alt="FitReport's consolidated client dashboard showing nutrition, training, and progress metrics"
            className="w-full rounded-lg shadow-2xl"
            priority={true}
            width={500}
            height={500}
          />
        </div>
      </div>
    </section>
  );
};

export default Hero;
