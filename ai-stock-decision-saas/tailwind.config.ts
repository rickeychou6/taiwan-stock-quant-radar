import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#07111f",
          900: "#0f172a",
          800: "#172033"
        },
        bull: "#16a34a",
        bear: "#dc2626",
        signal: "#2563eb"
      },
      boxShadow: {
        glow: "0 24px 80px rgba(37, 99, 235, 0.18)"
      }
    }
  },
  plugins: []
};

export default config;
