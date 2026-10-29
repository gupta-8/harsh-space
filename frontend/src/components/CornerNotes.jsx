import { useEffect, useRef, useState } from "react";
import { isMuted, onMuteChange, setMuted, sfx } from "@/lib/sfx";
import { reducedMotion } from "@/lib/utils";

const REVEAL_MS = 550;
const RIPPLE_MS = 900;
const THEME_KEY = "theme";
const THEME_COLORS = { light: "#faf8f2", dark: "#131315" };

// iOS Safari re-samples its edge tint when a fixed element appears.
function nudgeBarSampling() {
  const probe = document.createElement("div");
  probe.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;visibility:hidden;pointer-events:none";
  document.body.appendChild(probe);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => probe.remove());
  });
}

export default function CornerNotes() {
  const [theme, setTheme] = useState(() => (document.documentElement.dataset.theme === "dark" ? "dark" : "light"));
  const [muted, setMutedState] = useState(isMuted);
  const [flipped, setFlipped] = useState(false);
  const [ripple, setRipple] = useState(null);
  const rippleTimer = useRef(undefined);

  useEffect(() => onMuteChange(setMutedState), []);
  useEffect(() => () => clearTimeout(rippleTimer.current), []);

  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[theme]);
  }, [theme]);

  const toggle = (event) => {
    const next = theme === "dark" ? "light" : "dark";
    const apply = () => {
      if (next === "dark") {
        document.documentElement.dataset.theme = "dark";
      } else {
        delete document.documentElement.dataset.theme;
      }
      try {
        if (next === "dark") {
          localStorage.setItem(THEME_KEY, "dark");
        } else {
          localStorage.removeItem(THEME_KEY);
        }
      } catch {
        // storage blocked (private mode); the theme lasts for this load
      }
      setTheme(next);
      setFlipped(true);
      nudgeBarSampling();
      sfx(next === "dark" ? "lightsOff" : "lightsOn");
    };

    if (!document.startViewTransition || reducedMotion()) {
      apply();
      return;
    }

    const { clientX: x, clientY: y } = event;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    document.documentElement.dataset.vt = "theme";
    const transition = document.startViewTransition(apply);
    transition.ready
      .then(() => {
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: REVEAL_MS, easing: "cubic-bezier(0.23, 1, 0.32, 1)", pseudoElement: "::view-transition-new(root)" }
        );
      })
      .catch(() => undefined);
    void transition.finished.finally(() => {
      delete document.documentElement.dataset.vt;
    });
  };

  const toggleSound = (event) => {
    const next = !isMuted();
    setMuted(next);
    if (next) {
      document.documentElement.dataset.sound = "off";
    } else {
      delete document.documentElement.dataset.sound;
    }
    setFlipped(true);
    if (!next) {
      sfx("pop");
    }
    if (reducedMotion()) {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    setRipple({ id: Date.now(), on: !next, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    clearTimeout(rippleTimer.current);
    rippleTimer.current = setTimeout(() => setRipple(null), RIPPLE_MS);
  };

  const swap = flipped ? "swap-in" : undefined;

  return (
    <>
      {ripple ? (
        <span
          aria-hidden="true"
          className="sound-ripple"
          data-off={ripple.on ? undefined : ""}
          key={ripple.id}
          style={{ left: ripple.x, top: ripple.y }}
        >
          <span />
          <span />
          <span />
        </span>
      ) : null}
      <span className="corner-notes" data-testid="corner-notes">
        <span aria-hidden="true" className="paren">
          (
        </span>{" "}
        <button className="corner-button" onClick={toggle} type="button" data-testid="lights-toggle">
          <span className={swap} key={theme}>
            <span data-when="light">lights off</span>
            <span data-when="dark">lights on</span>
          </span>
        </button>
        <span aria-hidden="true" className="text-faint">
          {" · "}
        </span>
        <button className="corner-button" onClick={toggleSound} type="button" data-testid="sound-toggle">
          <span className={swap} key={String(muted)}>
            <span data-when="sound">sound on</span>
            <span data-when="muted">sound off</span>
          </span>
        </button>{" "}
        <span aria-hidden="true" className="paren">
          )
        </span>
      </span>
    </>
  );
}
