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
    <section className="w-full bg-gradient-to-b from-[#1f1b2e] to-[#241f35] pt-8 md:pt-12 lg:pt-16">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 lg:py-32">
        {/* Centered content layout */}
        <div className="flex flex-col items-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="mb-8 md:mb-12 animate-fade-in">
            <span className="inline-flex px-4 py-2 rounded-full bg-[#1A1A1A] border border-[#333333] text-sm font-medium text-gray-300 shadow-[0_0_15px_rgba(0,0,0,0.5)] glow-effect">
              Trainerize Enhanced Reporting
            </span>
          </div>

          {/* Heading */}
          <h1 className="font-extrabold text-5xl xs:text-6xl sm:text-7xl lg:text-8xl tracking-tight text-center mb-8 md:mb-12">
            <span className="bg-gradient-to-r from-[#5B6AFF] to-[#A166AB] inline-block text-transparent bg-clip-text leading-tight">
              Focus on Clients,
            </span>
            <br />
            <span className="text-white leading-tight">Not Data Entry</span>
          </h1>

          {/* Description */}
          <p className="text-lg xs:text-xl lg:text-2xl text-gray-300 leading-relaxed max-w-3xl text-center mb-12 md:mb-16">
            FitReport connects to Trainerize to provide enhanced analytics and automated reporting, so you can spend less time navigating data screens and more time helping clients achieve their fitness goals.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col xs:flex-row gap-4 xs:gap-6 w-full max-w-2xl justify-center">
            <button 
              onClick={handleScrollToPricing}
              className="btn btn-primary btn-lg w-full xs:w-auto text-white min-h-[4rem] text-lg xs:text-xl px-12 transform transition-transform hover:scale-105"
            >
              Start Free Trial →
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
