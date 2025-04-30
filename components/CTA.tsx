import config from "@/config";

const CTA = () => {
  return (
    <section className="w-full text-white">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="flex flex-col items-center max-w-2xl mx-auto text-center">
          <h2 className="font-bold text-4xl md:text-6xl tracking-tight mb-8 md:mb-12 bg-gradient-to-r from-[#7C5CFF] via-[#D4308A] to-[#24D1AC] bg-clip-text text-transparent">
            Ready to transform your training business?
          </h2>
          <p className="text-gray-300 text-xl mb-12 md:mb-16">
            Join thousands of trainers who have cut their admin time in half and improved client retention with better reporting.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <button className="btn bg-[#7C5CFF] hover:bg-[#6B4EDB] border-none text-white btn-wide text-lg">
              Start Free Trial
            </button>
            <button className="btn bg-[#D4308A] hover:bg-[#B32875] border-none text-white btn-wide text-lg">
              Schedule Demo
            </button>
          </div>
          
          <div className="mt-8 space-y-3 text-base text-gray-500">
            <p>✓ Save 4+ hours per week on client reporting</p>
            <p>✓ No credit card required</p>
            <p>✓ 14-day free trial</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;
