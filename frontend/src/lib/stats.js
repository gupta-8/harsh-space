export const GUESTBOOK_LIMITS = {
  name: 24,
  message: 140,
  shown: 3,
};

// A short one-way handle (djb2) so a page can spot its own visit in `recent`.
export const visitorTag = (visitor) => {
  let hash = 5381;
  for (const char of visitor) {
    hash = (hash * 33 + char.charCodeAt(0)) % 4_294_967_296;
  }
  return hash.toString(36);
};

export const compact = (n) =>
  n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(n);
