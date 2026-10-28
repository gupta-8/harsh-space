export const API = `${process.env.REACT_APP_BACKEND_URL ?? ""}/api`;

export const isTouch = () => matchMedia("(hover: none)").matches;

export const reducedMotion = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches;

// Safari has no requestIdleCallback.
export const whenIdle = (fn) => {
  if ("requestIdleCallback" in window) {
    const idle = requestIdleCallback(fn);
    return () => cancelIdleCallback(idle);
  }
  const timeout = setTimeout(fn, 1200);
  return () => clearTimeout(timeout);
};

export const getJson = (url) =>
  fetch(url)
    .then((response) => (response.ok ? response.json() : null))
    .catch(() => null);
