const steps = [
  {
    title: "Connect Your Account",
    description: "Link FitReport to your existing Trainerize account with our secure one-click integration. No technical skills required.",
    number: "01"
  },
  {
    title: "Customize Reports",
    description: "Select the metrics and data points most relevant to your training style and client goals from our template library.",
    number: "02"
  },
  {
    title: "Automate Delivery",
    description: "Schedule automated reports to be delivered to clients or review them yourself on any device, anywhere.",
    number: "03"
  }
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="w-full text-white">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col text-center mb-12 md:mb-16">
          <h2 className="text-4xl xs:text-5xl md:text-6xl font-bold tracking-tight mb-4 md:mb-6">
            How It <span className="bg-gradient-to-r from-[#5B6AFF] to-[#A166AB] inline-block text-transparent bg-clip-text">Works</span>
          </h2>
          <p className="text-base xs:text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Get started in minutes and see immediate improvements in your reporting workflow.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Vertical Line - Hidden on mobile, shown on lg screens */}
          <div className="hidden lg:block absolute left-1/2 transform -translate-x-1/2 h-full w-px bg-gray-800" />

          {/* Steps Container */}
          <div className="relative flex flex-col gap-12 md:gap-16 lg:gap-32">
            {steps.map((step, index) => (
              <div key={index} className="flex flex-col lg:flex-row items-start lg:items-center gap-8 lg:gap-16">
                {/* Step Content - Always on left for mobile, alternates on desktop */}
                <div className={`w-full lg:w-1/2 flex flex-col gap-4 ${
                  index % 2 === 0 ? 'lg:pr-16 lg:items-end lg:text-right' : 'lg:pl-16 lg:items-start lg:text-left order-1 lg:order-2'
                }`}>
                  <div className="flex items-center gap-4 xs:gap-6">
                    <div className="w-12 h-12 xs:w-16 xs:h-16 rounded-full bg-gradient-to-br from-[#5B6AFF] to-[#A166AB] flex items-center justify-center text-lg xs:text-2xl font-medium shrink-0">
                      {step.number}
                    </div>
                    <h3 className="text-2xl xs:text-3xl lg:text-4xl font-bold">{step.title}</h3>
                  </div>
                  <p className="text-base xs:text-lg text-gray-400 leading-relaxed max-w-xl">
                    {step.description}
                  </p>
                </div>

                {/* Step Visualization - Always on right for mobile, alternates on desktop */}
                <div className={`w-full lg:w-1/2 ${
                  index % 2 === 0 ? 'order-2 lg:order-1' : 'order-1 lg:order-1'
                }`}>
                  <div className="aspect-[16/10] w-full rounded-xl bg-[#1a2e2a] p-4 xs:p-6">
                    <div className="w-full h-full rounded-lg bg-[#162522] flex items-center justify-center text-gray-600">
                      Step {index + 1} Visualization
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Button */}
        <div className="flex justify-center mt-12 md:mt-16">
          <button className="btn btn-primary btn-lg text-white w-full xs:w-auto">
            Start Your Integration Now
          </button>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks; 