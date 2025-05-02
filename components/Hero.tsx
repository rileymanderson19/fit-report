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
    <section className="w-full bg-gradient-to-b from-[#1f1b2e] to-[#241f35] pt-4 md:pt-8">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16 lg:py-24">
        {/* Mobile-first content layout */}
        <div className="flex flex-col lg:flex-row items-center lg:items-start lg:justify-between gap-8 lg:gap-16">
          {/* Content section */}
          <div className="w-full lg:w-[55%] flex flex-col gap-6 text-center lg:text-left">
            {/* Badge */}
            <div className="flex justify-center lg:justify-start">
              <span className="inline-flex px-4 py-2 rounded-full bg-[#1A1A1A] border border-[#333333] text-sm font-medium text-gray-300 shadow-[0_0_15px_rgba(0,0,0,0.5)] glow-effect">
                Trainerize Enhanced Reporting
              </span>
            </div>

            {/* Heading */}
            <h1 className="font-extrabold text-4xl xs:text-5xl md:text-6xl lg:text-7xl tracking-tight">
              <span className="bg-gradient-to-r from-[#5B6AFF] to-[#A166AB] inline-block text-transparent bg-clip-text leading-tight">
                Focus on Clients,
              </span>
              <br />
              <span className="text-white leading-tight">Not Data Entry</span>
            </h1>

            {/* Description */}
            <p className="text-base xs:text-lg text-gray-300 leading-relaxed max-w-2xl mx-auto lg:mx-0">
              FitReport connects to Trainerize to provide enhanced analytics and automated reporting, so you can spend less time navigating data screens and more time helping clients achieve their fitness goals.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col xs:flex-row gap-3 xs:gap-4 justify-center lg:justify-start mt-2">
              <button 
                onClick={handleScrollToPricing}
                className="btn btn-primary btn-lg w-full xs:w-auto text-white min-h-[3.5rem] text-base xs:text-lg"
              >
                Start Free Trial →
              </button>
              <button className="btn btn-outline btn-lg w-full xs:w-auto text-white border-white/20 hover:bg-white/10 min-h-[3.5rem] text-base xs:text-lg">
                Watch Demo
              </button>
            </div>
          </div>

          {/* Image section - hidden on very small screens */}
          <div className="w-full lg:w-[45%] mt-8 lg:mt-0">
            <div className="relative aspect-[4/3] xs:aspect-[16/12] lg:aspect-square w-full max-w-xl mx-auto">
              <Image
                src="/dashboard-preview.jpg"
                alt="FitReport's consolidated client dashboard showing nutrition, training, and progress metrics"
                className="rounded-xl shadow-2xl object-cover"
                priority={true}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 40vw"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
