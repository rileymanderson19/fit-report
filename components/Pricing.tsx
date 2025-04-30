import config from "@/config";
import ButtonCheckout from "./ButtonCheckout";

// <Pricing/> displays the pricing plans for your app
// It's your Stripe config in config.js.stripe.plans[] that will be used to display the plans
// <ButtonCheckout /> renders a button that will redirect the user to Stripe checkout called the /api/stripe/create-checkout API endpoint with the correct priceId

const Pricing = () => {
  return (
    <section className="w-full overflow-hidden text-white" id="pricing">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="flex flex-col text-center w-full mb-20">
          <p className="font-medium text-primary mb-8">Pricing</p>
          <h2 className="font-bold text-3xl lg:text-5xl tracking-tight">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-xl opacity-80">
            Choose the plan that works best for you
          </p>
        </div>

        <div className="relative flex justify-center flex-col lg:flex-row items-center lg:items-stretch gap-8">
          {config.stripe.plans.map((plan) => (
            <div key={plan.priceId} className="relative w-full max-w-lg">
              {plan.isFeatured && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                  <span className="badge text-xs text-primary-content font-semibold border-0 bg-primary">
                    SAVE 21%
                  </span>
                </div>
              )}

              {plan.isFeatured && (
                <div className="absolute -inset-[1px] rounded-[9px] bg-primary z-10"></div>
              )}

              <div className="relative flex flex-col h-full gap-5 lg:gap-8 z-10 bg-black/40 backdrop-blur-xl p-8 rounded-lg border border-white/10">
                <div className="flex justify-between items-center gap-4">
                  <div>
                    <p className="text-lg lg:text-xl font-bold">{plan.name}</p>
                    {plan.description && (
                      <p className="text-base-content/80 mt-2">
                        {plan.description}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col gap-3">
                  <div className="flex gap-2 items-end">
                    <p className="text-5xl tracking-tight font-extrabold">
                      ${plan.price}
                    </p>
                    <div className="flex flex-col justify-end mb-2">
                      <p className="text-sm text-base-content/60 font-semibold">
                        /mo
                      </p>
                    </div>
                  </div>
                  
                  {plan.billingPeriod === "yearly" && (
                    <p className="text-sm text-base-content/80">
                      Billed annually (${plan.price * 12})
                    </p>
                  )}
                  
                  {plan.priceAnchor && (
                    <p className="text-sm text-base-content/60">
                      <span className="line-through">${plan.priceAnchor}/mo</span>
                    </p>
                  )}
                </div>

                {plan.features && (
                  <ul className="space-y-2.5 leading-relaxed text-base flex-1">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="w-[18px] h-[18px] opacity-80 shrink-0"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span>{feature.name}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="space-y-2">
                  <ButtonCheckout 
                    priceId={plan.priceId} 
                    className={`btn btn-block ${plan.isFeatured ? 'btn-primary' : 'btn-outline'}`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
