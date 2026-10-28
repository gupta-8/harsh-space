import { useEffect, useState } from "react";
import { API, getJson } from "@/lib/utils";

let cache;

export function useNowPlaying() {
  const [track, setTrack] = useState(cache ?? null);
  useEffect(() => {
    if (cache !== undefined) {
      return;
    }
    let live = true;
    getJson(`${API}/now-playing`).then((data) => {
      cache = data
        ? { ...data, thumb: data.thumb ? `${API}/now-playing/${data.thumb}` : null }
        : null;
      if (live) {
        setTrack(cache);
      }
    });
    return () => {
      live = false;
    };
  }, []);
  return { track, previewUrl: track?.previewUrl ?? null };
}
