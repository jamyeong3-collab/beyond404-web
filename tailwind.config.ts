import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        violet: "#E95D6A",
        lgred: "#E95D6A",
        lgpink: "#F58A96",
        lgdark: "#C84B58",
        mint: "#20b486",
        cloud: "#f7f8fb",
      },
      boxShadow: {
        phone: "0 24px 60px rgba(17, 24, 39, 0.18)",
      },
      keyframes: {
        scanPulse: {
          "0%": { transform: "scale(1)", opacity: "0.45" },
          "100%": { transform: "scale(2.4)", opacity: "0" },
        },
        fadeSlideIn: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        scanPulse: "scanPulse 2s ease-out infinite",
        fadeSlideIn: "fadeSlideIn 0.4s ease-out forwards",
      },
    },
  },
  plugins: [],
};

export default config;
