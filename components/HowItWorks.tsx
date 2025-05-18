"use client";

const steps = [
  {
    title: "Connect Your Account",
    description: "Link FitReport to your existing Trainerize account with our secure one-click integration.",
    number: "01"
  },
  {
    title: "Import Your Clients",
    description: "Import your clients from Trainerize.",
    number: "02"
  },
  {
    title: "Generate Reports",
    description: "Generate reports enhanced reports to provide better insights to your clients, and save you time.",
    number: "03"
  }
];

const HowItWorks = () => {
  const handleScrollToPricing = () => {
    const pricingSection = document.getElementById('pricing');
    if (pricingSection) {
      pricingSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="how-it-works" className="w-full text-white py-16 md:py-24 lg:py-32">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col text-center mb-16 md:mb-24">
          <h2 className="text-4xl xs:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 md:mb-8">
            How It <span className="bg-gradient-to-r from-[#5B6AFF] to-[#A166AB] inline-block text-transparent bg-clip-text">Works</span>
          </h2>
          <p className="text-lg xs:text-xl lg:text-2xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
            Get started in minutes and see immediate improvements in your reporting workflow.
          </p>
        </div>

        {/* Steps */}
        <div className="relative max-w-5xl mx-auto">
          {/* Steps Container */}
          <div className="relative flex flex-col gap-16 md:gap-24">
            {steps.map((step, index) => (
              <div 
                key={index} 
                className="flex flex-col items-center text-center p-8 md:p-12 rounded-2xl bg-[#1A1A1A]/50 border border-white/5 hover:border-white/10 transition-all hover:transform hover:scale-[1.02]"
              >
                <div className="w-20 h-20 xs:w-24 xs:h-24 rounded-full bg-gradient-to-br from-[#5B6AFF] to-[#A166AB] flex items-center justify-center text-2xl xs:text-3xl font-medium mb-8 md:mb-10 shadow-lg">
                  {step.number}
                </div>
                <div>
                  <h3 className="text-3xl xs:text-4xl lg:text-5xl font-bold mb-4 md:mb-6">{step.title}</h3>
                  <p className="text-lg xs:text-xl text-gray-400 leading-relaxed max-w-2xl">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Button */}
        <div className="flex justify-center mt-16 md:mt-24">
          <button 
            onClick={handleScrollToPricing}
            className="btn btn-primary btn-lg text-white w-full xs:w-auto min-h-[4rem] text-lg xs:text-xl px-12 transform transition-transform hover:scale-105"
          >
            Try FitReport Now →
          </button>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks; 