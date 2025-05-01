import config from "@/config";

const CTA = () => {
  return (
    <section className="w-full text-white">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="flex flex-col items-center max-w-[1000px] mx-auto text-center bg-[#1a1a1a] rounded-2xl p-12">
          <h2 className="font-bold text-4xl md:text-6xl tracking-tight mb-6">
            <span className="bg-gradient-to-r from-emerald-400 to-[#86b6c6] inline-block text-transparent bg-clip-text">Transform</span> how you track client progress
          </h2>
          <p className="text-gray-400 text-xl mb-12 max-w-3xl">
            Join thousands of fitness professionals who are saving time, improving client retention, and growing their businesses with FitReport.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <button className="btn bg-emerald-500 hover:bg-emerald-600 border-none text-white px-8 text-lg gap-2">
              Start Your Free Trial
              <span className="text-xl">→</span>
            </button>
            <button className="btn bg-[#1a1a1a] hover:bg-[#252525] text-white border-[#333] px-8 text-lg">
              Schedule a Demo
            </button>
          </div>
          
          <p className="text-gray-500 text-base">
            No credit card required. Cancel anytime.
          </p>
        </div>
      </div>
    </section>
  );
};

export default CTA;
