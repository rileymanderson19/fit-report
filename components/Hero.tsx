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
    <section className="w-full bg-gradient-to-b from-[#1f1b2e] to-[#241f35] pt-4">
      <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row items-center justify-between gap-16 lg:gap-0 px-4 sm:px-6 lg:px-8 py-8 lg:py-24">
        <div className="w-full lg:w-[60%] flex flex-col gap-6 lg:gap-8 items-center justify-center text-center lg:text-left lg:items-start">
          <div className="flex flex-col gap-6">
            <span className="px-6 py-2.5 rounded-full bg-[#1A1A1A] border border-[#333333] text-sm text-gray-300 font-medium w-fit shadow-[0_0_15px_rgba(0,0,0,0.5)] glow-effect">
              Trainerize Enhanced Reporting
            </span>
            <h1 className="font-extrabold text-5xl lg:text-7xl tracking-tight">
              <span className="bg-gradient-to-r from-emerald-400 to-[#86b6c6] inline-block text-transparent bg-clip-text">Focus on Clients,</span>
              <br />
              <span className="text-white">Not Data Entry</span>
            </h1>
          </div>
          <p className="text-lg text-gray-300 leading-relaxed max-w-3xl">
            FitReport connects to Trainerize to provide enhanced analytics and automated reporting, so you can spend less time navigating data screens and more time helping clients achieve their fitness goals.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <button 
              className="btn btn-primary btn-wide text-lg text-white"
              onClick={handleScrollToPricing}
            >
              Start Free Trial →
            </button>
            <button className="btn btn-outline text-white border-white/20 hover:bg-white/10 btn-wide text-lg">
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
        <div className="w-full lg:w-[40%]">
          <Image
            src="/dashboard-preview.jpg"
            alt="FitReport's consolidated client dashboard showing nutrition, training, and progress metrics"
            className="w-full rounded-lg shadow-2xl"
            priority={true}
            width={600}
            height={600}
          />
        </div>
      </div>
    </section>
  );
};

export default Hero;
