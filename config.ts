import themes from "daisyui/src/theming/themes";
import { ConfigProps } from "./types/config";


const config: ConfigProps = {
  // REQUIRED
  appName: "FitReport",
  // REQUIRED: a short description of your app for SEO tags (can be overwritten)
  appDescription: "Transform your Trainerize data into powerful insights, helping you deliver better results with less administrative work.",
  // REQUIRED (no https://, not trialing slash at the end, just the naked domain)
  domainName: "fitreport.co",
  crisp: {
    // Crisp website ID. IF YOU DON'T USE CRISP: just remove this => Then add a support email in this config file (resend.supportEmail) otherwise customer support won't work.
    id: "",
    // Hide Crisp by default, except on route "/". Crisp is toggled with <ButtonSupport/>. If you want to show Crisp on every routes, just remove this below
    onlyShowOnRoutes: ["/"],
  },
  stripe: {
    // Create multiple plans in your Stripe dashboard, then add them here. You can add as many plans as you want, just make sure to add the priceId
    plans: [
      {
        priceId: "price_1RRK9HGWUnFGgcKew3t53lo9",
        name: "Monthly",
        description: "Flexible month-to-month billing",
        price: 100,
        billingPeriod: "monthly",
        features: [
          { name: "Full access to all features" },
          { name: "Unlimited reports" },
          { name: "Priority support" },
          { name: "Cancel anytime" },
        ],
      },
      {
        priceId: "price_1RRK9hGWUnFGgcKegTiJ76N4",
        isFeatured: true,
        name: "Annual",
        description: "Save 21% with annual billing",
        price: 79,
        priceAnchor: 100,
        billingPeriod: "yearly",
        features: [
          { name: "Everything in Monthly plan" },
          { name: "21% discount" },
          { name: "Lock in lower price" },
          { name: "Priority support" },
        ],
      },
    ],
  },
  aws: {
    // If you use AWS S3/Cloudfront, put values in here
    bucket: "bucket-name",
    bucketUrl: `https://bucket-name.s3.amazonaws.com/`,
    cdn: "https://cdn-id.cloudfront.net/",
  },
  resend: {
    // REQUIRED — Email 'From' field to be used when sending magic login links
    fromNoReply: `FitReport <noreply@fitreport.app>`,
    // REQUIRED — Email 'From' field to be used when sending other emails, like abandoned carts, updates etc..
    fromAdmin: `Riley at FitReport <riley@rileymanderson.com>`,
    // Email shown to customer if need support. Leave empty if not needed => if empty, set up Crisp above, otherwise you won't be able to offer customer support."
    supportEmail: "riley@rileymanderson.com",
  },
  colors: {
    // REQUIRED — The DaisyUI theme to use (added to the main layout.js). Leave blank for default (light & dark mode). If you any other theme than light/dark, you need to add it in config.tailwind.js in daisyui.themes.
    theme: "dark",
    // REQUIRED — This color will be reflected on the whole app outside of the document (loading bar, Chrome tabs, etc..). By default it takes the primary color from your DaisyUI theme (make sure to update your the theme name after "data-theme=")
    // OR you can just do this to use a custom color: main: "#f37055". HEX only.
    main: themes["dark"]["primary"],
  },
  auth: {
    // REQUIRED — the path to log in users. It's use to protect private routes (like /dashboard). It's used in apiClient (/libs/api.js) upon 401 errors from our API
    loginUrl: "/signin",
    // REQUIRED — the path you want to redirect users after successfull login (i.e. /dashboard, /private). This is normally a private page for users to manage their accounts. It's used in apiClient (/libs/api.js) upon 401 errors from our API & in ButtonSignin.js
    callbackUrl: "/dashboard",
  },
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://fitreport.co',
} as const;

export default config;
