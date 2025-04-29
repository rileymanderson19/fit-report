import Image from "next/image";
import config from "@/config";

const CTA = () => {
  return (
    <section className="relative hero overflow-hidden min-h-screen">
      <Image
        src="/images/trainer-client.jpg"
        alt="Personal trainer providing detailed feedback to a client"
        className="object-cover w-full"
        fill
      />
      <div className="relative hero-overlay bg-neutral bg-opacity-70"></div>
      <div className="relative hero-content text-center text-neutral-content p-8">
        <div className="flex flex-col items-center max-w-xl p-8 md:p-0">
          <h2 className="font-bold text-3xl md:text-5xl tracking-tight mb-8 md:mb-12">
            Ready to transform your training business?
          </h2>
          <p className="text-lg opacity-80 mb-12 md:mb-16">
            Join thousands of trainers who have cut their admin time in half and improved client retention with better reporting.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <button className="btn btn-primary btn-wide">
              Start Free Trial
            </button>
            <button className="btn btn-outline btn-wide text-white border-white hover:bg-white hover:text-neutral">
              Schedule Demo
            </button>
          </div>
          
          <div className="mt-8 space-y-3 text-sm opacity-70">
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
