/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      screens: {
        'xs': '375px',
      },
      fontFamily: {
        display: ['var(--font-space-grotesk)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-manrope)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'monospace'],
      },
      colors: {
        // Semantic background tokens (from CSS variables)
        'bg-primary': 'var(--color-bg-primary)',
        'bg-secondary': 'var(--color-bg-secondary)',
        'bg-tertiary': 'var(--color-bg-tertiary)',
        'bg-elevated': 'var(--color-bg-elevated)',

        // Primary blue accent
        'primary-start': 'var(--color-primary)',
        'primary-mid': 'var(--color-primary)',
        'primary-end': 'var(--color-primary)',

        // Legacy accent aliases (now mapped to blue/functional colors)
        'accent-purple': 'var(--color-primary)',
        'accent-violet': 'var(--color-primary-hover)',
        'accent-indigo': 'var(--color-info)',
        'accent-pink': 'var(--color-error)',

        // Sidebar colors
        'sidebar-bg': 'var(--color-sidebar-bg)',
        'sidebar-hover': 'var(--color-sidebar-hover)',
        'sidebar-active': 'var(--color-sidebar-active)',
      },
      animation: {
        opacity: "opacity 0.25s ease-in-out",
        appearFromRight: "appearFromRight 300ms ease-in-out",
        wiggle: "wiggle 1.5s ease-in-out infinite",
        popup: "popup 0.25s ease-in-out",
        shimmer: "shimmer 3s ease-out infinite alternate",
        float: "float 6s ease-in-out infinite",
      },
      keyframes: {
        opacity: {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
        appearFromRight: {
          "0%": { opacity: 0.3, transform: "translate(15%, 0px)" },
          "100%": { opacity: 1, transform: "translate(0)" },
        },
        wiggle: {
          "0%, 20%, 80%, 100%": { transform: "rotate(0deg)" },
          "30%, 60%": { transform: "rotate(-2deg)" },
          "40%, 70%": { transform: "rotate(2deg)" },
          "45%": { transform: "rotate(-4deg)" },
          "55%": { transform: "rotate(4deg)" },
        },
        popup: {
          "0%": { transform: "scale(0.8)", opacity: 0.8 },
          "50%": { transform: "scale(1.1)", opacity: 1 },
          "100%": { transform: "scale(1)", opacity: 1 },
        },
        shimmer: {
          "0%": { backgroundPosition: "0 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-20px)" },
        },
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        fitreport: {
          "primary": "#2563EB",
          "primary-content": "#FFFFFF",
          "secondary": "#4B5563",
          "secondary-content": "#FFFFFF",
          "accent": "#2563EB",
          "accent-content": "#FFFFFF",
          "neutral": "#1F2937",
          "neutral-content": "#F9FAFB",
          "base-100": "#FFFFFF",
          "base-200": "#F9FAFB",
          "base-300": "#F3F4F6",
          "base-content": "#111827",
          "info": "#2563EB",
          "info-content": "#FFFFFF",
          "success": "#16A34A",
          "success-content": "#FFFFFF",
          "warning": "#CA8A04",
          "warning-content": "#FFFFFF",
          "error": "#DC2626",
          "error-content": "#FFFFFF",
        },
      },
    ],
  },
};
