const CALENDLY_URL = "https://calendly.com/riley-fitreport/intro";
const WIDGET_CSS_URL = "https://assets.calendly.com/assets/external/widget.css";
const WIDGET_JS_URL = "https://assets.calendly.com/assets/external/widget.js";

declare global {
  interface Window {
    Calendly?: {
      initPopupWidget: (opts: { url: string }) => void;
    };
  }
}

let scriptLoaded = false;

function loadCalendlyAssets(): Promise<void> {
  if (scriptLoaded && window.Calendly) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${WIDGET_CSS_URL}"]`)) {
      const link = document.createElement("link");
      link.href = WIDGET_CSS_URL;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }

    if (!document.querySelector(`script[src="${WIDGET_JS_URL}"]`)) {
      const script = document.createElement("script");
      script.src = WIDGET_JS_URL;
      script.async = true;
      script.onload = () => {
        scriptLoaded = true;
        resolve();
      };
      script.onerror = () =>
        reject(new Error("Failed to load Calendly widget"));
      document.head.appendChild(script);
    } else {
      scriptLoaded = true;
      resolve();
    }
  });
}

export async function openCalendlyPopup(): Promise<void> {
  try {
    await loadCalendlyAssets();
    window.Calendly?.initPopupWidget({ url: CALENDLY_URL });
  } catch {
    window.open(CALENDLY_URL, "_blank", "noopener,noreferrer");
  }
}

export { CALENDLY_URL };
