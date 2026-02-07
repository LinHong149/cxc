import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        detective: {
          dark: "#1a1a1a",
          board: "#2d2d2d",
          accent: "#ff6b6b",
          highlight: "#4ecdc4",
          text: "#e0e0e0",
          muted: "#888888",
        },
      },
      fontFamily: {
        mono: ["ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
