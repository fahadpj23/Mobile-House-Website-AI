import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        primary: "#2563eb",
        dark: "#0f172a",
      },
    },
  },
  plugins: [],
};
export default config;
