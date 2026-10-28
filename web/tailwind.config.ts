/** @type {import('tailwindcss').Config} */
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#faf9f5",
        card: "#efe9de",
        soft: "#f5f0e8",
        ink: "#141413",
        body: "#3d3d3a",
        muted: "#6c6a64",
        hairline: "#e6dfd8",
        primary: "#cc785c",
        primaryActive: "#a9583e",
        dark: "#181715",
        darkElev: "#252320",
      },
      fontFamily: {
        serif: ["Georgia", "Times New Roman", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
