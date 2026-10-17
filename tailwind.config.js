/** @type {import('tailwindcss').Config} */

// Bridge Material 3 CSS variables into Tailwind utilities,
// e.g. bg-primary, text-on-surface, border-outline-variant, rounded-m3-lg
const colors = {
  transparent: "transparent",
  current: "currentColor",
  "on-primary": "var(--md-sys-color-on-primary)",
  primary: "var(--md-sys-color-primary)",
  "primary-container": "var(--md-sys-color-primary-container)",
  "on-primary-container": "var(--md-sys-color-on-primary-container)",
  "on-secondary": "var(--md-sys-color-on-secondary)",
  secondary: "var(--md-sys-color-secondary)",
  "secondary-container": "var(--md-sys-color-secondary-container)",
  "on-secondary-container": "var(--md-sys-color-on-secondary-container)",
  "on-tertiary": "var(--md-sys-color-on-tertiary)",
  tertiary: "var(--md-sys-color-tertiary)",
  "tertiary-container": "var(--md-sys-color-tertiary-container)",
  "on-tertiary-container": "var(--md-sys-color-on-tertiary-container)",
  error: "var(--md-sys-color-error)",
  "on-error": "var(--md-sys-color-on-error)",
  "error-container": "var(--md-sys-color-error-container)",
  "on-error-container": "var(--md-sys-color-on-error-container)",
  surface: "var(--md-sys-color-surface)",
  "on-surface": "var(--md-sys-color-on-surface)",
  "surface-container-lowest": "var(--md-sys-color-surface-container-lowest)",
  "surface-container-low": "var(--md-sys-color-surface-container-low)",
  "surface-container": "var(--md-sys-color-surface-container)",
  "surface-container-high": "var(--md-sys-color-surface-container-high)",
  "surface-container-highest": "var(--md-sys-color-surface-container-highest)",
  "surface-dim": "var(--md-sys-color-surface-dim)",
  "surface-bright": "var(--md-sys-color-surface-bright)",
  "on-surface-variant": "var(--md-sys-color-on-surface-variant)",
  outline: "var(--md-sys-color-outline)",
  "outline-variant": "var(--md-sys-color-outline-variant)",
  "inverse-surface": "var(--md-sys-color-inverse-surface)",
  "inverse-on-surface": "var(--md-sys-color-inverse-on-surface)",
  "inverse-primary": "var(--md-sys-color-inverse-primary)",
  scrim: "var(--md-sys-color-scrim)",
};

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors,
      borderRadius: {
        "m3-xs": "4px",
        "m3-sm": "8px",
        "m3-md": "12px",
        "m3-lg": "16px",
        "m3-xl": "28px",
        "m3-full": "9999px",
      },
      boxShadow: {
        "m3-1": "0 1px 2px rgb(0 0 0 / 0.3), 0 1px 3px 1px rgb(0 0 0 / 0.15)",
        "m3-2": "0 1px 2px rgb(0 0 0 / 0.3), 0 2px 6px 2px rgb(0 0 0 / 0.15)",
        "m3-3": "0 4px 8px 3px rgb(0 0 0 / 0.15), 0 1px 3px rgb(0 0 0 / 0.3)",
      },
    },
  },
  plugins: [],
};
