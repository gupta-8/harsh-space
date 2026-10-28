import { useEffect, useState } from "react";
import { API, getJson, whenIdle } from "@/lib/utils";

const VISITOR_KEY = "visitor";
let visitorId = null;

export const visitor = () => {
  if (visitorId) {
    return visitorId;
  }
  try {
    visitorId = localStorage.getItem(VISITOR_KEY);
  } catch {
    visitorId = null;
  }
  if (!visitorId) {
    visitorId = Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) =>
      b.toString(16).padStart(2, "0")
    ).join("");
    try {
      localStorage.setItem(VISITOR_KEY, visitorId);
    } catch {
      // private mode; id lives for this load only
    }
  }
  return visitorId;
};

export const beacon = (payload) => {
  const body = JSON.stringify({ ...payload, visitor: visitor() });
  if ("sendBeacon" in navigator) {
    navigator.sendBeacon(`${API}/beacon`, body);
    return;
  }
  fetch(`${API}/beacon`, { method: "POST", body, keepalive: true }).catch(() => undefined);
};

export function useBeacon(path) {
  useEffect(() => {
    const start = Date.now();
    let depth = 0;
    let sent = false;

    const measure = () => {
      const { scrollHeight } = document.documentElement;
      const seen =
        scrollHeight <= innerHeight ? 100 : Math.round(((scrollY + innerHeight) / scrollHeight) * 100);
      depth = Math.max(depth, Math.min(100, seen));
    };

    const leave = () => {
      if (sent) {
        return;
      }
      sent = true;
      measure();
      beacon({ type: "leave", path, depth, seconds: Math.round((Date.now() - start) / 1000) });
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        leave();
      }
    };

    beacon({ type: "view", path });
    // Stats land a beat after the view so this visit is already counted.
    const refresh = setTimeout(load, 900);
    measure();
    addEventListener("scroll", measure, { passive: true });
    addEventListener("pagehide", leave);
    addEventListener("visibilitychange", onVisibility);
    return () => {
      leave();
      clearTimeout(refresh);
      removeEventListener("scroll", measure);
      removeEventListener("pagehide", leave);
      removeEventListener("visibilitychange", onVisibility);
    };
  }, [path]);
}

const REFRESH_MS = 60_000;

let cache = null;
let timer;
const listeners = new Set();

const publish = (stats) => {
  cache = stats;
  for (const listener of listeners) {
    listener(stats);
  }
};

const load = () => getJson(`${API}/stats`).then((stats) => stats && publish(stats));

const start = () => {
  if (timer) {
    return;
  }
  void load();
  timer = setInterval(() => {
    if (document.visibilityState === "visible") {
      void load();
    }
  }, REFRESH_MS);
};

export const patchStats = (patch) => {
  if (cache) {
    publish(patch(cache));
  }
};

export function useSiteStats() {
  const [stats, setStats] = useState(cache);

  useEffect(() => {
    listeners.add(setStats);
    if (cache) {
      setStats(cache);
    }
    const cancel = whenIdle(start);

    return () => {
      listeners.delete(setStats);
      cancel();
      if (listeners.size === 0) {
        clearInterval(timer);
        timer = undefined;
      }
    };
  }, []);

  return stats;
}
