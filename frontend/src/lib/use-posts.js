import { useEffect, useState } from "react";
import { API, getJson } from "@/lib/utils";

let cache = null;
let inflight = null;

export const loadPosts = () => {
  if (cache) {
    return Promise.resolve(cache);
  }
  inflight ??= getJson(`${API}/posts`).then((posts) => {
    cache = posts ?? [];
    inflight = null;
    return cache;
  });
  return inflight;
};

export function usePosts() {
  const [posts, setPosts] = useState(cache);
  useEffect(() => {
    let live = true;
    loadPosts().then((list) => live && setPosts(list));
    return () => {
      live = false;
    };
  }, []);
  return posts;
}

export function usePost(slug) {
  // The list cache already knows the title and date, so the header can paint before the body arrives.
  const meta = cache?.find((p) => p.slug === slug) ?? null;
  const [state, setState] = useState({ post: meta, missing: false });
  useEffect(() => {
    let live = true;
    setState({ post: cache?.find((p) => p.slug === slug) ?? null, missing: false });
    getJson(`${API}/posts/${slug}`).then((post) => {
      if (live) {
        setState({ post, missing: !post });
      }
    });
    return () => {
      live = false;
    };
  }, [slug]);
  return state;
}
