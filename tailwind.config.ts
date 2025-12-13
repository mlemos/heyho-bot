import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Semantic colors using CSS variables
        background: "var(--background)",
        "background-secondary": "var(--background-secondary)",
        foreground: "var(--foreground)",
        "foreground-secondary": "var(--foreground-secondary)",
        "foreground-muted": "var(--foreground-muted)",
        card: "var(--card)",
        "card-hover": "var(--card-hover)",
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        primary: "var(--primary)",
        "primary-foreground": "var(--primary-foreground)",
        // Status colors
        success: "var(--success)",
        "success-light": "var(--success-light)",
        warning: "var(--warning)",
        "warning-light": "var(--warning-light)",
        error: "var(--error)",
        "error-light": "var(--error-light)",
        info: "var(--info)",
        "info-light": "var(--info-light)",
        // Score colors
        "score-high": "var(--score-high)",
        "score-high-bg": "var(--score-high-bg)",
        "score-medium": "var(--score-medium)",
        "score-medium-bg": "var(--score-medium-bg)",
        "score-low": "var(--score-low)",
        "score-low-bg": "var(--score-low-bg)",
        "score-blue": "var(--score-blue)",
        "score-blue-bg": "var(--score-blue-bg)",
        "score-purple": "var(--score-purple)",
        "score-purple-bg": "var(--score-purple-bg)",
      },
      borderColor: {
        DEFAULT: "var(--border)",
      },
    },
  },
  plugins: [],
};

export default config;
