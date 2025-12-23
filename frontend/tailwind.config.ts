import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#059211',
          hover: '#047a0e',
          light: '#06b014',
        },
        accent: {
          yellow: '#FBBF24',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
