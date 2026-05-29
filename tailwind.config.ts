import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      colors: {
        primary: {
          DEFAULT: "#004ac6",
          50: "#e6effc",
          100: "#c2d9f5",
          200: "#8ab4e8",
          300: "#74ace7",
          400: "#4d96e0",
          500: "#004ac6",
          600: "#0042a3",
          700: "#00337d",
          800: "#002557",
          900: "#001631",
        },
      },
    },
  },
  plugins: [],
};
export default config;