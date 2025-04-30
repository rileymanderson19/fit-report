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
          <h1 className="font-extrabold text-4xl lg:text-6xl tracking-tight md:-mb-4">
            Cut your client reporting time in half
          </h1>
          <p className="text-lg opacity-80 leading-relaxed">
            FitReport consolidates all your client data into one powerful dashboard. Stop jumping between screens and start delivering better insights in less time.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <button 
              className="btn btn-primary btn-wide"
              onClick={handleScrollToPricing}
            >
              Start Free Trial
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
