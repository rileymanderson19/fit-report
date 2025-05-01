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
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="flex flex-col text-center w-full mb-16">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight">
            How It <span className="text-emerald-400">Works</span>
          </h2>
          <p className="mt-6 text-xl text-gray-400">
            Get started in minutes and see immediate improvements in your reporting workflow.
          </p>
        </div>

        <div className="relative">
          {/* Vertical Line */}
          <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-px bg-gray-800" />

          <div className="relative space-y-32">
            {steps.map((step, index) => (
              <div key={index} className="flex items-stretch">
                {/* Left Side */}
                <div className="w-1/2 pr-16 flex flex-col items-end justify-center">
                  {index % 2 === 0 ? (
                    <>
                      <div className="flex items-center gap-6 mb-6">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-xl font-medium">
                          {step.number}
                        </div>
                        <h3 className="text-3xl font-bold">{step.title}</h3>
                      </div>
                      <p className="text-gray-400 text-right max-w-xl text-xl leading-relaxed">{step.description}</p>
                    </>
                  ) : (
                    <div className="aspect-[4/3] w-full max-w-lg rounded-xl bg-[#1a2e2a] p-6">
                      <div className="w-full h-full rounded-lg bg-[#162522] flex items-center justify-center text-gray-600">
                        Step {index + 1} Visualization
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Side */}
                <div className="w-1/2 pl-16 flex flex-col items-start justify-center">
                  {index % 2 === 0 ? (
                    <div className="aspect-[4/3] w-full max-w-lg rounded-xl bg-[#1a2e2a] p-6">
                      <div className="w-full h-full rounded-lg bg-[#162522] flex items-center justify-center text-gray-600">
                        Step {index + 1} Visualization
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-6 mb-6">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-xl font-medium">
                          {step.number}
                        </div>
                        <h3 className="text-3xl font-bold">{step.title}</h3>
                      </div>
                      <p className="text-gray-400 text-left max-w-xl text-xl leading-relaxed">{step.description}</p>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-center mt-16">
          <button className="btn bg-emerald-500 hover:bg-emerald-600 border-none text-white px-8 text-lg">
            Start Your Integration Now
          </button>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks; 