"use client";

import config from "@/config";

const CTA = () => {
  const handleScrollToPricing = () => {
    const pricingSection = document.getElementById('pricing');
    if (pricingSection) {
      pricingSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="w-full text-white">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="flex flex-col items-center max-w-[1000px] mx-auto text-center bg-[#1a1a1a] rounded-2xl p-12 lg:p-16">
          <h2 className="font-bold text-5xl lg:text-6xl tracking-tight mb-6">
            <span className="bg-gradient-to-r from-[#5B6AFF] to-[#A166AB] inline-block text-transparent bg-clip-text">Transform</span> how you track client progress
          </h2>
          <p className="text-lg lg:text-xl text-gray-400 mb-12 max-w-3xl leading-relaxed">
            Join thousands of fitness professionals who are saving time, improving client retention, and growing their businesses with FitReport.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <button 
              onClick={handleScrollToPricing}
              className="btn btn-primary btn-lg text-white"
            >
              Start Your Free Trial
              <span className="text-xl">→</span>
            </button>
          </div>
          
        </div>
      </div>
    </section>
  );
};

export default CTA;
