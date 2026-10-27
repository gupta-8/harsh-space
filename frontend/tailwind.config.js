/** @type {import('tailwindcss').Config} */
module.exports = {
  blocklist: ["overline"],
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"Geist Mono Variable"', '"Geist Mono Fallback"', '"Courier New"', "monospace"],
        "serif-display": [
          '"Instrument Serif"',
          '"Instrument Serif Fallback"',
          '"Instrument Serif Fallback Times"',
          '"Instrument Serif Fallback Noto"',
          "Georgia",
          "serif",
        ],
        "serif-body": [
          '"Newsreader Variable"',
          '"Newsreader Fallback"',
          '"Newsreader Fallback Times"',
          '"Newsreader Fallback Noto"',
          "Georgia",
          "serif",
        ],
      },
      colors: {
        paper: "var(--background)",
        card: "var(--card)",
        ink: "var(--ink)",
        rose: "var(--rose)",
        muted: "var(--muted)",
        faint: "var(--faint)",
      },
      transitionTimingFunction: {
        strong: "cubic-bezier(0.23, 1, 0.32, 1)",
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
    },
  },
  plugins: [],
};
