import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

const FONTS = [
  '400 1em "Instrument Serif"',
  'italic 400 1em "Instrument Serif"',
  '400 1em "Newsreader Variable"',
  'italic 400 1em "Newsreader Variable"',
  '600 1em "Geist Mono Variable"',
];

const render = () => {
  ReactDOM.createRoot(document.getElementById("root")).render(<App />);
};

// Paint once the (preloaded) fonts are in, so no fallback face flashes; never wait longer than a beat.
const ready = document.fonts
  ? Promise.all(FONTS.map((font) => document.fonts.load(font).catch(() => undefined)))
  : Promise.resolve();
Promise.race([ready, new Promise((resolve) => setTimeout(resolve, 700))]).then(render);
